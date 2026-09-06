import {getApp,getApps} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {getDatabase,get,onValue,ref,remove,serverTimestamp,set,update} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js';

const VERSION='20260906-social-drawer-v1';
const MODES={
  draft:{label:'NEON XI Draft',code:'alpha6',matchable:true},
  xox:{label:'Futbol XOX',code:'numeric4',matchable:true},
  twin:{label:'Kariyer İkizi',code:'numeric4',matchable:true},
  imposter:{label:'Futbol Imposter',code:'alpha5',minParty:3,maxParty:12}
};
const state={
  auth:null,db:null,user:null,profile:null,
  friends:{},requests:{},invites:{},presence:{},
  partyId:'',party:null,tab:'friends',menuUid:'',
  offs:[],presenceOffs:[],partyOff:null,originalOpen:null,patched:false
};

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/[^a-z0-9_]/g,'').slice(0,20);
const connections=p=>Object.keys(p?.connections||{}).length;
const codeFor=mode=>MODES[mode]?.code==='numeric4'?String(Math.floor(1000+Math.random()*9000)):[...Array(MODES[mode]?.code==='alpha5'?5:6)].map(()=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*32)]).join('');

function addStyle(){
  if(document.getElementById('nx-social-drawer-style'))return;
  const s=document.createElement('style');
  s.id='nx-social-drawer-style';
  s.textContent=`
  #bootHome.nx-approved-home-v1 .nx-social-drawer-layer{position:absolute;inset:0;z-index:120;visibility:hidden;opacity:0;pointer-events:none;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;transition:opacity .18s ease,visibility 0s linear .18s}
  #bootHome.nx-approved-home-v1 .nx-social-drawer-layer.open{visibility:visible;opacity:1;pointer-events:auto;transition-delay:0s}
  #bootHome.nx-approved-home-v1 .nx-social-drawer-scrim{position:absolute;inset:0;background:rgba(0,7,4,.16);backdrop-filter:blur(2.2px);-webkit-backdrop-filter:blur(2.2px)}
  #bootHome.nx-approved-home-v1 .nx-social-drawer{position:absolute;z-index:2;left:0;top:11.7%;bottom:8.8%;width:min(56%,430px);min-width:238px;display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(180,255,28,.62);border-left:0;border-radius:0 22px 22px 0;background:linear-gradient(180deg,#07130e 0%,#03100b 54%,#020a07 100%);color:#f4fff6;box-shadow:18px 16px 54px rgba(0,0,0,.66),0 0 32px rgba(177,255,25,.11),inset -1px 0 0 rgba(214,255,103,.09);transform:translateX(-103%);transition:transform .28s cubic-bezier(.2,.78,.2,1)}
  #bootHome.nx-approved-home-v1 .nx-social-drawer-layer.open .nx-social-drawer{transform:translateX(0)}
  #bootHome.nx-approved-home-v1 .nx-drawer-head{display:grid;grid-template-columns:34px 1fr 34px;align-items:center;gap:9px;padding:14px 13px 10px;border-bottom:1px solid rgba(182,255,32,.16);background:linear-gradient(180deg,rgba(174,255,32,.045),transparent)}
  #bootHome.nx-approved-home-v1 .nx-drawer-head-icon{display:grid;place-items:center;width:32px;height:32px;border:1px solid rgba(183,255,35,.42);border-radius:10px;background:rgba(182,255,29,.07);color:#c9ff42;box-shadow:0 0 15px rgba(187,255,35,.10)}
  #bootHome.nx-approved-home-v1 .nx-drawer-head-icon svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8}
  #bootHome.nx-approved-home-v1 .nx-drawer-title{font-size:13px;font-weight:950;letter-spacing:.10em;color:#dcff78;text-shadow:0 0 12px rgba(188,255,33,.16)}
  #bootHome.nx-approved-home-v1 .nx-drawer-close{display:grid;place-items:center;width:32px;height:32px;padding:0;border:1px solid rgba(255,255,255,.10);border-radius:10px;background:rgba(255,255,255,.035);color:#a8c3b1;font-size:21px;line-height:1;cursor:pointer}
  #bootHome.nx-approved-home-v1 .nx-drawer-tabs{display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:10px 12px 7px}
  #bootHome.nx-approved-home-v1 .nx-drawer-tab{position:relative;min-height:34px;border:1px solid rgba(183,255,35,.20);border-radius:10px;background:rgba(182,255,29,.035);color:#89a899;font-size:9px;font-weight:950;letter-spacing:.07em;cursor:pointer}
  #bootHome.nx-approved-home-v1 .nx-drawer-tab.active{border-color:rgba(187,255,37,.66);background:linear-gradient(180deg,rgba(180,255,31,.16),rgba(180,255,31,.055));color:#dfff73;box-shadow:inset 0 0 15px rgba(185,255,34,.055)}
  #bootHome.nx-approved-home-v1 .nx-drawer-tab-count{display:inline-grid;place-items:center;min-width:16px;height:16px;margin-left:4px;padding:0 4px;border-radius:999px;background:#ff4e70;color:#fff;font-size:8px}
  #bootHome.nx-approved-home-v1 .nx-drawer-body{flex:1;overflow:auto;padding:3px 12px 15px;scrollbar-width:thin;scrollbar-color:rgba(184,255,35,.24) transparent}
  #bootHome.nx-approved-home-v1 .nx-drawer-search{display:grid;grid-template-columns:minmax(0,1fr) 38px;gap:7px;margin:5px 0 10px}
  #bootHome.nx-approved-home-v1 .nx-drawer-search input{min-width:0;height:38px;border:1px solid rgba(187,255,37,.20);border-radius:10px;background:#020906;color:#eaffee;padding:0 11px;font-size:10px;outline:none}
  #bootHome.nx-approved-home-v1 .nx-drawer-search input:focus{border-color:rgba(188,255,38,.56);box-shadow:0 0 0 2px rgba(185,255,36,.05)}
  #bootHome.nx-approved-home-v1 .nx-drawer-search button{height:38px;border:1px solid rgba(188,255,39,.43);border-radius:10px;background:rgba(185,255,35,.08);color:#d9ff70;font-weight:950;font-size:18px;cursor:pointer}
  #bootHome.nx-approved-home-v1 .nx-drawer-find-result{margin:-3px 0 9px}
  #bootHome.nx-approved-home-v1 .nx-drawer-section{margin-top:10px}
  #bootHome.nx-approved-home-v1 .nx-drawer-section-title{display:flex;align-items:center;gap:7px;padding:0 2px 6px;color:#a9d3b7;font-size:8px;font-weight:950;letter-spacing:.10em;text-transform:uppercase}
  #bootHome.nx-approved-home-v1 .nx-drawer-dot{width:7px;height:7px;border-radius:50%;background:#68766e;box-shadow:0 0 0 3px rgba(112,127,118,.08)}
  #bootHome.nx-approved-home-v1 .nx-drawer-dot.online{background:#4cf47d;box-shadow:0 0 0 3px rgba(76,244,125,.10),0 0 10px rgba(76,244,125,.48)}
  #bootHome.nx-approved-home-v1 .nx-drawer-list{display:grid;gap:6px}
  #bootHome.nx-approved-home-v1 .nx-drawer-friend-row,#bootHome.nx-approved-home-v1 .nx-drawer-invite{position:relative;border:1px solid rgba(255,255,255,.065);border-radius:11px;background:linear-gradient(180deg,rgba(255,255,255,.024),rgba(255,255,255,.012));overflow:visible}
  #bootHome.nx-approved-home-v1 .nx-drawer-friend-main{display:grid;grid-template-columns:32px minmax(0,1fr) 31px;align-items:center;gap:8px;padding:8px;cursor:pointer}
  #bootHome.nx-approved-home-v1 .nx-drawer-avatar{display:grid;place-items:center;width:32px;height:32px;border:1px solid rgba(183,255,35,.26);border-radius:9px;background:radial-gradient(circle at 50% 35%,rgba(194,255,70,.18),rgba(54,82,57,.08) 55%,rgba(1,8,5,.25));color:#caff48;font-size:11px;font-weight:950;text-transform:uppercase}
  #bootHome.nx-approved-home-v1 .nx-drawer-friend-copy{min-width:0;display:grid;gap:2px}
  #bootHome.nx-approved-home-v1 .nx-drawer-friend-copy b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#effff2;font-size:10px;font-weight:900}
  #bootHome.nx-approved-home-v1 .nx-drawer-presence{display:flex;align-items:center;gap:5px;color:#728a7c;font-size:8px;font-weight:750}
  #bootHome.nx-approved-home-v1 .nx-drawer-presence.online{color:#70dc8f}
  #bootHome.nx-approved-home-v1 .nx-drawer-more{width:31px;height:31px;padding:0;border:0;background:transparent;color:#8aa497;font-size:18px;letter-spacing:2px;cursor:pointer}
  #bootHome.nx-approved-home-v1 .nx-drawer-menu{display:grid;gap:5px;padding:0 8px 8px;animation:nxDrawerMenu .14s ease both}
  @keyframes nxDrawerMenu{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}
  #bootHome.nx-approved-home-v1 .nx-drawer-action{min-height:33px;border:1px solid rgba(184,255,35,.22);border-radius:9px;background:rgba(184,255,35,.045);color:#d9ff72;font-size:8px;font-weight:950;letter-spacing:.04em;cursor:pointer}
  #bootHome.nx-approved-home-v1 .nx-drawer-action.danger{border-color:rgba(255,75,111,.28);background:rgba(255,75,111,.035);color:#ff8ca4}
  #bootHome.nx-approved-home-v1 .nx-drawer-confirm{display:grid;grid-template-columns:1fr 1fr;gap:5px;padding:0 8px 8px}
  #bootHome.nx-approved-home-v1 .nx-drawer-confirm p{grid-column:1/-1;margin:1px 0 3px;color:#ffadbd;font-size:8px;line-height:1.35}
  #bootHome.nx-approved-home-v1 .nx-drawer-empty{padding:17px 8px;text-align:center;color:#6f887a;font-size:9px;border:1px dashed rgba(255,255,255,.07);border-radius:10px}
  #bootHome.nx-approved-home-v1 .nx-drawer-party{margin:4px 0 10px;padding:10px;border:1px solid rgba(184,255,35,.30);border-radius:12px;background:linear-gradient(135deg,rgba(180,255,31,.075),rgba(5,18,12,.46));box-shadow:inset 0 0 22px rgba(182,255,31,.025)}
  #bootHome.nx-approved-home-v1 .nx-drawer-party-top{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:7px}
  #bootHome.nx-approved-home-v1 .nx-drawer-party-top strong{color:#dfff72;font-size:8px;letter-spacing:.10em}
  #bootHome.nx-approved-home-v1 .nx-drawer-party-top span{padding:3px 6px;border:1px solid rgba(185,255,35,.26);border-radius:999px;color:#9ec5aa;font-size:7px;font-weight:900}
  #bootHome.nx-approved-home-v1 .nx-drawer-party-members{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:7px}
  #bootHome.nx-approved-home-v1 .nx-drawer-party-member{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:4px 6px;border-radius:7px;background:rgba(255,255,255,.035);color:#c9d9ce;font-size:7px}
  #bootHome.nx-approved-home-v1 .nx-drawer-party-controls{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;margin-top:7px}
  #bootHome.nx-approved-home-v1 .nx-drawer-party-controls select{min-width:0;height:32px;border:1px solid rgba(184,255,35,.20);border-radius:9px;background:#020906;color:#dffff0;padding:0 7px;font-size:8px}
  #bootHome.nx-approved-home-v1 .nx-drawer-party-controls button{min-height:32px;border:1px solid #baff18;border-radius:9px;background:#baff18;color:#071005;padding:0 8px;font-size:7px;font-weight:950;cursor:pointer}
  #bootHome.nx-approved-home-v1 .nx-drawer-party-leave{width:100%;min-height:29px;margin-top:6px;border:1px solid rgba(255,79,112,.22);border-radius:8px;background:rgba(255,79,112,.025);color:#f28aa0;font-size:7px;font-weight:900;cursor:pointer}
  #bootHome.nx-approved-home-v1 .nx-drawer-invite{padding:9px}
  #bootHome.nx-approved-home-v1 .nx-drawer-invite b{display:block;color:#effff2;font-size:9px;margin-bottom:2px}
  #bootHome.nx-approved-home-v1 .nx-drawer-invite p{margin:0 0 7px;color:#809789;font-size:8px;line-height:1.35}
  #bootHome.nx-approved-home-v1 .nx-drawer-invite-actions{display:grid;grid-template-columns:1fr 1fr;gap:5px}
  #bootHome.nx-approved-home-v1 .nx-drawer-invite-actions button{min-height:31px;border:1px solid rgba(185,255,35,.24);border-radius:8px;background:rgba(185,255,35,.045);color:#ceff62;font-size:7px;font-weight:950;cursor:pointer}
  #bootHome.nx-approved-home-v1 .nx-drawer-invite-actions button.primary{background:#baff18;border-color:#baff18;color:#071005}
  #bootHome.nx-approved-home-v1 .nx-drawer-status{position:sticky;bottom:0;margin:8px -3px -9px;padding:7px 9px;border:1px solid rgba(185,255,35,.20);border-radius:9px;background:rgba(2,10,7,.96);color:#a9c7b3;font-size:8px;line-height:1.3;display:none}
  #bootHome.nx-approved-home-v1 .nx-drawer-status.show{display:block}.nx-drawer-status.error{border-color:rgba(255,77,112,.28)!important;color:#ff9bae!important}
  #bootHome.nx-approved-home-v1 .nx-drawer-find-card{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:6px;padding:8px;border:1px solid rgba(184,255,35,.16);border-radius:9px;background:rgba(255,255,255,.02)}
  #bootHome.nx-approved-home-v1 .nx-drawer-find-card b{min-width:0;overflow:hidden;text-overflow:ellipsis;color:#eaffee;font-size:9px}.nx-drawer-find-card button{min-height:29px;border:1px solid #baff18;border-radius:8px;background:#baff18;color:#071005;font-size:7px;font-weight:950}
  @media(max-width:560px){#bootHome.nx-approved-home-v1 .nx-social-drawer{top:11.5%;bottom:8.7%;width:61%;min-width:232px;border-radius:0 18px 18px 0}.nx-drawer-head{padding-top:11px!important}.nx-drawer-title{font-size:11px!important}}
  `;
  document.head.appendChild(s);
}

