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
const homeNavIcons={
      home:'<path d="M113 1692L132 1675L150 1692V1712H113Z"/>',
      play:'<path d="M312 1679Q312 1675 316 1678L340 1693Q344 1695 340 1698L316 1712Q312 1715 312 1711Z"/>',
      friends:'<circle cx="519" cy="1685" r="9"/><path d="M533 1679Q544 1676 544 1686Q544 1695 534 1694M504 1714V1708Q505 1698 519 1698Q533 1698 533 1708V1714M540 1700Q550 1703 550 1714"/>',
      settings:'<path d="M718 1675H729L732 1682L739 1683L743 1692L738 1698L739 1705L731 1711L724 1707L717 1711L709 1705L710 1698L705 1692L709 1683L716 1682Z"/><circle cx="724" cy="1693" r="8"/>'
    };
function addFooter(){
 if(atRoot||document.getElementById('nx-arcade-footer'))return;
 const nav=document.createElement('nav');
 nav.id='nx-arcade-footer';nav.className='nx-arcade-footer';nav.setAttribute('aria-label','NEON XI alt menü');
 const homeButton=(action,label,x,w,cx,href)=>`<a class="nx-hotspot" data-nx-nav="${action}" href="${href}" tabindex="0" aria-label="${label}" ${action==='play'?'aria-current="page"':''}><title>${label}</title><rect class="nx-hit" x="${x}" y="1659" width="${w}" height="118" rx="24"/><rect class="nx-outline" x="${x+9}" y="1663" width="${w-18}" height="110" rx="21"/><g class="nx-nav-glyph" aria-hidden="true">${homeNavIcons[action]}</g><text class="nx-nav-label" x="${cx}" y="1750" aria-hidden="true">${label}</text><rect class="nx-nav-marker" x="${cx-26}" y="1778" width="52" height="4" rx="2" aria-hidden="true"/></a>`;
 nav.innerHTML=`<svg class="nx-home-map" xmlns="http://www.w3.org/2000/svg" viewBox="0 1640 853 204" width="853" height="204" role="group" aria-label="NEON XI ana ekran alt menüsü">
 <defs><linearGradient id="nx-arcade-nav-surface" x2="0" y2="1"><stop stop-color="#15242b"/><stop offset="1" stop-color="#0b151c"/></linearGradient></defs>
 <g class="nx-home-nav" role="navigation" aria-label="Ana navigasyon">
 <rect x="29" y="1650" width="797" height="136" rx="42" fill="url(#nx-arcade-nav-surface)" stroke="#9adfff" stroke-width="3" style="filter:drop-shadow(0 0 4px #3dcfff)" aria-hidden="true"/>
 ${homeButton('home','Ana sayfa',43,182,132,paths.home)}
 ${homeButton('play','Oyna',231,182,326,paths.play)}
 ${homeButton('friends','Arkadaşlar',424,194,529,'#friends')}
 ${homeButton('settings','Ayarlar',628,179,724,'#settings')}
 </g></svg>`;
 const setActive=action=>nav.querySelectorAll('[data-nx-nav]').forEach(n=>{if(n.dataset.nxNav===action)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current')});
 const pulse=target=>{target.classList.add('nx-pressed');clearTimeout(target.nxPulseTimer);target.nxPulseTimer=setTimeout(()=>target.classList.remove('nx-pressed'),280)};
 nav.addEventListener('pointerdown',e=>{const target=e.target.closest('.nx-hotspot');if(target)pulse(target)});
 nav.addEventListener('pointercancel',()=>nav.querySelectorAll('.nx-pressed').forEach(n=>n.classList.remove('nx-pressed')));
 nav.addEventListener('click',async e=>{
  const a=e.target.closest('[data-nx-nav]');if(!a)return;pulse(a);
  if(a.dataset.nxNav==='friends'){e.preventDefault();const api=await social();if(api){setActive('friends');api.open('friends')}else flash('Arkadaşlar paneli yüklenemedi.')}
  if(a.dataset.nxNav==='settings'){e.preventDefault();openSettings()}
 });
 nav.addEventListener('keydown',e=>{if(e.key===' '){const a=e.target.closest('[data-nx-nav]');if(a){e.preventDefault();a.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))}}});
 document.body.classList.add('nx-arcade-has-footer');document.body.append(nav);
 const badge=()=>{
  const count=Number(document.querySelector('.nx-social-launch')?.dataset.count||0),a=nav.querySelector('[data-nx-nav="friends"]');
  let b=a.querySelector('.nx-arcade-badge');
  if(count>0){if(!b){b=document.createElementNS('http://www.w3.org/2000/svg','g');b.classList.add('nx-arcade-badge');b.setAttribute('aria-hidden','true');b.innerHTML='<circle cx="559" cy="1673" r="17"/><text x="559" y="1680" text-anchor="middle"></text>';a.append(b)}b.querySelector('text').textContent=count>99?'99+':String(count);a.setAttribute('aria-label','Arkadaşlar, '+count+' bildirim')}
  else{b?.remove();a.setAttribute('aria-label','Arkadaşlar')}
  const socialView=document.querySelector('.nx-social-shade.open .nx-social-view[data-view="friends"].active');
  setActive(socialView?'friends':'play');
 };badge();setInterval(()=>{if(!document.hidden)badge()},1000);
}

document.addEventListener('click',e=>{if(!atRoot)return;const btn=e.target.closest('#bootHome.nx-approved-home-v1 [data-action="online"]');if(btn){e.preventDefault();e.stopImmediatePropagation();openChoice('draft')}},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dialog?.classList.contains('open')){e.preventDefault();closeChoice()}});
async function settingsDeepLink(){if(!atRoot||new URLSearchParams(location.search).get('nxOpenSettings')!=='1')return;for(let i=0;i<100;i++){const b=document.querySelector('#bootHome.nx-approved-home-v1 [data-action="settings"]');if(b){history.replaceState(null,'',paths.home);b.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));return}await new Promise(r=>setTimeout(r,100))}flash('Ayarlar yüklenemedi.')}
window.NEON_ARCADE_UI={openChoice,choose,openSettings};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{addFooter();settingsDeepLink()},{once:true});else{addFooter();settingsDeepLink()}
})();