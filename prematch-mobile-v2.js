(()=>{
  'use strict';
  const TITLE='GUC VE TAKTIK KARSILASTIRMASI';
  const SUB='ORTA CIZGI ESITLIGI GOSTERIR';
  const POWER='GUC SENKRONIZASYONU';
  const TACTICS='GENEL TAKTIK SECIMLERI';
  const A='TAKIM A';
  const B='TAKIM B';
  const ROW_LABELS=['GENEL PLAN','HUCUM YONU','SON AKSIYON','GECIS','BLOK VE PRES','SAVUNMA YONU','SAVUNMA TAKTIGI'];
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/İ/g,'I').toUpperCase().replace(/\s+/g,' ').trim();
  const txt=el=>norm(el?.innerText||el?.textContent||'');
  const leaf=(needle,scope=document)=>{
    const n=norm(needle);
    return Array.from(scope.querySelectorAll('*')).find(el=>el.children.length===0 && txt(el).includes(n))||null;
  };
  const countNeedle=(text,needle)=>text.split(needle).length-1;

  function smallestAncestor(start,predicate,stop){
    let node=start;
    while(node && node!==stop && node!==document.body){
      if(predicate(node)) return node;
      node=node.parentElement;
    }
    return null;
  }

  function findRoot(title){
    let node=title;
    while(node && node!==document.body){
      const t=txt(node);
      if(t.includes(TITLE)&&t.includes(POWER)&&t.includes(TACTICS)&&t.includes(A)&&t.includes(B)) return node;
      node=node.parentElement;
    }
    return null;
  }

  function findHeader(title,root){
    let node=title.parentElement||title;
    let best=node;
    while(node && node!==root){
      const t=txt(node);
      if(t.includes(POWER)) break;
      best=node;
      node=node.parentElement;
    }
    return best;
  }

  function findPanelFromLabel(label,root){
    return smallestAncestor(label,node=>{
      const t=txt(node);
      return t.includes(TACTICS)&&t.includes('SAVUNMA TAKTIGI')&&countNeedle(t,TACTICS)===1;
    },root) || label.parentElement;
  }

  function findPowerPanel(powerLabel,root){
    return smallestAncestor(powerLabel,node=>{
      const t=txt(node);
      return t.includes(POWER)&&t.includes('KIMYA')&&t.includes(A)&&t.includes(B)&&!t.includes(TACTICS);
    },root) || powerLabel.parentElement;
  }

  function decorateRow(panel,labelText){
    const l=leaf(labelText,panel);
    if(!l) return;
    let node=l.parentElement;
    let best=node;
    while(node && node!==panel){
      const t=txt(node);
      if(t.length>180 || ROW_LABELS.filter(x=>t.includes(x)).length>1) break;
      best=node;
      node=node.parentElement;
    }
    if(best && best!==panel) best.classList.add('nx-prematch-row');
  }

  function addLogo(header){
    if(header.querySelector('.nx-prematch-logo')) return;
    const img=document.createElement('img');
    img.className='nx-prematch-logo';
    img.src='./assets/neon-xi-logo-outline.png';
    img.alt='NEON XI';
    img.decoding='async';
    img.fetchPriority='high';
    header.prepend(img);
  }

  function ensureBackgroundLayers(root){
    let bg=root.querySelector(':scope > .nx-prematch-bg');
    if(!bg){
      bg=document.createElement('div');
      bg.className='nx-prematch-bg';
      bg.setAttribute('aria-hidden','true');
      root.prepend(bg);
    }

    let overlay=root.querySelector(':scope > .nx-prematch-bg-overlay');
    if(!overlay){
      overlay=document.createElement('div');
      overlay.className='nx-prematch-bg-overlay';
      overlay.setAttribute('aria-hidden','true');
      bg.insertAdjacentElement('afterend',overlay);
    }
  }

  function decorate(){
    const title=leaf(TITLE);
    if(!title) return false;
    const root=findRoot(title);
    if(!root) return false;

    root.classList.add('nx-prematch-v2');
    ensureBackgroundLayers(root);
    if(root.dataset.nxPrematchV2==='3') return true;
    root.dataset.nxPrematchV2='3';

    const header=findHeader(title,root);
    if(header){
      header.classList.add('nx-prematch-header');
      addLogo(header);
    }
    title.classList.add('nx-prematch-title');

    const subtitle=leaf(SUB,header||root);
    if(subtitle) subtitle.classList.add('nx-prematch-subtitle');

    const kicker=Array.from((header||root).querySelectorAll('*')).find(el=>el.children.length===0 && txt(el).includes('MAC ONCESI ANALIZ'));
    if(kicker) kicker.classList.add('nx-prematch-kicker');
    else if(header){
      const k=document.createElement('div');
      k.className='nx-prematch-kicker';
      k.textContent='MAÇ ÖNCESİ ANALİZ';
      const logo=header.querySelector('.nx-prematch-logo');
      logo?.insertAdjacentElement('afterend',k);
    }

    const pLabel=leaf(POWER,root);
    const powerPanel=pLabel&&findPowerPanel(pLabel,root);
    if(powerPanel){
      powerPanel.classList.add('nx-prematch-power');
      pLabel.classList.add('nx-prematch-power-title');
      const eq=leaf('ESIT GUC',powerPanel)||leaf('ESIT',powerPanel);
      if(eq){
        const balance=smallestAncestor(eq,node=>{
          const t=txt(node);
          return t.includes('TAKIM A USTUN')&&t.includes('TAKIM B USTUN');
        },powerPanel);
        if(balance) balance.classList.add('nx-prematch-balance');
      }
    }

    const tacticLabels=Array.from(root.querySelectorAll('*')).filter(el=>el.children.length===0&&txt(el).includes(TACTICS));
    const panels=[];
    tacticLabels.forEach(l=>{
      const panel=findPanelFromLabel(l,root);
      if(!panel || panels.includes(panel)) return;
      const t=txt(panel);
      panel.classList.add('nx-prematch-team-panel');
      if(t.includes(A)&&!t.includes(B)) panel.classList.add('nx-prematch-team-a');
      else if(t.includes(B)&&!t.includes(A)) panel.classList.add('nx-prematch-team-b');
      panels.push(panel);
      ROW_LABELS.forEach(row=>decorateRow(panel,row));
    });

    if(panels.length>=2){
      let parent=panels[0].parentElement;
      while(parent && parent!==root && !panels.every(p=>parent.contains(p))) parent=parent.parentElement;
      if(parent && parent!==root) parent.classList.add('nx-prematch-tactics-grid');
    }
    return true;
  }

  let queued=false;
  const queue=()=>{
    if(queued) return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;decorate();});
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',queue,{once:true});
  else queue();
  const observer=new MutationObserver(queue);
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
  setTimeout(queue,400);
  setTimeout(queue,1200);
})();