function canvas(){return document.querySelector('#bootHome.nx-approved-home-v1 .nx-approved-canvas')}
function layer(){return document.querySelector('#bootHome.nx-approved-home-v1 .nx-social-drawer-layer')}
function isOpen(){return layer()?.classList.contains('open')}

function ensureShell(){
  const c=canvas();if(!c)return null;
  let l=c.querySelector('.nx-social-drawer-layer');
  if(l)return l;
  l=document.createElement('div');l.className='nx-social-drawer-layer';l.innerHTML=`
    <div class="nx-social-drawer-scrim" data-nx-drawer-close></div>
    <aside class="nx-social-drawer" role="dialog" aria-modal="true" aria-label="NEON XI Sosyal">
      <div class="nx-drawer-head">
        <span class="nx-drawer-head-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
        <strong class="nx-drawer-title">SOSYAL</strong>
        <button class="nx-drawer-close" type="button" data-nx-drawer-close aria-label="Kapat">×</button>
      </div>
      <div class="nx-drawer-tabs">
        <button class="nx-drawer-tab" type="button" data-nx-drawer-tab="friends">ARKADAŞLAR</button>
        <button class="nx-drawer-tab" type="button" data-nx-drawer-tab="invites">DAVETLER</button>
      </div>
      <div class="nx-drawer-body"></div>
    </aside>`;
  c.appendChild(l);
  l.querySelectorAll('[data-nx-drawer-close]').forEach(x=>x.addEventListener('click',closeDrawer));
  l.querySelectorAll('[data-nx-drawer-tab]').forEach(x=>x.addEventListener('click',()=>{state.tab=x.dataset.nxDrawerTab;state.menuUid='';render()}));
  l.querySelector('.nx-social-drawer').addEventListener('click',e=>e.stopPropagation());
  return l;
}

