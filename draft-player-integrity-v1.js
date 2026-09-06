(()=>{
  'use strict';

  const VERSION='2026-09-06-v1';
  if(window.NEON_DRAFT_PLAYER_INTEGRITY?.version===VERSION)return;

  const normalize=value=>String(value??'')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/ı/g,'i')
    .replace(/[’'`´]/g,'')
    .replace(/[^a-z0-9]+/g,'');

  const audit={version:VERSION,runs:0,poolSize:0,removedCount:0,duplicates:[]};
  const duplicateKeys=new Set();

  function mergeFormer(target,source){
    if(!target||!source)return;
    const current=normalize(target.club),seen=new Set(),merged=[];
    for(const club of [...(Array.isArray(target.former)?target.former:[]),...(Array.isArray(source.former)?source.former:[])]){
      const clean=String(club||'').trim(),key=normalize(clean);
      if(!clean||!key||key===current||seen.has(key))continue;
      seen.add(key);merged.push(clean);
    }
    if(merged.length)target.former=merged;
  }

  function enforce(){
    audit.runs++;
    try{
      if(typeof PLAYERS==='undefined'||!Array.isArray(PLAYERS))return 0;
      const byId=new Map(),byName=new Map(),kept=[],removed=[];
      for(const player of PLAYERS){
        if(!player||typeof player!=='object'){kept.push(player);continue;}
        const id=String(player.id??'').trim(),nameKey=normalize(player.name);
        const existing=(id&&byId.get(id))||(nameKey&&byName.get(nameKey));
        if(existing){
          mergeFormer(existing,player);
          removed.push({id:player.id??null,name:String(player.name||''),keptId:existing.id??null,keptName:String(existing.name||'')});
          continue;
        }
        kept.push(player);
        if(id)byId.set(id,player);
        if(nameKey)byName.set(nameKey,player);
      }
      if(removed.length){
        PLAYERS.splice(0,PLAYERS.length,...kept);
        try{
          if(typeof state!=='undefined'&&state?.selectedPlayer&&!PLAYERS.some(p=>p?.id===state.selectedPlayer))state.selectedPlayer=null;
        }catch(_){ }
        for(const row of removed){
          const key=`${row.id}|${normalize(row.name)}|${row.keptId}`;
          if(duplicateKeys.has(key))continue;
          duplicateKeys.add(key);audit.duplicates.push(row);
        }
        audit.removedCount=audit.duplicates.length;
        console.warn(`[NEON XI] Draft integrity removed ${removed.length} duplicate player record(s).`,removed);
      }
      audit.poolSize=PLAYERS.length;
      return removed.length;
    }catch(err){
      console.error('[NEON XI] Draft player integrity check failed',err);
      return 0;
    }
  }

  function wrapGlobal(name){
    try{
      const original=globalThis[name];
      if(typeof original!=='function'||original.__nxPlayerIntegrity)return;
      const wrapped=function(...args){enforce();return original.apply(this,args)};
      Object.defineProperty(wrapped,'__nxPlayerIntegrity',{value:true});
      globalThis[name]=wrapped;
    }catch(err){console.warn(`[NEON XI] ${name} integrity wrapper skipped`,err);}
  }

  enforce();
  wrapGlobal('renderPool');
  wrapGlobal('render');

  // Data refresh layers can run just before/after this script. Recheck once the
  // current task is complete, then rely on wrapped render paths afterwards.
  queueMicrotask(()=>{enforce();wrapGlobal('renderPool');wrapGlobal('render');});

  window.NEON_DRAFT_PLAYER_INTEGRITY={...audit,normalize,enforce,get report(){return {...audit,duplicates:audit.duplicates.slice()}}};
})();