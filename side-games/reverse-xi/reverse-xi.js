import {initializeApp,getApps,getApp} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {getAuth,onAuthStateChanged,signInAnonymously} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {getDatabase,ref,set,get,update,onValue,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js';

const firebaseConfig={apiKey:'AIzaSyBLpXHGGTHXykKrnu8_Hv1i71oc3tpTNvY',authDomain:'neonxi.firebaseapp.com',databaseURL:'https://neonxi-default-rtdb.europe-west1.firebasedatabase.app',projectId:'neonxi',storageBucket:'neonxi.firebasestorage.app',messagingSenderId:'667191549799',appId:'1:667191549799:web:1e40feacbee09ed7f3d9c2'};
const app=getApps().length?getApp():initializeApp(firebaseConfig),auth=getAuth(app),db=getDatabase(app);
const $=id=>document.getElementById(id),state={uid:'',room:'',roomData:null,off:null,mode:'duel',solo:false,stream:null,recorder:null,chunks:[],speech:null,recordingMode:'',transcript:'',blobUrl:'',turnBusy:false,originalBlob:null,secretAnswer:'',pcmStop:null,audioContext:null};
const toast=msg=>{const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),3000)};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const roomRef=()=>ref(db,'reverseXI/rooms/'+state.room);
const uid=()=>state.uid||(state.local?'local':'');
// Single-phone mode keeps the room in memory and re-renders after every write, so the same
// panels, recording and answer check run without Firebase.
function applyPatch(target,patch){for(const [key,value] of Object.entries(patch)){const parts=key.split('/');let node=target;for(let i=0;i<parts.length-1;i++){node[parts[i]]=node[parts[i]]&&typeof node[parts[i]]==='object'?node[parts[i]]:{};node=node[parts[i]]}const last=parts[parts.length-1];if(value===null)delete node[last];else node[last]=value}}
// A promise that never settles (slow network, Safari audio decode) used to leave buttons on "İŞLENİYOR…" forever.
function withTimeout(promise,ms,message){let t;return Promise.race([promise,new Promise((_,reject)=>{t=setTimeout(()=>reject(new Error(message)),ms)})]).finally(()=>clearTimeout(t))}
function roomWrite(patch){
 if(!state.local)return withTimeout(update(roomRef(),patch),20000,'Bağlantı çok yavaş, gönderilemedi. Tekrar dene.');
 applyPatch(state.localRoom,patch);
 const snapshot=JSON.parse(JSON.stringify(state.localRoom));
 return new Promise(resolve=>setTimeout(()=>{renderRoom(snapshot);validateIncomingGuess(snapshot);resolve()},0));
}
const normalize=s=>String(s||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/æ/g,'ae').replace(/œ/g,'oe').replace(/ß/g,'ss').replace(/ø/g,'o').replace(/ł/g,'l').replace(/đ/g,'d').replace(/þ/g,'th').replace(/ð/g,'d').replace(/[^a-z0-9]/g,'');
function distance(a,b){const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let prev=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old}}return row[b.length]}
function answerMatches(guess,answer){const g=normalize(guess),a=normalize(answer);if(!g||!a)return false;if(g===a)return true;if(g.length>=4&&a.includes(g))return true;const aliases=(answer+'|'+answer.replace(/khvicha/i,'khvicha')+'|'+answer.replace(/kvaratskhelia/i,'kvaratskhelia')).split('|').map(normalize);if(aliases.includes(g))return true;if(Math.min(g.length,a.length)>=5&&Math.abs(g.length-a.length)<=Math.max(2,Math.floor(a.length*.2))&&distance(g,a)<=Math.max(2,Math.floor(a.length*.2)))return true;return false}
async function ensureAuth(){if(auth.currentUser){state.uid=auth.currentUser.uid;return}await new Promise((resolve,reject)=>{const off=onAuthStateChanged(auth,async user=>{off();try{if(user){state.uid=user.uid;resolve()}else{const result=await signInAnonymously(auth);state.uid=result.user.uid;resolve()}}catch(e){reject(e)}} ,reject)})}
function makeCode(){return Array.from({length:6},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*32)]).join('')}
function renderRoom(data){state.roomData=data;const speakerSide=data.currentSpeaker||'A';if(mySide()===speakerSide)state.secretAnswer=state.secretAnswer||localStorage.getItem('nxReverseXI:'+state.room+':'+uid())||'';$('name-a').textContent=data.players?.A?.name||'Bekleniyor…';$('name-b').textContent=data.players?.B?.name||'Bekleniyor…';$('player-a').classList.toggle('active',data.currentSpeaker==='A');$('player-b').classList.toggle('active',data.currentSpeaker==='B');$('step-no').textContent='TUR '+(data.turn||1);$('chat-lines').innerHTML=Object.values(data.guesses||{}).map(x=>'<div class="chat-item"><b>'+esc(x.byName)+':</b> '+esc(x.guess)+' · '+(x.correct?'DOĞRU':'YANLIŞ')+'</div>').join('')||'<span class="hint">Henüz tahmin yok.</span>';updateStage()}
function mySide(){const d=state.roomData;if(state.local&&d){const speaker=d.currentSpeaker||'A',imitator=speaker==='A'?'B':'A',phase=d.phase||'speak';return phase==='imitate'||phase==='guess'?imitator:speaker}if(d?.players?.A?.uid===uid())return'A';if(d?.players?.B?.uid===uid())return'B';return''}
function updateStage(){const d=state.roomData;if(!d)return;['speaker-panel','listen-panel','guess-panel','result-panel','waiting-panel'].forEach(id=>$(id).hidden=true);if(!d.players?.B){$('step-title').textContent='Arkadaşını bekliyoruz';$('step-desc').textContent='Rakibin bağlanıyor. Katıldığında ilk tur başlayacak.';$('waiting-panel').hidden=false;return}const side=mySide(),speaker=d.currentSpeaker||'A',imitator=speaker==='A'?'B':'A',phase=d.phase||'speak';let title='',desc='';if(phase==='speak'){title=speaker+' oyuncusu futbolcu ismini söylüyor';desc='İsmi normal şekilde söyle ve sistemin doğru anladığını onayla.';if(side===speaker)$('speaker-panel').hidden=false;else $('waiting-panel').hidden=false}else if(phase==='imitate'){title=imitator+' oyuncusu ters sesi taklit ediyor';desc='Ters sesi dinle ve duyduğun şekilde kaydet.';if(side===imitator){$('listen-panel').hidden=false;setAudio('reverse-audio',d.reverseOriginal)}else $('waiting-panel').hidden=false}else if(phase==='guess'){title=imitator+' oyuncusu tahmin ediyor';desc='Kendi sesinin tekrar ters çevrilmiş hâlini dinleyip futbolcuyu bul.';if(side===imitator){$('guess-panel').hidden=false;setAudio('final-audio',d.reverseImitation)}else $('waiting-panel').hidden=false}else if(phase==='checking'){title='Cevap kontrol ediliyor';desc='A oyuncusu cevabı doğruluyor.';$('waiting-panel').hidden=false}else if(phase==='result'){title='Tur tamamlandı';desc='Sıradaki tur için devam et.';$('result-panel').hidden=false;$('result-title').textContent=d.lastResult?.correct?'DOĞRU TAHMİN!':'TUR TAMAMLANDI';$('result-copy').textContent='Doğru cevap: '+(d.lastResult?.answer||'')+' · Tahmin: '+(d.lastResult?.guess||'');$('next-turn').hidden=side!==d.currentSpeaker}}
function setAudio(id,data){const el=$(id);if(!data)return;if(el.dataset.src===data)return;el.dataset.src=data;el.src=data}
async function createRoom(roomCode='',playerName=''){
 try{
  await ensureAuth();
  let code=String(roomCode||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(!code){code=makeCode();while((await get(ref(db,'reverseXI/rooms/'+code))).exists())code=makeCode()}
  state.room=code;
  const name=String(playerName||'Oyuncu '+Math.floor(100+Math.random()*900)).trim().slice(0,24);
  await set(roomRef(),{createdAt:serverTimestamp(),hostUid:uid(),game_type:'reverse-xi',room_code:code,status:'waiting',players:{A:{uid:uid(),name}},currentSpeaker:'A',turn:1,phase:'speak',guesses:{}});
  openRoom();
 }catch(e){toast('Oda oluşturulamadı: '+e.message)}
}
async function joinRoom(code,playerName=''){
 code=String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 if(code.length!==6){toast('Eşleşme bağlantısı geçersiz. Menüden tekrar dene.');return}
 try{
  await ensureAuth();
  const r=ref(db,'reverseXI/rooms/'+code),snap=await get(r);
  if(!snap.exists()){toast('Bu oda bulunamadı.');return}
  const d=snap.val();
  if(d.players?.A?.uid===uid()||d.players?.B?.uid===uid()){state.room=code;openRoom();return}
  if(d.players?.B){toast('Bu oda dolu.');return}
  const name=String(playerName||'Oyuncu '+Math.floor(100+Math.random()*900)).trim().slice(0,24);
  state.room=code;
  await update(r,{game_type:'reverse-xi',room_code:code,status:'playing',players:{...d.players,B:{uid:uid(),name}}});
  openRoom();
 }catch(e){toast('Odaya katılınamadı: '+e.message)}
}
async function validateIncomingGuess(data){
 if(data.phase!=='checking'||mySide()!==(data.currentSpeaker||'A')||!data.pendingGuess||state.validatingGuess===data.pendingGuess.id)return;
 state.validatingGuess=data.pendingGuess.id;
 const secret=state.secretAnswer||localStorage.getItem('nxReverseXI:'+state.room+':'+uid())||'';
 if(!secret){state.validatingGuess='';toast('Soru sahibinin cevap anahtarı bulunamadı.');return}
 const guess=data.pendingGuess.guess;
 const result={guess,correct:answerMatches(guess,secret),answer:secret,byName:data.pendingGuess.byName||'Oyuncu',createdAt:data.pendingGuess.createdAt||Date.now()};
 try{await roomWrite({['guesses/'+data.pendingGuess.id]:result,lastResult:result,phase:'result'})}
 catch(e){state.validatingGuess='';toast('Cevap kontrol edilemedi: '+e.message)}
}
function openRoom(){$('intro').hidden=true;$('game').hidden=false;if(state.off)state.off();state.off=onValue(roomRef(),s=>{if(!s.exists()){toast('Oda kapatıldı.');return}const data=s.val();renderRoom(data);validateIncomingGuess(data)})}
// The microphone is opened for each recording and released right after. Keeping one stream for the
// whole match let iOS/Android mute the track after a few turns (speech recognition or another app takes
// the mic): recordings then came out silent. An open mic also keeps iOS in call-audio mode, which makes
// the opponent's audio very quiet or silent on playback.
function releaseStream(){const s=state.stream;state.stream=null;try{s?.getTracks().forEach(t=>t.stop())}catch{}}
async function getStream(){releaseStream();state.stream=await withTimeout(navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}}),10000,'Mikrofon açılamadı. İzinleri kontrol edip tekrar dene.');return state.stream}
function recognize(){return new Promise(async(resolve,reject)=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){reject(new Error('speech'));return}const rec=new SR();rec.lang='tr-TR';rec.interimResults=false;rec.maxAlternatives=4;rec.onresult=e=>resolve([...e.results[0]].map(x=>x.transcript).sort((a,b)=>b.length-a.length)[0]);rec.onerror=()=>reject(new Error('recognition'));rec.start();state.speech=rec})}
function recordingMimeType(){
 const ua=navigator.userAgent||'';
 const isIOS=/iPhone|iPad|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const candidates=isIOS?['audio/mp4','audio/mp4;codecs=mp4a.40.2','audio/webm;codecs=opus','audio/webm']:['audio/webm;codecs=opus','audio/mp4','audio/webm'];
 return candidates.find(type=>typeof MediaRecorder.isTypeSupported==='function'&&MediaRecorder.isTypeSupported(type))||'';
}
function finishManualRecording(blob,mode,button){
 clearTimeout(state.stopWatchdog);state.recordingMode='';state.recorder=null;state.pcmStop=null;button.classList.remove('recording');button.textContent='🎙 KAYDI BAŞLAT';
 releaseStream();if(state.audioContext&&state.audioContext.state==='running')state.audioContext.suspend().catch(()=>{});
 if(state.discardRecording){state.discardRecording=false;return}
 if(mode==='name'){
  state.originalBlob=blob;const transcript=state.transcript.trim();$('heard-name').textContent=transcript||'Ses yazıya dökülemedi';const ask=$('heard-result').querySelector('p');if(ask)ask.textContent=transcript?'Doğru anladım mı? Yanlışsa aşağıdan düzelt.':'Söylediğin futbolcunun adını aşağıya yaz.';$('heard-result').hidden=false;$('record-name').hidden=true;$('manual-name').value=transcript;$('speech-fallback').hidden=false;$('manual-name').hidden=false;if(!transcript)$('manual-name').focus();
 }else if(mode==='imitation'){
  (async()=>{const turnKey=state.turnKey;lockButton('record-imitation','İŞLENİYOR…');try{toast('Ses ters çevriliyor…');const reverse=await withTimeout(reverseBlob(blob),15000,'Ses işlenemedi. Tekrar kaydet.');if(turnKey!==state.turnKey)return;await roomWrite({reverseImitation:reverse,phase:'guess',imitationBy:uid()})}catch(e){unlockButton('record-imitation');toast(e.message||'Ses işlenemedi.')}})();
 }
}
// A failed start (permission, timeout) must not leave the button on "KAYDI DURDUR".
function recordingFailed(mode){try{state.speech?.stop()}catch{}state.speech=null;clearTimeout(state.stopWatchdog);state.recordingMode='';state.recorder=null;state.pcmStop=null;const b=$(mode==='name'?'record-name':'record-imitation');if(b){b.classList.remove('recording');b.textContent='🎙 KAYDI BAŞLAT'}releaseStream()}
function isIOSAudio(){return /iPhone|iPad|iPod/.test(navigator.userAgent||'')||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)}
// Pauses every RE:VERSE audio player. Starting the mic while the opponent's clip is still playing (or
// right after it) made iOS hand the recorder silence: "Kayıtta ses yok".
function stopPlayback(){for(const id of ['reverse-audio','final-audio']){const a=$(id);try{if(a&&!a.paused)a.pause()}catch{}}}
// A dead input (muted/handed-over track) delivers exact zeros; a live mic always has some noise.
const DEAD=1e-6;
function waitUnmuted(stream,ms=1500){const t=stream.getAudioTracks()[0];if(!t||!t.muted)return Promise.resolve();return new Promise(r=>{const done=()=>{t.removeEventListener('unmute',done);r()};t.addEventListener('unmute',done);setTimeout(done,ms)})}
async function openMic(){stopPlayback();const stream=await getStream();await waitUnmuted(stream);return stream}
async function startManualRecording(mode){
 let stream=await openMic();state.recordingMode=mode;state.transcript='';
 const button=$(mode==='name'?'record-name':'record-imitation');button.classList.add('recording');button.textContent='■ KAYDI DURDUR';
 const AC=window.AudioContext||window.webkitAudioContext;
 if(isIOSAudio()&&AC){
  // A fresh AudioContext per recording: after an <audio> element has played, iOS can leave an older
  // context's microphone input silent. If the input still delivers only zeros, the mic is reattached
  // automatically (up to twice) instead of ending with "Kayıtta ses yok".
  const chunks=[];let ctx=null,source=null,processor=null,alive=false,stopped=false,retries=0,watch=null;
  const detach=()=>{if(processor)processor.onaudioprocess=null;try{source?.disconnect();processor?.disconnect()}catch{}const old=ctx;ctx=null;if(old&&old.state!=='closed')old.close().catch(()=>{})};
  const attach=async s=>{
   ctx=new AC();state.audioContext=ctx;await withTimeout(ctx.resume(),2500,'Ses sistemi başlatılamadı. Tekrar dene.');
   source=ctx.createMediaStreamSource(s);processor=ctx.createScriptProcessor(4096,1,1);
   processor.onaudioprocess=e=>{const d=e.inputBuffer.getChannelData(0);if(!alive&&peak(d)>DEAD)alive=true;if(alive)chunks.push(new Float32Array(d));e.outputBuffer.getChannelData(0).fill(0)};
   source.connect(processor);processor.connect(ctx.destination);
  };
  const check=async()=>{
   if(stopped||alive)return;
   if(retries>=2){toast('Mikrofon yanıt vermiyor. Durdurup tekrar dene.');return}
   retries++;detach();try{stream=await openMic();if(stopped){releaseStream();return}await attach(stream)}catch{}
   watch=setTimeout(check,1200);
  };
  await attach(stream);watch=setTimeout(check,1200);
  state.pcmStop=async()=>{
   stopped=true;clearTimeout(watch);const rate=ctx?.sampleRate||48000;detach();
   const total=chunks.reduce((n,x)=>n+x.length,0);
   const samples=new Float32Array(total);let offset=0;for(const chunk of chunks){samples.set(chunk,offset);offset+=chunk.length}
   if(total===0||peak(samples)<SILENCE){state.discardRecording=true;finishManualRecording(new Blob([],{type:'audio/wav'}),mode,button);toast(total===0?'Mikrofondan ses alınamadı. Kaydı tekrar dene.':'Kayıtta ses yok. Mikrofona yakın konuşup tekrar kaydet.');return}
   finishManualRecording(encodeWav(downsample(samples,rate,TARGET_RATE),TARGET_RATE),mode,button);
  };
 }else{
  if(!window.MediaRecorder)throw new Error('Bu tarayıcı ses kaydını desteklemiyor.');
  const mime=recordingMimeType();let rec=null,monitor=null,watch=null,retries=0;
  const begin=s=>{
   rec=new MediaRecorder(s,mime?{mimeType:mime}:undefined);state.recorder=rec;state.chunks=[];const self=rec;
   rec.ondataavailable=e=>{if(e.data.size&&state.recorder===self)state.chunks.push(e.data)};
   rec.onerror=()=>{if(state.recorder!==self)return;state.discardRecording=true;finishManualRecording(new Blob([]),mode,button);toast('Kayıt sırasında hata oluştu. Tekrar dene.')};
   rec.onstop=()=>{if(state.recorder!==self)return;cleanupMonitor();finishManualRecording(new Blob(state.chunks,{type:self.mimeType||'audio/webm'}),mode,button)};rec.start();
  };
  // Same dead-input check as on iOS: restart the recorder on a fresh mic if it only hears zeros.
  const cleanupMonitor=()=>{clearTimeout(watch);const m=monitor;monitor=null;if(m&&m.state!=='closed')m.close().catch(()=>{})};
  const probe=s=>{if(!AC)return;cleanupMonitor();try{monitor=new AC();const an=monitor.createAnalyser();an.fftSize=2048;monitor.createMediaStreamSource(s).connect(an);const buf=new Float32Array(an.fftSize);let alive=false;const tick=setInterval(()=>{if(!monitor){clearInterval(tick);return}an.getFloatTimeDomainData(buf);if(peak(buf)>DEAD)alive=true},150);
    watch=setTimeout(async()=>{clearInterval(tick);if(alive||!state.recorder||state.recordingMode!==mode){cleanupMonitor();return}if(retries>=2){cleanupMonitor();toast('Mikrofon yanıt vermiyor. Durdurup tekrar dene.');return}
     retries++;const old=state.recorder;state.recorder=null;try{old.stop()}catch{}try{const fresh=await openMic();if(state.recordingMode!==mode){releaseStream();return}begin(fresh);probe(fresh)}catch{state.discardRecording=true;finishManualRecording(new Blob([]),mode,button);toast('Mikrofon açılamadı. Tekrar dene.')}},1300);
   }catch{cleanupMonitor()}};
  begin(stream);probe(stream);
 }
 if(mode==='name'){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(SR){const speech=new SR();speech.lang='tr-TR';speech.interimResults=true;speech.continuous=true;speech.maxAlternatives=3;speech.onresult=e=>{state.transcript=Array.from(e.results).map(r=>r[0]?.transcript||'').join(' ').trim()};speech.onerror=()=>{$('speech-fallback').hidden=false;$('manual-name').hidden=false};state.speech=speech;try{speech.start()}catch{$('speech-fallback').hidden=false;$('manual-name').hidden=false}}
  else{$('speech-fallback').hidden=false;$('manual-name').hidden=false}
 }
 state.recordStartedAt=Date.now(); // a quick double tap must not stop the recording it just started
 toast('Kayıt başladı. Bitirdiğinde aynı mikrofon tuşuna tekrar bas.');
}
function stopManualRecording(){
 try{state.speech?.stop()}catch{}state.speech=null;
 const mode=state.recordingMode,button=$(mode==='name'?'record-name':'record-imitation');
 if(state.pcmStop){const finish=state.pcmStop;state.pcmStop=null;Promise.resolve().then(finish).catch(()=>{state.discardRecording=true;finishManualRecording(new Blob([]),mode,button);toast('Kayıt tamamlanamadı. Tekrar dene.')});return}
 const rec=state.recorder;
 if(rec&&rec.state!=='inactive'){
  // Some browsers never fire onstop when the mic track was cut; finish with what was captured.
  clearTimeout(state.stopWatchdog);
  state.stopWatchdog=setTimeout(()=>{if(state.recorder===rec&&state.recordingMode===mode)finishManualRecording(new Blob(state.chunks,{type:rec.mimeType||'audio/webm'}),mode,button)},2500);
  try{rec.requestData?.()}catch{}try{rec.stop()}catch{finishManualRecording(new Blob(state.chunks,{type:rec.mimeType||'audio/webm'}),mode,button)}
  return;
 }
 // Nothing is recording although the button says so: put the button back instead of leaving it stuck.
 if(mode){state.discardRecording=true;finishManualRecording(new Blob([]),mode,button)}
}
async function decodeAudioWithElement(blob,ctx){
 return new Promise(async(resolve,reject)=>{
  const url=URL.createObjectURL(blob),audio=new Audio(),source=ctx.createMediaElementSource(audio),processor=ctx.createScriptProcessor(4096,1,1),chunks=[];
  let settled=false;
  const cleanup=()=>{audio.pause();audio.removeAttribute('src');audio.load();URL.revokeObjectURL(url);try{source.disconnect();processor.disconnect()}catch{}};
  const fail=error=>{if(settled)return;settled=true;cleanup();reject(error)};
  processor.onaudioprocess=e=>{if(!settled)chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)))};
  source.connect(processor);processor.connect(ctx.destination);audio.preload='auto';audio.src=url;
  audio.onerror=()=>fail(new Error('Safari kayıt dosyasını oynatamadı.'));
  audio.onended=()=>{
   if(settled)return;settled=true;
   const total=chunks.reduce((n,x)=>n+x.length,0),buffer=ctx.createBuffer(1,total,ctx.sampleRate),out=buffer.getChannelData(0);
   let offset=0;for(const chunk of chunks){out.set(chunk,offset);offset+=chunk.length}
   cleanup();resolve(buffer);
  };
  setTimeout(()=>fail(new Error('Kayıt çözümlenemedi.')),12000);
  try{await ctx.resume();await audio.play()}catch(error){fail(error)}
 });
}
function reverseWavBlob(blob){
 return blob.arrayBuffer().then(bytes=>{
  const v=new DataView(bytes);if(v.byteLength<44||v.getUint32(0,false)!==0x52494646||v.getUint32(8,false)!==0x57415645)throw new Error('Geçersiz WAV kaydı.');
  let p=12,offset=-1,size=0,bits=16,channels=1,rate=22050;
  while(p+8<=v.byteLength){const id=v.getUint32(p,false),n=v.getUint32(p+4,true),body=p+8;if(id===0x666d7420){channels=v.getUint16(body+2,true);rate=v.getUint32(body+4,true);bits=v.getUint16(body+14,true)}if(id===0x64617461){offset=body;size=n;break}p=body+n+(n&1)}
  if(offset<0||bits!==16||channels!==1)throw new Error('WAV biçimi desteklenmiyor.');
  const count=Math.floor(size/2),samples=new Float32Array(count);for(let i=0;i<count;i++)samples[count-1-i]=v.getInt16(offset+i*2,true)/32768;
  if(peak(samples)<SILENCE)throw new Error('Kayıtta ses yok. Mikrofona yakın konuşup tekrar kaydet.');
  return encodeWav(downsample(samples,rate,TARGET_RATE),Math.min(rate,TARGET_RATE));
 });
}
async function reverseBlob(blob){
 if((blob.type||'').includes('wav'))return blobData(await reverseWavBlob(blob));
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('Bu tarayıcı ses dönüştürmeyi desteklemiyor.');const ctx=new AC();
 try{let buffer;try{buffer=await ctx.decodeAudioData((await blob.arrayBuffer()).slice(0))}catch(e){console.warn('Reverse XI native decode fallback',{mimeType:blob.type,size:blob.size,error:e});buffer=await decodeAudioWithElement(blob,ctx)}
  if(peak(buffer.getChannelData(0))<SILENCE)throw new SilentError();
  const rate=TARGET_RATE,length=Math.ceil(buffer.duration*rate),samples=new Float32Array(length),src=buffer.getChannelData(0);for(let i=0;i<length;i++){const pos=i*(buffer.sampleRate/rate),lo=Math.floor(pos),hi=Math.min(src.length-1,lo+1),frac=pos-lo;samples[length-1-i]=src[lo]*(1-frac)+src[hi]*frac}return await blobData(encodeWav(samples,rate));
 }catch(error){if(error instanceof SilentError)throw new Error('Kayıtta ses yok. Mikrofona yakın konuşup tekrar kaydet.');console.error('Reverse XI audio processing failed',{mimeType:blob.type,size:blob.size,error});throw new Error(isIOSAudio()?'iPhone ses kaydı işlenemedi. Mikrofon iznini kontrol edip yeniden dene.':'Ses işlenemedi. Tekrar kayıt yapmayı dene.')}
 finally{if(ctx.state!=='closed')await ctx.close().catch(()=>{})}
}
const TARGET_RATE=16000,SILENCE=0.002;
class SilentError extends Error{}
function peak(samples){let m=0;for(let i=0;i<samples.length;i+=4){const a=Math.abs(samples[i]);if(a>m)m=a}return m}
function downsample(samples,from,to){if(!from||from<=to)return samples;const ratio=from/to,length=Math.floor(samples.length/ratio),out=new Float32Array(length);for(let i=0;i<length;i++){const start=Math.floor(i*ratio),end=Math.min(samples.length,Math.floor((i+1)*ratio));let sum=0;for(let j=start;j<end;j++)sum+=samples[j];out[i]=sum/Math.max(1,end-start)}return out}
function encodeWav(samples,rate){const b=new ArrayBuffer(44+samples.length*2),v=new DataView(b);const write=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));write(0,'RIFF');v.setUint32(4,36+samples.length*2,true);write(8,'WAVE');write(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);write(36,'data');v.setUint32(40,samples.length*2,true);for(let i=0;i<samples.length;i++)v.setInt16(44+i*2,Math.max(-1,Math.min(1,samples[i]))*32767,true);return new Blob([b],{type:'audio/wav'})}
function blobData(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob)})}
async function captureName(){const stream=await getStream();return new Promise((resolve,reject)=>{const mime=recordingMimeType();const rec=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);const parts=[];let transcript='',done=false;const finish=()=>{if(done)return;done=true;if(rec.state!=='inactive')rec.stop()};rec.ondataavailable=e=>{if(e.data.size)parts.push(e.data)};rec.onerror=()=>reject(new Error('Kayıt yapılamadı.'));rec.onstop=()=>resolve({blob:new Blob(parts,{type:rec.mimeType||'audio/webm'}),text:transcript});rec.start();const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(SR){const speech=new SR();speech.lang='tr-TR';speech.interimResults=false;speech.maxAlternatives=4;speech.onresult=e=>{transcript=[...e.results[0]].sort((a,b)=>b.confidence-a.confidence)[0].transcript;finish()};speech.onerror=()=>finish();try{speech.start()}catch{finish()}}else{$('speech-fallback').hidden=false;$('manual-name').hidden=false;toast('İsmi söyledikten sonra ekrandaki alana yaz.')}setTimeout(finish,8000)})}
$('record-name').onclick=async()=>{if(state.startingRecording)return;try{if(state.recordingMode==='name'){if(Date.now()-(state.recordStartedAt||0)<600)return;stopManualRecording();return}if(state.recordingMode){toast('Önce devam eden kaydı durdur.');return}state.startingRecording=true;await startManualRecording('name')}catch(e){recordingFailed('name');toast(e.message||'Mikrofon açılamadı.')}finally{state.startingRecording=false}};
$('confirm-name').onclick=async()=>{if(state.busy.confirm)return;const name=$('manual-name').value.trim();if(!name){toast('Futbolcu ismini yazıp onayla.');return}if(!state.originalBlob){toast('Ses kaydı bulunamadı. Tekrar kaydet.');return}const turnKey=state.turnKey;state.busy.confirm=true;lockButton('confirm-name','İŞLENİYOR…');try{const reverse=await withTimeout(reverseBlob(state.originalBlob),15000,'Ses işlenemedi. Tekrar söyle.');if(turnKey!==state.turnKey)return;state.secretAnswer=name;localStorage.setItem('nxReverseXI:'+state.room+':'+uid(),name);await roomWrite({reverseOriginal:reverse,phase:'imitate',answerBy:uid()});}catch(e){state.busy.confirm=false;unlockButton('confirm-name');toast(e.message||'Ses işlenemedi.')}};
$('retry-name').onclick=()=>{$('heard-result').hidden=true;$('record-name').hidden=false;$('manual-name').hidden=true;$('speech-fallback').hidden=true;$('manual-name').value='';state.transcript='';state.originalBlob=null};
$('record-imitation').onclick=async()=>{if(state.startingRecording)return;try{if(state.recordingMode==='imitation'){if(Date.now()-(state.recordStartedAt||0)<600)return;stopManualRecording();return}if(state.recordingMode){toast('Önce devam eden kaydı durdur.');return}state.startingRecording=true;await startManualRecording('imitation')}catch(e){recordingFailed('imitation');toast(e.message||'Mikrofon kullanılamadı.')}finally{state.startingRecording=false}};
$('send-guess').onclick=async()=>{if(state.busy.guess)return;const guess=$('guess-input').value.trim();if(!guess){toast('Tahminini yaz.');return}if(state.roomData?.phase!=='guess'){toast('Şu anda tahmin gönderilemez.');return}const guessId='g'+Date.now(),byName=state.local?(state.roomData?.players?.[mySide()]?.name||mySide()):mySide();state.busy.guess=true;lockButton('send-guess','…');try{$('guess-feedback').textContent='Cevap kontrol ediliyor…';await roomWrite({pendingGuess:{id:guessId,guess,byName:byName||'Oyuncu',createdAt:Date.now()},phase:'checking'})}catch(e){state.busy.guess=false;unlockButton('send-guess');$('guess-feedback').textContent='';toast('Tahmin gönderilemedi: '+e.message)}};
$('next-turn').onclick=async()=>{const d=state.roomData;if(!d||d.phase!=='result'||state.busy.next)return;state.busy.next=true;lockButton('next-turn','…');const next=d.currentSpeaker==='A'?'B':'A';localStorage.removeItem('nxReverseXI:'+state.room+':'+uid());state.secretAnswer='';try{await roomWrite({currentSpeaker:next,turn:(d.turn||1)+1,phase:'speak',reverseOriginal:null,reverseImitation:null,lastResult:null,pendingGuess:null,answerBy:null,imitationBy:null})}catch(e){state.busy.next=false;unlockButton('next-turn');toast('Sonraki tura geçilemedi: '+e.message)}};

