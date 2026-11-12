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
function roomWrite(patch){
 if(!state.local)return update(roomRef(),patch);
 applyPatch(state.localRoom,patch);
 const snapshot=JSON.parse(JSON.stringify(state.localRoom));
 return new Promise(resolve=>setTimeout(()=>{renderRoom(snapshot);validateIncomingGuess(snapshot);resolve()},0));
}
const normalize=s=>String(s||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/æ/g,'ae').replace(/œ/g,'oe').replace(/ß/g,'ss').replace(/ø/g,'o').replace(/ł/g,'l').replace(/đ/g,'d').replace(/þ/g,'th').replace(/ð/g,'d').replace(/[^a-z0-9]/g,'');
function distance(a,b){const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let prev=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old}}return row[b.length]}
function answerMatches(guess,answer){const g=normalize(guess),a=normalize(answer);if(!g||!a)return false;if(g===a)return true;if(g.length>=4&&a.includes(g))return true;const aliases=(answer+'|'+answer.replace(/khvicha/i,'khvicha')+'|'+answer.replace(/kvaratskhelia/i,'kvaratskhelia')).split('|').map(normalize);if(aliases.includes(g))return true;if(Math.min(g.length,a.length)>=5&&Math.abs(g.length-a.length)<=Math.max(2,Math.floor(a.length*.2))&&distance(g,a)<=Math.max(2,Math.floor(a.length*.2)))return true;return false}
async function ensureAuth(){if(auth.currentUser){state.uid=auth.currentUser.uid;return}await new Promise((resolve,reject)=>{const off=onAuthStateChanged(auth,async user=>{off();try{if(user){state.uid=user.uid;resolve()}else{const result=await signInAnonymously(auth);state.uid=result.user.uid;resolve()}}catch(e){reject(e)}} ,reject)})}
function makeCode(){return Array.from({length:6},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*32)]).join('')}
function renderRoom(data){state.roomData=data;const speakerSide=data.currentSpeaker||'A';if(mySide()===speakerSide)state.secretAnswer=state.secretAnswer||localStorage.getItem('nxReverseXI:'+state.room+':'+uid())||'';$('name-a').textContent=data.players?.A?.name||'Bekleniyor…';$('name-b').textContent=data.players?.B?.name||'Bekleniyor…';$('player-a').classList.toggle('active',data.currentSpeaker==='A');$('player-b').classList.toggle('active',data.currentSpeaker==='B');$('step-no').textContent='TUR '+(data.turn||1);$('room-label').textContent=state.room;$('chat-lines').innerHTML=Object.values(data.guesses||{}).map(x=>'<div class="chat-item"><b>'+esc(x.byName)+':</b> '+esc(x.guess)+' · '+(x.correct?'DOĞRU':'YANLIŞ')+'</div>').join('')||'<span class="hint">Henüz tahmin yok.</span>';updateStage()}
function mySide(){const d=state.roomData;if(state.local&&d){const speaker=d.currentSpeaker||'A',imitator=speaker==='A'?'B':'A',phase=d.phase||'speak';return phase==='imitate'||phase==='guess'?imitator:speaker}if(d?.players?.A?.uid===uid())return'A';if(d?.players?.B?.uid===uid())return'B';return''}
function updateStage(){const d=state.roomData;if(!d)return;['speaker-panel','listen-panel','guess-panel','result-panel','waiting-panel'].forEach(id=>$(id).hidden=true);if(!d.players?.B){$('step-title').textContent='Arkadaşını bekliyoruz';$('step-desc').textContent='Oda kodunu arkadaşınla paylaş. Katıldığında ilk tur başlayacak.';$('waiting-panel').hidden=false;return}const side=mySide(),speaker=d.currentSpeaker||'A',imitator=speaker==='A'?'B':'A',phase=d.phase||'speak';let title='',desc='';if(phase==='speak'){title=speaker+' oyuncusu futbolcu ismini söylüyor';desc='İsmi normal şekilde söyle ve sistemin doğru anladığını onayla.';if(side===speaker)$('speaker-panel').hidden=false;else $('waiting-panel').hidden=false}else if(phase==='imitate'){title=imitator+' oyuncusu ters sesi taklit ediyor';desc='Ters sesi dinle ve duyduğun şekilde kaydet.';if(side===imitator){$('listen-panel').hidden=false;setAudio('reverse-audio',d.reverseOriginal)}else $('waiting-panel').hidden=false}else if(phase==='guess'){title=imitator+' oyuncusu tahmin ediyor';desc='Kendi sesinin tekrar ters çevrilmiş hâlini dinleyip futbolcuyu bul.';if(side===imitator){$('guess-panel').hidden=false;setAudio('final-audio',d.reverseImitation)}else $('waiting-panel').hidden=false}else if(phase==='checking'){title='Cevap kontrol ediliyor';desc='A oyuncusu cevabı doğruluyor.';$('waiting-panel').hidden=false}else if(phase==='result'){title='Tur tamamlandı';desc='Sıradaki tur için devam et.';$('result-panel').hidden=false;$('result-title').textContent=d.lastResult?.correct?'DOĞRU TAHMİN!':'TUR TAMAMLANDI';$('result-copy').textContent='Doğru cevap: '+(d.lastResult?.answer||'')+' · Tahmin: '+(d.lastResult?.guess||'');$('next-turn').hidden=side!==d.currentSpeaker}}
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
  history.replaceState(null,'',location.pathname+'?room='+code)
 }catch(e){toast('Oda oluşturulamadı: '+e.message)}
}
async function joinRoom(code,playerName=''){
 code=String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 if(code.length!==6){toast('6 haneli oda kodunu gir.');return}
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
  history.replaceState(null,'',location.pathname+'?room='+code)
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
function openRoom(){$('intro').hidden=true;$('game').hidden=false;$('room-label').textContent=state.room;if(state.off)state.off();state.off=onValue(roomRef(),s=>{if(!s.exists()){toast('Oda kapatıldı.');return}const data=s.val();renderRoom(data);validateIncomingGuess(data)})}
async function getStream(){const live=state.stream?.getAudioTracks?.().some(t=>t.readyState==='live');if(live)return state.stream;state.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});return state.stream}
function recognize(){return new Promise(async(resolve,reject)=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){reject(new Error('speech'));return}const rec=new SR();rec.lang='tr-TR';rec.interimResults=false;rec.maxAlternatives=4;rec.onresult=e=>resolve([...e.results[0]].map(x=>x.transcript).sort((a,b)=>b.length-a.length)[0]);rec.onerror=()=>reject(new Error('recognition'));rec.start();state.speech=rec})}
function recordingMimeType(){
 const ua=navigator.userAgent||'';
 const isIOS=/iPhone|iPad|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const candidates=isIOS?['audio/mp4','audio/mp4;codecs=mp4a.40.2','audio/webm;codecs=opus','audio/webm']:['audio/webm;codecs=opus','audio/mp4','audio/webm'];
 return candidates.find(type=>typeof MediaRecorder.isTypeSupported==='function'&&MediaRecorder.isTypeSupported(type))||'';
}
function finishManualRecording(blob,mode,button){
 state.recordingMode='';state.recorder=null;state.pcmStop=null;button.classList.remove('recording');button.textContent='🎙 KAYDI BAŞLAT';
 if(state.discardRecording){state.discardRecording=false;return}
 if(mode==='name'){
  state.originalBlob=blob;const transcript=state.transcript.trim();$('heard-name').textContent=transcript||'Ses yazıya dökülemedi';const ask=$('heard-result').querySelector('p');if(ask)ask.textContent=transcript?'Doğru anladım mı? Yanlışsa aşağıdan düzelt.':'Söylediğin futbolcunun adını aşağıya yaz.';$('heard-result').hidden=false;$('record-name').hidden=true;$('manual-name').value=transcript;$('speech-fallback').hidden=false;$('manual-name').hidden=false;if(!transcript)$('manual-name').focus();
 }else if(mode==='imitation'){
  (async()=>{const turnKey=state.turnKey;lockButton('record-imitation','İŞLENİYOR…');try{toast('Ses ters çevriliyor…');const reverse=await reverseBlob(blob);if(turnKey!==state.turnKey)return;await roomWrite({reverseImitation:reverse,phase:'guess',imitationBy:uid()})}catch(e){unlockButton('record-imitation');toast(e.message||'Ses işlenemedi.')}})();
 }
}
function isIOSAudio(){return /iPhone|iPad|iPod/.test(navigator.userAgent||'')||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)}
async function startManualRecording(mode){
 const stream=await getStream();state.recordingMode=mode;state.transcript='';
 const button=$(mode==='name'?'record-name':'record-imitation');button.classList.add('recording');button.textContent='■ KAYDI DURDUR';
 if(isIOSAudio()&&(window.AudioContext||window.webkitAudioContext)){
  const AC=window.AudioContext||window.webkitAudioContext;
  // Keep one AudioContext alive for the whole match. iOS Safari can fail
  // when a closed context is replaced during the next round.
  if(!state.audioContext||state.audioContext.state==='closed')state.audioContext=new AC();
  const ctx=state.audioContext;await ctx.resume();
  const source=ctx.createMediaStreamSource(stream),processor=ctx.createScriptProcessor(4096,1,1),chunks=[];
  processor.onaudioprocess=e=>{chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));e.outputBuffer.getChannelData(0).fill(0)};
  source.connect(processor);processor.connect(ctx.destination);
  state.pcmStop=async()=>{
   processor.onaudioprocess=null;try{source.disconnect();processor.disconnect()}catch{}
   const total=chunks.reduce((n,x)=>n+x.length,0);
   if(total===0){finishManualRecording(new Blob([],{type:'audio/wav'}),mode,button);toast('Mikrofondan ses alınamadı. Kaydı tekrar dene.');return}
   const samples=new Float32Array(total);let offset=0;for(const chunk of chunks){samples.set(chunk,offset);offset+=chunk.length}
   const blob=encodeWav(samples,ctx.sampleRate);finishManualRecording(blob,mode,button);
  };
 }else{
  if(!window.MediaRecorder)throw new Error('Bu tarayıcı ses kaydını desteklemiyor.');
  const mime=recordingMimeType(),rec=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);state.recorder=rec;state.chunks=[];
  rec.ondataavailable=e=>{if(e.data.size)state.chunks.push(e.data)};
  rec.onerror=()=>{state.recordingMode='';button.classList.remove('recording');button.textContent='🎙 KAYDI BAŞLAT';toast('Kayıt sırasında hata oluştu.')};
  rec.onstop=()=>finishManualRecording(new Blob(state.chunks,{type:rec.mimeType||'audio/webm'}),mode,button);rec.start();
 }
 if(mode==='name'){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(SR){const speech=new SR();speech.lang='tr-TR';speech.interimResults=true;speech.continuous=true;speech.maxAlternatives=3;speech.onresult=e=>{state.transcript=Array.from(e.results).map(r=>r[0]?.transcript||'').join(' ').trim()};speech.onerror=()=>{$('speech-fallback').hidden=false;$('manual-name').hidden=false};state.speech=speech;try{speech.start()}catch{$('speech-fallback').hidden=false;$('manual-name').hidden=false}}
  else{$('speech-fallback').hidden=false;$('manual-name').hidden=false}
 }
 toast('Kayıt başladı. Bitirdiğinde aynı mikrofon tuşuna tekrar bas.');
}
function stopManualRecording(){
 try{state.speech?.stop()}catch{}state.speech=null;
 if(state.pcmStop){const finish=state.pcmStop;state.pcmStop=null;finish();return}
 if(state.recorder&&state.recorder.state!=='inactive')state.recorder.stop();
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
  try{await ctx.resume();await audio.play()}catch(error){fail(error)}
 });
}
function reverseWavBlob(blob){
 return blob.arrayBuffer().then(bytes=>{
  const v=new DataView(bytes);if(v.byteLength<44||v.getUint32(0,false)!==0x52494646||v.getUint32(8,false)!==0x57415645)throw new Error('Geçersiz WAV kaydı.');
  let p=12,offset=-1,size=0,bits=16,channels=1,rate=22050;
  while(p+8<=v.byteLength){const id=v.getUint32(p,false),n=v.getUint32(p+4,true),body=p+8;if(id===0x666d7420){channels=v.getUint16(body+2,true);rate=v.getUint32(body+4,true);bits=v.getUint16(body+14,true)}if(id===0x64617461){offset=body;size=n;break}p=body+n+(n&1)}
  if(offset<0||bits!==16||channels!==1)throw new Error('WAV biçimi desteklenmiyor.');
  const count=Math.floor(size/2),samples=new Float32Array(count);for(let i=0;i<count;i++)samples[count-1-i]=v.getInt16(offset+i*2,true)/32768;return encodeWav(samples,rate);
 });
}
async function reverseBlob(blob){
 if((blob.type||'').includes('wav'))return blobData(await reverseWavBlob(blob));
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('Bu tarayıcı ses dönüştürmeyi desteklemiyor.');const ctx=new AC();
 try{let buffer;try{buffer=await ctx.decodeAudioData((await blob.arrayBuffer()).slice(0))}catch(e){console.warn('Reverse XI native decode fallback',{mimeType:blob.type,size:blob.size,error:e});buffer=await decodeAudioWithElement(blob,ctx)}
  const rate=22050,length=Math.ceil(buffer.duration*rate),samples=new Float32Array(length),src=buffer.getChannelData(0);for(let i=0;i<length;i++){const pos=i*(buffer.sampleRate/rate),lo=Math.floor(pos),hi=Math.min(src.length-1,lo+1),frac=pos-lo;samples[length-1-i]=src[lo]*(1-frac)+src[hi]*frac}return await blobData(encodeWav(samples,rate));
 }catch(error){console.error('Reverse XI audio processing failed',{mimeType:blob.type,size:blob.size,error});throw new Error(isIOSAudio()?'iPhone ses kaydı işlenemedi. Mikrofon iznini kontrol edip yeniden dene.':'Ses işlenemedi. Tekrar kayıt yapmayı dene.')}
 finally{if(ctx.state!=='closed')await ctx.close().catch(()=>{})}
}
function encodeWav(samples,rate){const b=new ArrayBuffer(44+samples.length*2),v=new DataView(b);const write=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));write(0,'RIFF');v.setUint32(4,36+samples.length*2,true);write(8,'WAVE');write(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);write(36,'data');v.setUint32(40,samples.length*2,true);for(let i=0;i<samples.length;i++)v.setInt16(44+i*2,Math.max(-1,Math.min(1,samples[i]))*32767,true);return new Blob([b],{type:'audio/wav'})}
function blobData(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob)})}
async function captureName(){const stream=await getStream();return new Promise((resolve,reject)=>{const mime=recordingMimeType();const rec=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);const parts=[];let transcript='',done=false;const finish=()=>{if(done)return;done=true;if(rec.state!=='inactive')rec.stop()};rec.ondataavailable=e=>{if(e.data.size)parts.push(e.data)};rec.onerror=()=>reject(new Error('Kayıt yapılamadı.'));rec.onstop=()=>resolve({blob:new Blob(parts,{type:rec.mimeType||'audio/webm'}),text:transcript});rec.start();const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(SR){const speech=new SR();speech.lang='tr-TR';speech.interimResults=false;speech.maxAlternatives=4;speech.onresult=e=>{transcript=[...e.results[0]].sort((a,b)=>b.confidence-a.confidence)[0].transcript;finish()};speech.onerror=()=>finish();try{speech.start()}catch{finish()}}else{$('speech-fallback').hidden=false;$('manual-name').hidden=false;toast('İsmi söyledikten sonra ekrandaki alana yaz.')}setTimeout(finish,8000)})}
$('record-name').onclick=async()=>{try{if(state.recordingMode==='name'){stopManualRecording();return}if(state.recordingMode){toast('Önce devam eden kaydı durdur.');return}await startManualRecording('name')}catch(e){toast(e.message||'Mikrofon açılamadı.')}};
$('confirm-name').onclick=async()=>{if(state.busy.confirm)return;const name=$('manual-name').value.trim();if(!name){toast('Futbolcu ismini yazıp onayla.');return}if(!state.originalBlob){toast('Ses kaydı bulunamadı. Tekrar kaydet.');return}const turnKey=state.turnKey;state.busy.confirm=true;lockButton('confirm-name','İŞLENİYOR…');try{const reverse=await reverseBlob(state.originalBlob);if(turnKey!==state.turnKey)return;state.secretAnswer=name;localStorage.setItem('nxReverseXI:'+state.room+':'+uid(),name);await roomWrite({reverseOriginal:reverse,phase:'imitate',answerBy:uid()});}catch(e){state.busy.confirm=false;unlockButton('confirm-name');toast(e.message||'Ses işlenemedi.')}};
$('retry-name').onclick=()=>{$('heard-result').hidden=true;$('record-name').hidden=false;$('manual-name').hidden=true;$('speech-fallback').hidden=true;$('manual-name').value='';state.transcript='';state.originalBlob=null};
$('record-imitation').onclick=async()=>{try{if(state.recordingMode==='imitation'){stopManualRecording();return}if(state.recordingMode){toast('Önce devam eden kaydı durdur.');return}await startManualRecording('imitation')}catch(e){toast(e.message||'Mikrofon kullanılamadı.')}};
$('send-guess').onclick=async()=>{if(state.busy.guess)return;const guess=$('guess-input').value.trim();if(!guess){toast('Tahminini yaz.');return}if(state.roomData?.phase!=='guess'){toast('Şu anda tahmin gönderilemez.');return}const guessId='g'+Date.now(),byName=state.local?(state.roomData?.players?.[mySide()]?.name||mySide()):mySide();state.busy.guess=true;lockButton('send-guess','…');try{$('guess-feedback').textContent='Cevap kontrol ediliyor…';await roomWrite({pendingGuess:{id:guessId,guess,byName:byName||'Oyuncu',createdAt:Date.now()},phase:'checking'})}catch(e){state.busy.guess=false;unlockButton('send-guess');$('guess-feedback').textContent='';toast('Tahmin gönderilemedi: '+e.message)}};
$('next-turn').onclick=async()=>{const d=state.roomData;if(!d||d.phase!=='result'||state.busy.next)return;state.busy.next=true;lockButton('next-turn','…');const next=d.currentSpeaker==='A'?'B':'A';localStorage.removeItem('nxReverseXI:'+state.room+':'+uid());state.secretAnswer='';try{await roomWrite({currentSpeaker:next,turn:(d.turn||1)+1,phase:'speak',reverseOriginal:null,reverseImitation:null,lastResult:null,pendingGuess:null,answerBy:null,imitationBy:null})}catch(e){state.busy.next=false;unlockButton('next-turn');toast('Sonraki tura geçilemedi: '+e.message)}};
if($('create-room'))$('create-room').onclick=()=>createRoom();if($('join-room'))$('join-room').onclick=()=>joinRoom($('room-code').value);$('room-code')?.addEventListener('keydown',e=>{if(e.key==='Enter')joinRoom($('room-code').value)});$('copy-link').onclick=async()=>{const url=location.origin+location.pathname+'?room='+state.room;try{await navigator.clipboard.writeText(url);toast('Davet bağlantısı kopyalandı.')}catch{toast('Oda kodu: '+state.room)}};
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('active',x===b));if($('duel-start'))$('duel-start').hidden=state.mode!=='duel';if($('solo-start'))$('solo-start').hidden=state.mode!=='solo'});
$('party-friends')?.addEventListener('click',()=>{if(window.NEON_ARCADE_UI?.choose)window.NEON_ARCADE_UI.choose('reverse','friends');else toast('Sosyal bağlantı yükleniyor, birazdan tekrar dene.')});
function startLocal(){
 const nameA=($('local-a')?.value||'').trim().slice(0,24)||'Oyuncu A',nameB=($('local-b')?.value||'').trim().slice(0,24)||'Oyuncu B';
 state.local=true;state.room='LOCAL';state.secretAnswer='';state.passAck=0;
 state.localRoom={game_type:'reverse-xi',status:'playing',players:{A:{uid:'local',name:nameA},B:{uid:'local',name:nameB}},currentSpeaker:'A',turn:1,phase:'speak',guesses:{}};
 $('intro').hidden=true;$('game').hidden=false;document.body.classList.add('rx-local');
 $('room-label').textContent='TEK TELEFON';
 const roomLabelPrefix=$('room-label').previousSibling;if(roomLabelPrefix&&roomLabelPrefix.nodeType===3)roomLabelPrefix.textContent='MOD ';
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
 try{state.speech?.stop()}catch{}state.speech=null;
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
 $('room-label').textContent='TEK TELEFON';
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
const startup=new URLSearchParams(location.search),initial=startup.get('room'),partyCode=startup.get('nxCode')||'',partyName=startup.get('nxName')||'NEON Oyuncu';
if(startup.get('nxAuto')==='1'&&partyCode){
 if(startup.get('nxRole')==='host')await createRoom(partyCode,partyName);
 else await joinRoom(partyCode,partyName);
}else if(initial)joinRoom(initial);