function status(text,error=false){
  const el=layer()?.querySelector('.nx-drawer-status');if(!el)return;
  el.textContent=text;el.classList.toggle('error',Boolean(error));el.classList.add('show');
  clearTimeout(status.timer);status.timer=setTimeout(()=>el.classList.remove('show'),3300);
}

function partyMarkup(){
  if(!state.party||!state.partyId)return '';
  const members=Object.entries(state.party.members||{}),leader=state.party.leaderUid===state.user?.uid;
  const modeOptions=Object.entries(MODES).map(([k,v])=>`<option value="${k}">${esc(v.label)}</option>`).join('');
  return `<section class="nx-drawer-party">
    <div class="nx-drawer-party-top"><strong>AKTİF PARTİ</strong><span>${members.length} OYUNCU · ${leader?'LİDER':'ÜYE'}</span></div>
    <div class="nx-drawer-party-members">${members.map(([uid,x])=>`<span class="nx-drawer-party-member">@${esc(x?.username||'Oyuncu')}${uid===state.party.leaderUid?' · lider':''}</span>`).join('')}</div>
    ${leader?`<div class="nx-drawer-party-controls"><select data-nx-party-mode>${modeOptions}</select><button type="button" data-nx-party-launch>OYUNU BAŞLAT</button></div>`:'<div style="color:#7f9989;font-size:7px;line-height:1.35">Parti lideri oyun seçtiğinde herkes otomatik olarak aynı oyuna alınır.</div>'}
    <button class="nx-drawer-party-leave" type="button" data-nx-party-leave>PARTİDEN AYRIL</button>
  </section>`;
}