document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('active',x===b));if($('duel-start'))$('duel-start').hidden=state.mode!=='duel';if($('solo-start'))$('solo-start').hidden=state.mode!=='solo'});
$('party-friends')?.addEventListener('click',()=>{if(window.NEON_ARCADE_UI?.choose)window.NEON_ARCADE_UI.choose('reverse','friends');else toast('Sosyal bağlantı yükleniyor, birazdan tekrar dene.')});
function startLocal(){
 const nameA=($('local-a')?.value||'').trim().slice(0,24)||'Oyuncu A',nameB=($('local-b')?.value||'').trim().slice(0,24)||'Oyuncu B';
 state.local=true;state.room='LOCAL';state.secretAnswer='';state.passAck=0;
 state.localRoom={game_type:'reverse-xi',status:'playing',players:{A:{uid:'local',name:nameA},B:{uid:'local',name:nameB}},currentSpeaker:'A',turn:1,phase:'speak',guesses:{}};
 $('intro').hidden=true;$('game').hidden=false;document.body.classList.add('rx-local');
 renderRoom(JSON.parse(JSON.stringify(state.localRoom)));
}
// Before the imitator takes over, the phone changes hands: hide every panel until they confirm.
// Every device clears the previous turn's speaker/imitator/guess UI when a new turn starts.
// Before this, the "Doğru anladım mı?" box, the typed name, the recorded audio and the guess
// text survived into later turns, so a speaker could re-send the previous turn's name.
function lockButton(id,label){const b=$(id);if(!b)return;if(!b.dataset.label)b.dataset.label=b.textContent;b.disabled=true;if(label)b.textContent=label}
function unlockButton(id){const b=$(id);if(!b)return;b.disabled=false;if(b.dataset.label){b.textContent=b.dataset.label;delete b.dataset.label}}
function resetTurnUI(){
 if(state.recordingMode){state.discardRecording=true;stopManualRecording()}
 try{state.speech?.stop()}catch{}state.speech=null;releaseStream();
 state.transcript='';state.originalBlob=null;state.busy={};
 ['confirm-name','send-guess','next-turn','record-imitation'].forEach(unlockButton);
 const rn=$('record-name');rn.hidden=false;rn.classList.remove('recording');rn.textContent='🎙 KAYDI BAŞLAT';
 const ri=$('record-imitation');ri.classList.remove('recording');ri.textContent='🎙 KAYDI BAŞLAT';
 $('heard-result').hidden=true;$('heard-name').textContent='';
 const ask=$('heard-result').querySelector('p');if(ask)ask.textContent='Doğru anladım mı?';
 $('manual-name').hidden=true;$('manual-name').value='';$('speech-fallback').hidden=true;
 $('guess-input').value='';$('guess-feedback').textContent='';
 for(const id of ['reverse-audio','final-audio']){const a=$(id);try{a.pause()}catch{}a.removeAttribute('src');delete a.dataset.src;try{a.load()}catch{}}
}
state.busy={};
const baseRenderRoom=renderRoom;
renderRoom=function(data){
 const key=(data?.turn||1)+':'+(data?.currentSpeaker||'A');
 if(state.turnKey!==key){state.turnKey=key;resetTurnUI()}
 baseRenderRoom(data);
};
const baseUpdateStage=updateStage;
updateStage=function(){
 baseUpdateStage();
 const d=state.roomData;if(!d)return;
 // The base renderer computes a step title per phase but never writes it; show it with player names.
 if(d.players?.B){
  const sp=d.currentSpeaker||'A',im=sp==='A'?'B':'A',nm=k=>d.players?.[k]?.name||k,ph=d.phase||'speak';
  const copy={speak:[nm(sp)+' futbolcuyu söylüyor','İsmi normal şekilde söyle ve doğru anlaşıldığını onayla.'],imitate:[nm(im)+' ters sesi taklit ediyor','Ters sesi dinle ve duyduğun gibi kaydet.'],guess:[nm(im)+' tahmin ediyor','Kendi kaydının tersini dinleyip futbolcuyu bul.'],checking:['Cevap kontrol ediliyor','Tahmin doğrulanıyor.'],result:['Tur tamamlandı','Sıradaki tur için devam et.']}[ph];
  if(copy){$('step-title').textContent=copy[0];$('step-desc').textContent=copy[1]}
 }
 if(!state.local)return;
 if(d.phase==='result')$('next-turn').hidden=false;
 const gate=$('pass-panel');if(!gate)return;
 const speaker=d.currentSpeaker||'A',imitator=speaker==='A'?'B':'A';
 const needsPass=d.phase==='imitate'&&state.passAck!==d.turn;
 gate.hidden=!needsPass;
 if(needsPass){
  ['speaker-panel','listen-panel','guess-panel','result-panel','waiting-panel'].forEach(id=>$(id).hidden=true);
  const name=d.players?.[imitator]?.name||imitator;
  $('pass-title').textContent='Telefonu '+name+' oyuncusuna ver';
  $('step-title').textContent='Sıra '+name+' oyuncusunda';$('step-desc').textContent='Futbolcu seçildi. Telefonu ver; ters sesi '+name+' dinleyecek.';
 }
};
$('pass-ready')?.addEventListener('click',()=>{state.passAck=state.roomData?.turn||0;updateStage()});
$('local-start')?.addEventListener('click',startLocal);
$('local-open')?.addEventListener('click',()=>{$('local-sheet').hidden=false;$('local-open').classList.add('active');$('local-a')?.focus()});
$('start-solo').onclick=()=>toast('Solo AI modu sonraki geliştirme adımında etkinleştirilecek. Multiplayer çekirdeği hazırlandı.');
window.addEventListener('beforeunload',()=>state.stream?.getTracks().forEach(t=>t.stop()));
await ensureAuth().catch(e=>toast('Kimlik bağlantısı kurulamadı: '+e.message));
const startup=new URLSearchParams(location.search),partyCode=startup.get('nxCode')||'',partyName=startup.get('nxName')||'NEON Oyuncu';
if(startup.get('nxAuto')==='1'&&partyCode){
 if(startup.get('nxRole')==='host')await createRoom(partyCode,partyName);
 else{
  // The host may still be creating the room when the guest arrives from matchmaking: wait for it.
  const code=String(partyCode).toUpperCase().replace(/[^A-Z0-9]/g,'');
  for(let i=0;i<30;i++){try{if((await get(ref(db,'reverseXI/rooms/'+code))).exists())break}catch{}await new Promise(r=>setTimeout(r,500))}
  await joinRoom(partyCode,partyName);
 }
}
