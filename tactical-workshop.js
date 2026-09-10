(()=>{
 'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const presets=[
  {name:'Kontrollü pas',general:'Dengeli',transitionPlan:'Topu Güvenceye Al',pressingPlan:'Orta Blok',attackDirection:'Merkezden Oyna',finalAction:'Ceza Sahasına Pasla Gir'},
  {name:'Önde baskı',general:'Hücum Ağırlıklı',transitionPlan:'Hızlı Hücum',pressingPlan:'Önde Baskı',attackDirection:'Dengeli',finalAction:'Dengeli'},
  {name:'Kontra atak',general:'Savunma Ağırlıklı',transitionPlan:'Hızlı Hücum',pressingPlan:'Alçak Blok',attackDirection:'Kanatları Kullan',finalAction:'Dengeli'}
 ];
 function enhance(){
  if(typeof state==='undefined'||state.screen!=='tactics')return;
  const host=document.getElementById('controlBody');if(!host)return;
  host.querySelector('#nxCoach')?.remove();
  const team=state.tacticTeam,tac=state.tactics[team];
  let preview;try{preview=window.NEON_XI_ENGINE_V5?.preview(team)}catch(e){console.warn('Taktik analizi',e)}
  const structure=preview?.structure;
  const members=formation(team).slots.map(s=>player(state.teams[team].slots[s.id])).filter(p=>p&&p.pos!=='GK');
  const discipline=members.reduce((sum,p)=>sum+(Number(details(p).pressingDiscipline)||65),0)/Math.max(1,members.length);
  const condition=Math.round(window.NEON_TACTICAL_LOAD.condition(tac,discipline,90));
  const risks=[];
  if(tac.pressingPlan==='Önde Baskı')risks.push('Yüksek pres erken top kazanımını artırır; son bölümde hız ve karar kalitesi azalır.');
  if(tac.transitionPlan==='Hızlı Hücum')risks.push('Hızlı geçiş daha fazla koşu ister; top kaybında arkada kalan oyuncular önemlidir.');
  if(structure?.cover<2.4)risks.push('Savunma desteği az. Bir orta sahaya daha korumacı görev ver.');
  if(tac.finalAction==='Ortaları Artır'&&structure?.aerial<1)risks.push('Hava topu hedefi az. Pivot santrfor veya ceza sahasına koşu düşün.');
  const box=document.createElement('section');box.id='nxCoach';box.setAttribute('aria-label','Taktik danışmanı');
  box.innerHTML=`<div class="nx-coach-title"><span>TEKNİK EKİP</span><b>Oyun planının karşılığı</b></div><div class="nx-coach-metrics"><div><strong>${Math.round(structure?.tacticalFit||0)}<small>/100</small></strong><span>Plan uyumu</span></div><div><strong>${Math.round(structure?.roleFit||0)}<small>/100</small></strong><span>Görev uyumu</span></div><div><strong>${condition}<small>%</small></strong><span>90′ kondisyon tahmini</span></div></div><p class="nx-coach-note">${risks.map(esc).join(' ')||'Dengeli yük. Oyuncu görevleriyle hücum desteğini ve savunma güvenliğini birlikte kur.'}</p><div class="nx-presets">${presets.map((p,i)=>`<button type="button" data-plan="${i}">${p.name}</button>`).join('')}</div><small>Hazır planlar takım talimatlarını değiştirir. Oyuncu görevleri sende; bu değerler kazanma olasılığı değildir.</small>`;
  host.prepend(box);
  box.querySelectorAll('[data-plan]').forEach(b=>b.onclick=()=>{const {name,...plan}=presets[Number(b.dataset.plan)];Object.assign(tac,plan);state.tacticReady[team]=false;renderTactics()});
  host.querySelectorAll('.choice').forEach(el=>{el.setAttribute('role','button');el.tabIndex=0;el.setAttribute('aria-pressed',String(el.classList.contains('active')));el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click()}}});
  const current=preview?.roles.find(r=>r.playerId===state.teams[team].slots[state.selectedSlot]);
  if(current){const info=document.createElement('p');info.className='nx-role-fit';info.textContent=`Seçili görev uyumu: ${Math.round(current.suitability)}/100 · ${current.role}`;host.querySelector('.playerPanelTop')?.appendChild(info)}
 }
 function install(){
  if(typeof renderTactics!=='function')return;
  const original=renderTactics;renderTactics=function(){const result=original.apply(this,arguments);enhance();return result};
  const search=document.getElementById('searchInput');if(search)search.setAttribute('aria-label','Oyuncu, ülke, kulüp veya lig ara');
 }
 // Loaded after core scripts; other extension scripts finish before the first user action.
 install();
})();
