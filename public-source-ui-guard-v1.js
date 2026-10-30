(()=>{
  'use strict';

  if(window.NEON_PUBLIC_SOURCE_UI_GUARD?.version) return;

  const INTEGRITY_ID='nx-draft-player-integrity-loader';
  if(!window.NEON_DRAFT_PLAYER_INTEGRITY&&!document.getElementById(INTEGRITY_ID)){
    const script=document.createElement('script');
    script.id=INTEGRITY_ID;
    script.src='./draft-player-integrity-v1.js?v=20260906-deep-integrity-v1';
    script.async=false;
    script.onerror=()=>console.error('[NEON XI] Draft player integrity layer could not load.');
    document.head.appendChild(script);
  }

  const SOURCE_RE=/(?:transfermarkt|fm\s*inside|fminside|football\s*manager|futbol\s*manager|\bfm\s*26(?:\.\d+)?\b)/i;
  const POOL_LOADING_RE=/oyuncu\s+havuzu[^\n]{0,60}(?:yükleniyor|yükleniyor\.\.\.|yüklenmekte|hazırlanıyor)/i;
  const ATTRS=['title','aria-label','placeholder','data-tooltip'];

  function shouldRemove(value){
    const text=String(value||'').replace(/\s+/g,' ').trim();
    return Boolean(text&&(SOURCE_RE.test(text)||POOL_LOADING_RE.test(text)));
  }

  function scrubText(node){
    if(!node||node.nodeType!==Node.TEXT_NODE) return;
    if(shouldRemove(node.nodeValue)) node.nodeValue='';
  }

  function scrubElement(el){
    if(!el||el.nodeType!==Node.ELEMENT_NODE) return;
    for(const attr of ATTRS){
      if(el.hasAttribute(attr)&&shouldRemove(el.getAttribute(attr))) el.removeAttribute(attr);
    }
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
    let textNode;
    while((textNode=walker.nextNode())) scrubText(textNode);
  }

  function scrubNode(node){
    if(!node) return;
    if(node.nodeType===Node.TEXT_NODE){scrubText(node);return;}
    if(node.nodeType===Node.ELEMENT_NODE) scrubElement(node);
  }

  function boot(){
    scrubElement(document.body);
    const observer=new MutationObserver(records=>{
      for(const record of records){
        if(record.type==='characterData') scrubText(record.target);
        if(record.type==='attributes') scrubElement(record.target);
        for(const node of record.addedNodes||[]) scrubNode(node);
      }
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:ATTRS});
    window.NEON_PUBLIC_SOURCE_UI_GUARD={version:'2026-09-06-v2',scrub:()=>scrubElement(document.body)};
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
