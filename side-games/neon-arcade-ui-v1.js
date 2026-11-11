/* Shared NEON XI interface controls: one bottom navigation for the home screen and every
   side game, plus the online mode chooser. Real social actions, no room-code entry. */
(()=>{'use strict';
const base=new URL('../',document.currentScript.src),atRoot=[new URL('index.html',base).pathname,base.pathname].includes(location.pathname);
const paths={home:new URL('index.html',base).href,play:new URL('side-games/index.html',base).href};

/* 24px line icons, 1.75 stroke. The same set is used by the home screen. */
const icons={
home:'<path d="M4 10.5 12 4l8 6.5V20h-5.5v-5.5h-5V20H4Z"/>',
friends:'<circle cx="9" cy="8.5" r="3.2"/><path d="M3 19.5c0-3.2 2.7-5.3 6-5.3s6 2.1 6 5.3"/><path d="M16 5.6a3.2 3.2 0 0 1 0 5.8"/><path d="M17.5 14.4c2.1.6 3.5 2.4 3.5 5.1"/>',
play:'<path d="M8 5.2v13.6l11.2-6.8Z"/>',
lobby:'<path d="M7 8h10a4 4 0 0 1 4 4.4l-.5 3.4a2.3 2.3 0 0 1-4.1 1L15 15H9l-1.4 1.8a2.3 2.3 0 0 1-4.1-1L3 12.4A4 4 0 0 1 7 8Z"/><path d="M8 10.5v3M6.5 12h3M15.5 11h.01M17.5 13h.01"/>',
leaderboard:'<path d="M9.5 20V5h5v15"/><path d="M4 20v-8.5h5.5"/><path d="M14.5 14.5H20V20"/><path d="M3 20h18"/>',
bell:'<path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15Z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
settings:'<path d="M4 7h8M18 7h2M4 17h2M12 17h8"/><circle cx="15" cy="7" r="2.5"/><circle cx="9" cy="17" r="2.5"/>',
single:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.8 3.1-6 7-6s7 2.2 7 6"/>',
bot:'<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 8V4.5M9.5 13h.01M14.5 13h.01M10 16h4M2.5 12.5v3M21.5 12.5v3"/>',
online:'<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.3 3.8 5.1 3.8 8.5s-1.2 6.2-3.8 8.5c-2.6-2.3-3.8-5.1-3.8-8.5s1.2-6.2 3.8-8.5Z"/>',
tournament:'<path d="M8 4h8v5a4 4 0 0 1-8 0Z"/><path d="M8 6H5v1.5a3 3 0 0 0 3 3M16 6h3v1.5a3 3 0 0 1-3 3M12 13v3.5M8.5 20h7M10 16.5h4V20h-4Z"/>',
arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
chevron:'<path d="m9 6 6 6-6 6"/>',
close:'<path d="m6 6 12 12M18 6 6 18"/>',
search:'<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
help:'<circle cx="12" cy="12" r="8.5"/><path d="M9.7 9.5a2.4 2.4 0 1 1 3.5 2.1c-.8.5-1.2 1-1.2 1.9M12 16.5h.01"/>',
message:'<path d="M4 5h16v11H9l-5 4Z"/>'
};
const svg=name=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+icons[name]+'</svg>';
const NAV_ITEMS=[
  {key:'home',label:'ANA SAYFA',name:'Ana sayfa'},
  {key:'friends',label:'SOSYAL',name:'Sosyal'},
  {key:'play',label:'OYNA',name:'Oyna',primary:true},
  {key:'lobby',label:'LOBİ',name:'Lobi'},
  {key:'leaderboard',label:'LİDERLİK',name:'Liderlik'}
];
/* One markup for every screen. `data-action` is the home contract, `data-nx-nav` the side-game one. */
function navMarkup(active=''){
  return '<div class="nx-nav-inner">'+NAV_ITEMS.map(i=>'<a class="nx-nav-item nx-hotspot'+(i.primary?' nx-nav-primary':'')+'" role="button" tabindex="0" data-action="'+i.key+'" data-nx-nav="'+i.key+'" aria-label="'+i.name+'"'+(i.key===active?' aria-current="page"':'')+'><span class="nx-nav-icon">'+svg(i.key)+(i.key==='friends'?'<span class="nx-nav-badge" hidden></span>':'')+'</span><span class="nx-nav-label">'+i.label+'</span></a>').join('')+'</div>';
}
function setNavBadge(nav,count){
  const item=nav.querySelector('[data-nx-nav="friends"]'),badge=item?.querySelector('.nx-nav-badge');if(!badge)return;
  const text=count>99?'99+':String(count);
  if(count>0){if(badge.textContent!==text)badge.textContent=text;badge.hidden=false;item.setAttribute('aria-label','Sosyal, '+count+' bildirim')}
  else{badge.hidden=true;item.setAttribute('aria-label','Sosyal')}
}
function bindNavFeedback(nav){
  const pulse=t=>{t.classList.add('nx-pressed');clearTimeout(t.nxPulseTimer);t.nxPulseTimer=setTimeout(()=>t.classList.remove('nx-pressed'),220)};
  nav.addEventListener('pointerdown',e=>{const t=e.target.closest('.nx-nav-item');if(t)pulse(t)});
  nav.addEventListener('pointercancel',()=>nav.querySelectorAll('.nx-pressed').forEach(n=>n.classList.remove('nx-pressed')));
  nav.addEventListener('keydown',e=>{if(e.repeat||(e.key!==' '&&e.key!=='Enter'))return;const t=e.target.closest('.nx-nav-item');if(t&&!t.getAttribute('href')){e.preventDefault();t.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))}});
}
/* The social core keeps the pending request + invitation total on its launch button. */
function watchSocialCount(apply){
  let observer=null;
  const read=()=>apply(Number(document.querySelector('.nx-social-launch')?.dataset.count||0));
  const attach=()=>{const b=document.querySelector('.nx-social-launch');if(!b)return false;observer=new MutationObserver(read);observer.observe(b,{attributes:true,attributeFilter:['data-count']});read();return true};
  if(attach())return;
  let tries=0;const timer=setInterval(()=>{if(attach()||++tries>150)clearInterval(timer)},200);
}