function friendRow(uid,x,online){
  const username=x?.username||'Oyuncu',initial=(username.trim()[0]||'N').toUpperCase(),menu=state.menuUid===uid;
  return `<div class="nx-drawer-friend-row" data-nx-friend-row="${esc(uid)}">
    <div class="nx-drawer-friend-main">
      <span class="nx-drawer-avatar">${esc(initial)}</span>
      <span class="nx-drawer-friend-copy"><b>@${esc(username)}</b><span class="nx-drawer-presence ${online?'online':''}"><i class="nx-drawer-dot ${online?'online':''}"></i>${online?'Çevrimiçi':'Çevrimdışı'}</span></span>
      <button class="nx-drawer-more" type="button" data-nx-friend-more="${esc(uid)}" aria-label="Arkadaş işlemleri">•••</button>
    </div>
    ${menu?`<div class="nx-drawer-menu" data-nx-friend-menu="${esc(uid)}"><button class="nx-drawer-action" type="button" data-nx-party-invite="${esc(uid)}">PARTİYE DAVET ET</button><button class="nx-drawer-action danger" type="button" data-nx-friend-remove-prompt="${esc(uid)}">ARKADAŞLIKTAN ÇIKAR</button></div>`:''}
  </div>`;
}

function renderFriends(body){
  const all=Object.entries(state.friends||{}).map(([uid,x])=>({uid,x,online:connections(state.presence[uid])>0}));
  const online=all.filter(x=>x.online).sort((a,b)=>(a.x.username||'').localeCompare(b.x.username||'','tr'));
  const offline=all.filter(x=>!x.online).sort((a,b)=>(a.x.username||'').localeCompare(b.x.username||'','tr'));
  body.innerHTML=`${partyMarkup()}
    <div class="nx-drawer-search"><input data-nx-find maxlength="20" autocomplete="off" placeholder="Arkadaş ara..."><button type="button" data-nx-find-btn aria-label="Arkadaş ara ve ekle">＋</button></div>
    <div class="nx-drawer-find-result"></div>
    <section class="nx-drawer-section"><div class="nx-drawer-section-title"><i class="nx-drawer-dot online"></i>ÇEVRİMİÇİ (${online.length})</div><div class="nx-drawer-list">${online.length?online.map(v=>friendRow(v.uid,v.x,true)).join(''):'<div class="nx-drawer-empty">Şu anda çevrimiçi arkadaş yok.</div>'}</div></section>
    <section class="nx-drawer-section"><div class="nx-drawer-section-title"><i class="nx-drawer-dot"></i>ÇEVRİMDIŞI (${offline.length})</div><div class="nx-drawer-list">${offline.length?offline.map(v=>friendRow(v.uid,v.x,false)).join(''):'<div class="nx-drawer-empty">Çevrimdışı arkadaş yok.</div>'}</div></section>
    <div class="nx-drawer-status" role="status"></div>`;
  const input=body.querySelector('[data-nx-find]');
  body.querySelector('[data-nx-find-btn]')?.addEventListener('click',()=>findPlayer(input?.value||''));
  input?.addEventListener('keydown',e=>{if(e.key==='Enter')findPlayer(input.value)});
  bindShared(body);
}

