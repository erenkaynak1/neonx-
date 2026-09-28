/* Shared NEON XI arcade controls: real social actions, no room-code entry */
(()=>{'use strict';
const base=new URL('../',document.currentScript.src),atRoot=[new URL('index.html',base).pathname,base.pathname].includes(location.pathname);
const paths={home:new URL('index.html',base).href,play:new URL('side-games/index.html',base).href};
const glyphs={
home:'<path d="M3 10 12 3l9 7v11H3Z"/><path d="M9 21v-8h6v8"/>',
play:'<path d="m8 5 11 7-11 7Z"/>',
friends:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-3c0-3 3-5 6-5s6 2 6 5v3"/><path d="M17 5a3 3 0 0 1 0 6m1 3c2 1 3 2 3 5"/>',
settings:'<circle cx="12" cy="12" r="3"/><path d="m10 2-.7 2.2-2 .9-2.1-1-2 3.5 1.8 1.4-.2 2.1L3 12.5l1.7 3.6 2.2-.3 1.6 1.5.3 2.4h4l.7-2.2 2-.9 2.1 1 2-3.5-1.8-1.4.2-2.1L21 9.5l-1.7-3.6-2.2.3-1.6-1.5L15.2 2Z"/>',
close:'<path d="m5 5 14 14M19 5 5 19"/>',
search:'<path d="m13 5 7 7-7 7M4 12h16"/>'
};
const svg=name=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+glyphs[name]+'</svg>';
let dialog=null,previousFocus=null;
const social=async()=>{for(let i=0;i<80;i++){if(window.NEON_SOCIAL?.open)return window.NEON_SOCIAL;await new Promise(r=>setTimeout(r,75))}return null};
function flash(msg){let n=document.getElementById('nx-arcade-feedback');if(!n){n=document.createElement('div');n.id='nx-arcade-feedback';n.setAttribute('role','status');n.style.cssText='position:fixed;z-index:510000;bottom:110px;left:50%;transform:translateX(-50%);background:#0b1a21;border:1px solid #91d6f4;color:white;border-radius:12px;padding:12px 15px;font:600 13px Arial;width:min(88%,380px);text-align:center;box-shadow:0 8px 34px #000';document.body.append(n)}n.textContent=msg;clearTimeout(n._timer);n._timer=setTimeout(()=>n.remove(),3600)}
async function choose(mode,choice){
  closeChoice();const api=await social();if(!api){flash('Sosyal bağlantı yüklenemedi. İnternet bağlantını kontrol et.');return}
  if(typeof api.chooseMode==='function'){try{await api.chooseMode(mode,choice)}catch(e){flash(e?.message||'İşlem başlatılamadı.')}return}
  // Only used when social core has not yet adopted the direct mode bridge.
  if(choice==='friends'){api.open('party');return}
  api.open('play');let v=document.querySelector('.nx-social-shade #nxMode');if(v){v.value=mode;document.querySelector('.nx-social-shade [data-act="match"]')?.click()}else flash('Mod seçimi şu anda açılamıyor.');
}
function ensureChoice(){if(dialog)return dialog;dialog=document.createElement('div');dialog.className='nx-arcade-choice-shade';dialog.innerHTML='<section class="nx-arcade-choice" role="dialog" aria-modal="true" aria-label="Online oyun seçimi"><button type="button" class="nx-arcade-choice-close" aria-label="Kapat">×</button><div class="nx-arcade-choice-eyebrow">NEON XI · ONLINE</div><h2>OYUN MODUNU SEÇ</h2><button class="nx-arcade-option" type="button" data-nx-option="friends">'+svg('friends')+'<span>ARKADAŞLARINLA OYNA<small>Partini aç, arkadaşlarını davet et.</small></span></button><button class="nx-arcade-option" type="button" data-nx-option="match">'+svg('search')+'<span>RAKİP ARA<small>Uygun oyuncularla otomatik eşleş.</small></span></button><p class="nx-arcade-choice-note">Oda kodu girmen gerekmez.</p></section>';
 dialog.addEventListener('click',e=>{if(e.target===dialog||e.target.closest('.nx-arcade-choice-close'))closeChoice();const b=e.target.closest('[data-nx-option]');if(b)choose(dialog.dataset.mode||'draft',b.dataset.nxOption)});document.body.append(dialog);return dialog}
function openChoice(mode='draft'){previousFocus=document.activeElement;const d=ensureChoice();d.dataset.mode=mode;d.classList.add('open');d.querySelector('[data-nx-option="friends"]').focus()}
function closeChoice(){dialog?.classList.remove('open');if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true})}
function openSettings(){location.href=paths.home+'?nxOpenSettings=1'}
function addFooter(){if(atRoot||document.getElementById('nx-arcade-footer'))return;
 const nav=document.createElement('nav');nav.id='nx-arcade-footer';nav.className='nx-arcade-footer';nav.setAttribute('aria-label','NEON XI alt menü');
 const specs=[['home','Ana Sayfa',paths.home],['play','Oyna',paths.play],['friends','Arkadaşlar','#friends'],['settings','Ayarlar','#settings']];
 specs.forEach(([action,label,href])=>{const a=document.createElement('a');a.href=href;a.className='nx-arcade-link';a.dataset.nxNav=action;if(action==='play')a.dataset.active='true';a.innerHTML=svg(action)+'<span>'+label+'</span>';if(action==='play')a.setAttribute('aria-current','page');if(action==='friends')a.addEventListener('click',async e=>{e.preventDefault();const api=await social();if(api)api.open('friends');else flash('Arkadaşlar paneli yüklenemedi.')});if(action==='settings')a.addEventListener('click',e=>{e.preventDefault();openSettings()});nav.append(a)});
 document.body.classList.add('nx-arcade-has-footer');document.body.append(nav);
 const badge=()=>{const n=Number(document.querySelector('.nx-social-launch')?.dataset.count||0);const a=nav.querySelector('[data-nx-nav="friends"]');let b=a.querySelector('.nx-arcade-badge');if(n>0){if(!b){b=document.createElement('i');b.className='nx-arcade-badge';a.append(b)}b.textContent=n>99?'99+':String(n);a.setAttribute('aria-label','Arkadaşlar, '+n+' bildirim')}else{b?.remove();a.setAttribute('aria-label','Arkadaşlar')}};badge();setInterval(()=>{if(!document.hidden)badge()},1600)
}
document.addEventListener('click',e=>{if(!atRoot)return;const btn=e.target.closest('#bootHome.nx-approved-home-v1 [data-action="online"]');if(btn){e.preventDefault();e.stopImmediatePropagation();openChoice('draft')}},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dialog?.classList.contains('open')){e.preventDefault();closeChoice()}});
async function settingsDeepLink(){if(!atRoot||new URLSearchParams(location.search).get('nxOpenSettings')!=='1')return;for(let i=0;i<100;i++){const b=document.querySelector('#bootHome.nx-approved-home-v1 [data-action="settings"]');if(b){history.replaceState(null,'',paths.home);b.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return}await new Promise(r=>setTimeout(r,100))}flash('Ayarlar yüklenemedi.')}
window.NEON_ARCADE_UI={openChoice,choose,openSettings};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{addFooter();settingsDeepLink()},{once:true});else{addFooter();settingsDeepLink()}
})();