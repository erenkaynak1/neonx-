// Shared presentation only. Authentication, friendship and party data stay in their existing modules.
const sheet=new URL('./neon-social-presentation.css?v=20260918-1',import.meta.url);
if(!document.querySelector('[data-nx-social-presentation]')){
  const link=document.createElement('link');link.rel='stylesheet';link.href=sheet.href;link.dataset.nxSocialPresentation='';document.head.appendChild(link);
}
// Interface system v2: shared tokens first, then the social skin. Pages that already link them are left alone.
for(const [needle,href] of [['neon-arcade-ui-v1.css','../side-games/neon-arcade-ui-v1.css?v=20261111-home-v2'],['neon-social-skin-v2.css','./neon-social-skin-v2.css?v=20261111-home-v2']]){
  if(document.querySelector(`link[href*="${needle}"]`))continue;
  const link=document.createElement('link');link.rel='stylesheet';link.href=new URL(href,import.meta.url).href;document.head.appendChild(link);
}
export function socialIcon(name){
  const url=new URL(`./icons/${name}.svg`,import.meta.url).href;
  return `<span class="nx-ui-icon" aria-hidden="true" style="--nx-icon:url('${url}')"></span>`;
}
const dialogs=new WeakMap();
export function activateDialog(layer,close){
  if(dialogs.has(layer))return;
  const previous=document.activeElement;
  const focusable=()=>[...layer.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]')].filter(el=>el.getClientRects().length);
  const keydown=e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return}
    if(e.key!=='Tab')return;
    const list=focusable();if(!list.length){e.preventDefault();return}
    const first=list[0],last=list.at(-1);
    if(e.shiftKey&&(document.activeElement===first||!layer.contains(document.activeElement))){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&(document.activeElement===last||!layer.contains(document.activeElement))){e.preventDefault();first.focus()}
  };
  layer.addEventListener('keydown',keydown);
  // A re-render can remove the focused control and drop focus to <body>; Escape and Tab must still reach the dialog.
  const stray=e=>{if((e.key==='Escape'||e.key==='Tab')&&!layer.contains(document.activeElement))keydown(e)};
  document.addEventListener('keydown',stray);
  const timer=requestAnimationFrame(()=>focusable()[0]?.focus({preventScroll:true}));
  dialogs.set(layer,{previous,keydown,stray,timer});
}
export function deactivateDialog(layer){
  const record=dialogs.get(layer);if(!record)return;
  cancelAnimationFrame(record.timer);layer.removeEventListener('keydown',record.keydown);document.removeEventListener('keydown',record.stray);dialogs.delete(layer);
  if(record.previous?.isConnected)record.previous.focus({preventScroll:true});
}