function renderInvites(body){
  const p=Object.entries(state.invites||{}),f=Object.entries(state.requests||{});
  body.innerHTML=`${partyMarkup()}
    <section class="nx-drawer-section"><div class="nx-drawer-section-title">PARTİ DAVETLERİ (${p.length})</div><div class="nx-drawer-list">${p.length?p.map(([id,x])=>`<div class="nx-drawer-invite"><b>@${esc(x?.fromName||'Oyuncu')}</b><p>Seni partisine davet etti.</p><div class="nx-drawer-invite-actions"><button class="primary" type="button" data-nx-party-accept="${esc(id)}" ${state.party?'disabled':''}>KABUL</button><button type="button" data-nx-party-reject="${esc(id)}">RED</button></div>${state.party?'<p style="margin-top:6px;color:#d6a477">Başka bir daveti kabul etmek için önce aktif partiden ayrıl.</p>':''}</div>`).join(''):'<div class="nx-drawer-empty">Bekleyen parti daveti yok.</div>'}</div></section>
    <section class="nx-drawer-section"><div class="nx-drawer-section-title">ARKADAŞLIK İSTEKLERİ (${f.length})</div><div class="nx-drawer-list">${f.length?f.map(([uid,x])=>`<div class="nx-drawer-invite"><b>@${esc(x?.username||'Oyuncu')}</b><p>Sana arkadaşlık isteği gönderdi.</p><div class="nx-drawer-invite-actions"><button class="primary" type="button" data-nx-friend-accept="${esc(uid)}">KABUL</button><button type="button" data-nx-friend-reject="${esc(uid)}">RED</button></div></div>`).join(''):'<div class="nx-drawer-empty">Bekleyen arkadaşlık isteği yok.</div>'}</div></section>
    <div class="nx-drawer-status" role="status"></div>`;
  bindShared(body);
  body.querySelectorAll('[data-nx-party-accept]').forEach(b=>b.addEventListener('click',()=>acceptParty(b.dataset.nxPartyAccept).catch(e=>status(e?.message||'Partiye katılınamadı.',true))));
  body.querySelectorAll('[data-nx-party-reject]').forEach(b=>b.addEventListener('click',()=>remove(ref(state.db,`social/partyInvites/${state.user.uid}/${b.dataset.nxPartyReject}`)).catch(e=>status(e?.message||'Davet reddedilemedi.',true))));
  body.querySelectorAll('[data-nx-friend-accept]').forEach(b=>b.addEventListener('click',()=>acceptFriend(b.dataset.nxFriendAccept).catch(e=>status(e?.message||'İstek kabul edilemedi.',true))));
  body.querySelectorAll('[data-nx-friend-reject]').forEach(b=>b.addEventListener('click',()=>remove(ref(state.db,`social/friendRequests/${state.user.uid}/${b.dataset.nxFriendReject}`)).catch(e=>status(e?.message||'İstek reddedilemedi.',true))));
}

