(()=>{
  const LOGO = "data:image/png;base64,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";
  const css = `
    .paper-logo{display:block;width:min(58%,220px);max-width:220px;height:auto;margin:0 auto 14px;object-fit:contain;filter:drop-shadow(0 0 8px rgba(57,255,136,.34)) drop-shadow(0 0 20px rgba(57,255,136,.18));user-select:none;-webkit-user-drag:none;pointer-events:none}
    .top-paper-front .paper-body{padding:18px 24px 24px}
    @media (hover:hover) and (pointer:fine){
      .peel-wrap{width:min(100%,360px);height:190px;margin-left:auto;margin-right:auto}
      .peel-hit-zone{width:120px;height:120px;cursor:nwse-resize}
      .paper-logo{width:min(54%,240px);max-width:240px}
    }
  `;
  const style=document.createElement('style');
  style.id='neonxi-paper-pc-fix';
  style.textContent=css;
  document.head.appendChild(style);

  function patchPaper(root=document){
    root.querySelectorAll?.('.top-paper-front .paper-body').forEach(body=>{
      if(body.querySelector('.paper-logo')) return;
      const oldIcon=body.querySelector('.paper-icon');
      if(oldIcon) oldIcon.remove();
      const img=document.createElement('img');
      img.className='paper-logo';
      img.alt='NEON XI';
      img.src=LOGO;
      body.insertBefore(img, body.firstChild);
    });
  }

  patchPaper();
  const observer=new MutationObserver(muts=>{
    for(const m of muts){
      for(const n of m.addedNodes){
        if(n.nodeType!==1) continue;
        if(n.matches?.('.top-paper-front .paper-body')) patchPaper(n.parentElement||n);
        else if(n.querySelector?.('.top-paper-front .paper-body')) patchPaper(n);
      }
    }
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