let dialog=null,previousFocus=null;
const social=async()=>{for(let i=0;i<80;i++){if(window.NEON_SOCIAL?.open)return window.NEON_SOCIAL;await new Promise(r=>setTimeout(r,75))}return null};
function flash(msg){let n=document.getElementById('nx-arcade-feedback');if(!n){n=document.createElement('div');n.id='nx-arcade-feedback';n.setAttribute('role','status');document.body.append(n)}n.textContent=msg;clearTimeout(n._timer);n._timer=setTimeout(()=>n.remove(),3600)}
async function choose(mode,choice){
  closeChoice();const api=await social();if(!api){flash('Sosyal bağlantı yüklenemedi. İnternet bağlantını kontrol et.');return}
  if(typeof api.chooseMode==='function'){try{await api.chooseMode(mode,choice)}catch(e){flash(e?.message||'İşlem başlatılamadı.')}return}
  // Only used when social core has not yet adopted the direct mode bridge.
  if(choice==='friends'){api.open('party');return}
  api.open('play');let v=document.querySelector('.nx-social-shade #nxMode');if(v){v.value=mode;document.querySelector('.nx-social-shade [data-act="match"]')?.click()}else flash('Mod seçimi şu anda açılamıyor.');
}
function ensureChoice(){if(dialog)return dialog;dialog=document.createElement('div');dialog.className='nx-arcade-choice-shade';dialog.innerHTML='<section class="nx-arcade-choice" role="dialog" aria-modal="true" aria-label="Online oyun seçimi"><button type="button" class="nx-arcade-choice-close" aria-label="Kapat">×</button><div class="nx-arcade-choice-eyebrow">NEON XI · ONLINE</div><h2>OYUN MODUNU SEÇ</h2><button class="nx-arcade-option" type="button" data-nx-option="friends">'+svg('friends')+'<span>ARKADAŞLARINLA OYNA<small>Partini aç, arkadaşlarını davet et.</small></span></button><button class="nx-arcade-option" type="button" data-nx-option="match">'+svg('search')+'<span>RAKİP ARA<small>Uygun oyuncularla otomatik eşleş.</small></span></button><p class="nx-arcade-choice-note">Oda kodu girmen gerekmez.</p></section>';
 dialog.addEventListener('click',e=>{if(e.target===dialog||e.target.closest('.nx-arcade-choice-close'))closeChoice();const b=e.target.closest('[data-nx-option]');if(b)choose(dialog.dataset.mode||'draft',b.dataset.nxOption)});document.body.append(dialog);return dialog}
function openChoice(mode='draft'){previousFocus=document.activeElement;const d=ensureChoice();d.dataset.mode=mode;void d.offsetWidth;d.classList.add('open');d.querySelector('[data-nx-option="friends"]').focus({preventScroll:true})}
function closeChoice(){if(!dialog?.classList.contains('open'))return;dialog.classList.remove('open');if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true})}
function openSettings(){location.href=paths.home+'?nxOpenSettings=1'}

function addFooter(){
 if(atRoot||document.getElementById('nx-arcade-footer'))return;
 const nav=document.createElement('nav');
 nav.id='nx-arcade-footer';nav.className='nx-nav nx-arcade-footer';nav.setAttribute('aria-label','NEON XI ana navigasyon');
 nav.innerHTML=navMarkup('');
 const home=nav.querySelector('[data-nx-nav="home"]');home.setAttribute('href',paths.home);home.removeAttribute('role');
 bindNavFeedback(nav);
 const tabs={friends:'friends',play:'play',lobby:'party',leaderboard:'leaderboard'};
 nav.addEventListener('click',async e=>{
  const a=e.target.closest('[data-nx-nav]');if(!a)return;
  const tab=tabs[a.dataset.nxNav];if(!tab)return;
  e.preventDefault();const api=await social();
  if(api)api.open(tab);else flash('Sosyal bağlantı yüklenemedi. İnternet bağlantını kontrol et.');
 });
 document.body.classList.add('nx-arcade-has-footer');document.body.append(nav);
 watchSocialCount(count=>setNavBadge(nav,count));
}

document.addEventListener('click',e=>{if(!atRoot)return;const btn=e.target.closest('#bootHome.nx-approved-home-v1 [data-action="online"]');if(btn){e.preventDefault();e.stopImmediatePropagation();openChoice('draft')}},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dialog?.classList.contains('open')){e.preventDefault();closeChoice()}});
async function settingsDeepLink(){if(!atRoot||new URLSearchParams(location.search).get('nxOpenSettings')!=='1')return;for(let i=0;i<100;i++){const b=document.querySelector('#bootHome.nx-approved-home-v1 [data-action="settings"]');if(b){history.replaceState(null,'',paths.home);b.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return}await new Promise(r=>setTimeout(r,100))}flash('Ayarlar yüklenemedi.')}
window.NEON_ARCADE_UI={openChoice,choose,openSettings,flash,icons,svg,navItems:NAV_ITEMS,navMarkup,setNavBadge,bindNavFeedback,watchSocialCount};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{addFooter();settingsDeepLink()},{once:true});else{addFooter();settingsDeepLink()}
})();