function bindShared(body){
  body.querySelectorAll('[data-nx-friend-row]').forEach(row=>row.querySelector('.nx-drawer-friend-main')?.addEventListener('click',e=>{if(e.target.closest('[data-nx-friend-more]'))return;toggleMenu(row.dataset.nxFriendRow)}));
  body.querySelectorAll('[data-nx-friend-more]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();toggleMenu(b.dataset.nxFriendMore)}));
  body.querySelectorAll('[data-nx-party-invite]').forEach(b=>b.addEventListener('click',()=>inviteFriend(b.dataset.nxPartyInvite).catch(e=>status(e?.message||'Parti daveti gönderilemedi.',true))));
  body.querySelectorAll('[data-nx-friend-remove-prompt]').forEach(b=>b.addEventListener('click',()=>confirmRemove(b.dataset.nxFriendRemovePrompt)));
  body.querySelector('[data-nx-party-leave]')?.addEventListener('click',()=>leaveParty().catch(e=>status(e?.message||'Partiden ayrılamadın.',true)));
  body.querySelector('[data-nx-party-launch]')?.addEventListener('click',()=>launchParty(body.querySelector('[data-nx-party-mode]')?.value||'draft').catch(e=>status(e?.message||'Oyun başlatılamadı.',true)));
}

function render(){
  const l=ensureShell();if(!l)return;
  l.querySelectorAll('[data-nx-drawer-tab]').forEach(x=>{x.classList.toggle('active',x.dataset.nxDrawerTab===state.tab);const old=x.querySelector('.nx-drawer-tab-count');old?.remove();if(x.dataset.nxDrawerTab==='invites'){const n=Object.keys(state.requests||{}).length+Object.keys(state.invites||{}).length;if(n){const badge=document.createElement('span');badge.className='nx-drawer-tab-count';badge.textContent=n>99?'99+':String(n);x.appendChild(badge)}}});
  const body=l.querySelector('.nx-drawer-body');if(state.tab==='invites')renderInvites(body);else renderFriends(body);
}

function toggleMenu(uid){state.menuUid=state.menuUid===uid?'':uid;render()}
function confirmRemove(uid){
  const box=layer()?.querySelector(`[data-nx-friend-menu="${CSS.escape(uid)}"]`);if(!box)return;
  const name=state.friends?.[uid]?.username||'bu oyuncu';
  box.className='nx-drawer-confirm';box.innerHTML=`<p>@${esc(name)} arkadaş listesinden çıkarılsın mı?</p><button class="nx-drawer-action" type="button" data-nx-cancel-remove>VAZGEÇ</button><button class="nx-drawer-action danger" type="button" data-nx-confirm-remove>ÇIKAR</button>`;
  box.querySelector('[data-nx-cancel-remove]').onclick=()=>{state.menuUid='';render()};
  box.querySelector('[data-nx-confirm-remove]').onclick=()=>removeFriend(uid).catch(e=>status(e?.message||'Arkadaş çıkarılamadı.',true));
}

async function findPlayer(raw){
  if(!state.user||!state.profile){openLegacy('friends');return}
  const key=norm(raw),result=layer()?.querySelector('.nx-drawer-find-result');if(!result)return;
  if(key.length<3){result.innerHTML='<div class="nx-drawer-empty">En az 3 karakter yaz.</div>';return}
  const uid=(await get(ref(state.db,`social/usernames/${key}`))).val();
  if(!uid||uid===state.user.uid){result.innerHTML='<div class="nx-drawer-empty">Oyuncu bulunamadı.</div>';return}
  const p=(await get(ref(state.db,`social/profiles/${uid}`))).val(),already=Boolean(state.friends?.[uid]);
  result.innerHTML=`<div class="nx-drawer-find-card"><b>@${esc(p?.username||raw)}</b><button type="button" ${already?'disabled':''}>${already?'ARKADAŞIN':'EKLE'}</button></div>`;
  if(!already)result.querySelector('button').onclick=()=>sendFriend(uid,p?.username||raw).catch(e=>status(e?.message||'Arkadaşlık isteği gönderilemedi.',true));
}
async function sendFriend(uid,username){await set(ref(state.db,`social/friendRequests/${uid}/${state.user.uid}`),{username:state.profile.username,createdAt:serverTimestamp()});status(`@${username} için arkadaşlık isteği gönderildi.`)}
async function acceptFriend(uid){const req=state.requests?.[uid];if(!req)throw new Error('Arkadaşlık isteği artık mevcut değil.');await update(ref(state.db),{[`social/friends/${state.user.uid}/${uid}`]:{username:req.username,since:serverTimestamp()},[`social/friends/${uid}/${state.user.uid}`]:{username:state.profile.username,since:serverTimestamp()},[`social/friendRequests/${state.user.uid}/${uid}`]:null});status(`@${req.username} arkadaşlara eklendi.`)}
async function removeFriend(uid){const name=state.friends?.[uid]?.username||'Oyuncu';await update(ref(state.db),{[`social/friends/${state.user.uid}/${uid}`]:null,[`social/friends/${uid}/${state.user.uid}`]:null});state.menuUid='';status(`@${name} arkadaş listesinden çıkarıldı.`)}

async function currentPartyId(){if(state.partyId)return state.partyId;return String((await get(ref(state.db,`social/userParty/${state.user.uid}`))).val()||'')}
async function createParty(){const id=`p_${state.user.uid.slice(0,8)}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`;await update(ref(state.db),{[`social/parties/${id}`]:{leaderUid:state.user.uid,createdAt:serverTimestamp(),members:{[state.user.uid]:{username:state.profile.username,joinedAt:serverTimestamp()}}},[`social/userParty/${state.user.uid}`]:id});return id}
async function inviteFriend(uid){if(!state.user||!state.profile)throw new Error('Önce oyuncu profiline giriş yap.');let id=await currentPartyId();if(!id)id=await createParty();await set(ref(state.db,`social/partyInvites/${uid}/${id}`),{fromUid:state.user.uid,fromName:state.profile.username,createdAt:serverTimestamp()});state.menuUid='';render();status(`@${state.friends?.[uid]?.username||'Oyuncu'} partiye davet edildi.`)}
async function acceptParty(id){if(state.partyId)throw new Error('Zaten aktif bir partidesin.');const p=(await get(ref(state.db,`social/parties/${id}`))).val();if(!p)throw new Error('Parti artık mevcut değil.');await update(ref(state.db),{[`social/parties/${id}/members/${state.user.uid}`]:{username:state.profile.username,joinedAt:serverTimestamp()},[`social/userParty/${state.user.uid}`]:id,[`social/partyInvites/${state.user.uid}/${id}`]:null});status('Partiye katıldın.');state.tab='friends'}
async function leaveParty(){if(!state.partyId)return;const id=state.partyId,p=state.party||{},members=Object.keys(p.members||{}).filter(uid=>uid!==state.user.uid),changes={[`social/userParty/${state.user.uid}`]:null,[`social/parties/${id}/members/${state.user.uid}`]:null};if(p.leaderUid===state.user.uid&&members.length)changes[`social/parties/${id}/leaderUid`]=members[0];if(!members.length)changes[`social/parties/${id}`]=null;await update(ref(state.db),changes);status('Partiden ayrıldın.')}
async function launchParty(mode){if(!state.party||state.party.leaderUid!==state.user.uid)throw new Error('Oyunu yalnızca parti lideri başlatabilir.');const members=Object.keys(state.party.members||{}),config=MODES[mode];if(config.matchable&&members.length!==2)throw new Error('Bu 1v1 mod için partide tam iki oyuncu olmalı.');if(config.minParty&&members.length<config.minParty)throw new Error(`${config.label} için en az ${config.minParty} oyuncu gerekli.`);if(config.maxParty&&members.length>config.maxParty)throw new Error(`${config.label} en fazla ${config.maxParty} oyuncuyu destekliyor.`);const nonce=`${Date.now()}_${Math.random().toString(36).slice(2,7)}`,launch={mode,nonce,matchId:`p_${state.partyId}_${nonce}`,at:serverTimestamp(),roomCode:codeFor(mode),partySize:members.length,roles:Object.fromEntries(members.map(uid=>[uid,uid===state.party.leaderUid?'host':'guest']))};await set(ref(state.db,`social/parties/${state.partyId}/launch`),launch);status('Oyun başlatılıyor…')}

function openLegacy(tab='friends'){state.originalOpen?.(tab)}
function openDrawer(tab='friends'){
  if(!state.user||!state.profile){openLegacy('friends');return}
  state.tab=tab==='party'||tab==='invites'?'invites':'friends';state.menuUid='';const l=ensureShell();if(!l)return;render();requestAnimationFrame(()=>l.classList.add('open'));document.documentElement.classList.add('nx-social-drawer-open')
}
function closeDrawer(){const l=layer();if(!l)return;l.classList.remove('open');document.documentElement.classList.remove('nx-social-drawer-open');state.menuUid=''}

function bindPresence(){state.presenceOffs.splice(0).forEach(off=>{try{off()}catch{}});state.presence={};for(const uid of Object.keys(state.friends||{}))state.presenceOffs.push(onValue(ref(state.db,`social/presence/${uid}`),s=>{state.presence[uid]=s.val()||{};if(isOpen()&&state.tab==='friends')render()}))}
function clearBindings(){state.offs.splice(0).forEach(off=>{try{off()}catch{}});state.presenceOffs.splice(0).forEach(off=>{try{off()}catch{}});state.partyOff?.();state.partyOff=null;state.party=null;state.partyId=''}
function bindUser(user){
  clearBindings();state.user=user;
  const watch=(path,fn)=>state.offs.push(onValue(ref(state.db,path),fn));
  watch(`social/profiles/${user.uid}`,s=>{state.profile=s.val()||window.NEON_SOCIAL?.profile||null;if(isOpen())render()});
  watch(`social/friends/${user.uid}`,s=>{state.friends=s.val()||{};bindPresence();if(isOpen())render()});
  watch(`social/friendRequests/${user.uid}`,s=>{state.requests=s.val()||{};if(isOpen())render()});
  watch(`social/partyInvites/${user.uid}`,s=>{state.invites=s.val()||{};if(isOpen())render()});
  watch(`social/userParty/${user.uid}`,s=>{state.partyId=String(s.val()||'');state.partyOff?.();state.partyOff=null;state.party=null;if(!state.partyId){if(isOpen())render();return}state.partyOff=onValue(ref(state.db,`social/parties/${state.partyId}`),p=>{state.party=p.val()||null;if(isOpen())render()})});
}

function patchOpen(){
  if(state.patched||!window.NEON_SOCIAL?.open)return;
  state.originalOpen=window.NEON_SOCIAL.open.bind(window.NEON_SOCIAL);
  window.NEON_SOCIAL.open=(tab='play')=>{if(tab==='friends'||tab==='party'||tab==='invites'||tab==='drawer'){openDrawer(tab);return}state.originalOpen(tab)};
  window.NEON_SOCIAL.openDrawer=openDrawer;window.NEON_SOCIAL.closeDrawer=closeDrawer;state.patched=true;
}
function bindHomeClicks(){
  document.addEventListener('click',e=>{
    const home=e.target.closest?.('#bootHome.nx-approved-home-v1');if(!home)return;
    const social=e.target.closest('.h-social,.h-friends');
    if(social){e.preventDefault();e.stopImmediatePropagation();openDrawer('friends');return}
    const badge=e.target.closest('.nx-safe-home-badge');
    if(badge){e.preventDefault();e.stopImmediatePropagation();const count=Object.keys(state.invites||{}).length+Object.keys(state.requests||{}).length;openDrawer(count?'invites':'friends')}
  },true);
}

function boot(){
  addStyle();bindHomeClicks();
  const timer=setInterval(()=>{
    ensureShell();patchOpen();
    if(!getApps().length||state.auth)return;
    state.auth=getAuth(getApp());state.db=getDatabase(getApp());
    onAuthStateChanged(state.auth,user=>{clearBindings();state.user=user;state.profile=window.NEON_SOCIAL?.profile||null;state.friends={};state.requests={};state.invites={};if(user)bindUser(user);else closeDrawer()});
  },100);
  window.addEventListener('beforeunload',()=>clearInterval(timer),{once:true});
}

boot();
