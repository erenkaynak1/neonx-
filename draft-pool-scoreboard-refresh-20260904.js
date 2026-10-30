(()=>{
  'use strict';

  if(window.NEON_DRAFT_POOL_SCOREBOARD_REFRESH?.version==='2026-09-04-v1') return;

  const normalize=(value)=>{
    try{
      if(typeof normalizePlayerName==='function') return normalizePlayerName(String(value||''));
    }catch(_){ }
    return String(value||'')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[’'`´]/g,'')
      .replace(/[^a-zA-Z0-9]+/g,'')
      .toLowerCase();
  };

  /* ---------------------------------------------------------
     1) Draft opens with NO pre-selected footballer.
     The core renderPool used to force list[0] whenever selection
     was null. Preserve real user selections, but never invent one.
  --------------------------------------------------------- */
  let selectionPatchApplied=false;
  try{
    if(typeof renderPool==='function' && typeof state!=='undefined' && typeof PLAYERS!=='undefined' && Array.isArray(PLAYERS)){
      if(!renderPool.__nxNoAutoSelect){
        const baseRenderPool=renderPool;
        const patchedRenderPool=function(){
          const selectedBefore=state.selectedPlayer;
          const keepSelection=!!selectedBefore && PLAYERS.some((p)=>{
            if(!p || p.id!==selectedBefore || state.drafted?.has?.(p.id)) return false;
            try{
              if(typeof matchFilter==='function' && !matchFilter(p)) return false;
              if(typeof matchSearch==='function' && !matchSearch(p)) return false;
            }catch(_){ }
            return true;
          });

          baseRenderPool();

          if(!keepSelection){
            state.selectedPlayer=null;
            const detail=document.getElementById('selectedDetail');
            if(detail){
              detail.classList.remove('highlight');
              detail.innerHTML='';
            }
            document.querySelectorAll('#draftScreen .playerRow.active').forEach((row)=>row.classList.remove('active'));
          }
        };
        patchedRenderPool.__nxNoAutoSelect=true;
        renderPool=patchedRenderPool;
      }
      state.selectedPlayer=null;
      selectionPatchApplied=true;
    }
  }catch(err){
    console.warn('[NEON XI] no-auto-select patch skipped',err);
  }

  /* ---------------------------------------------------------
     2) Süper Lig expansion — same NEON XI/FMInside rating input
     and the existing makeExtraPlayer positional/style generator.
     Duplicate names are skipped; existing players are club-refreshed.
  --------------------------------------------------------- */
  const SUPER_LIG_SPECS=[
    // Fenerbahçe
    ['nx-sl-fb-ederson','Ederson','GK',1993,'Brezilya','Fenerbahçe','Süper Lig',80,'sweeper'],
    ['nx-sl-fb-ake','Nathan Aké','CB',1995,'Hollanda','Fenerbahçe','Süper Lig',77,'defender'],
    ['nx-sl-fb-skriniar','Milan Škriniar','CB',1995,'Slovakya','Fenerbahçe','Süper Lig',78,'defender'],
    ['nx-sl-fb-semedo','Nélson Semedo','RB',1993,'Portekiz','Fenerbahçe','Süper Lig',72,'balanced'],
    ['nx-sl-fb-mert','Mert Müldür','RB',1999,'Türkiye','Fenerbahçe','Süper Lig',63,'balanced'],
    ['nx-sl-fb-kante',"N'Golo Kanté",'DM',1991,'Fransa','Fenerbahçe','Süper Lig',75,'defender'],
    ['nx-sl-fb-guendouzi','Mattéo Guendouzi','CM',1999,'Fransa','Fenerbahçe','Süper Lig',75,'playmaker'],
    ['nx-sl-fb-ismail','İsmail Yüksek','DM',1999,'Türkiye','Fenerbahçe','Süper Lig',68,'defender'],
    ['nx-sl-fb-asensio','Marco Asensio','RW',1996,'İspanya','Fenerbahçe','Süper Lig',78,'creator'],
    ['nx-sl-fb-greenwood','Mason Greenwood','RW',2001,'Jamaika','Fenerbahçe','Süper Lig',78,'winger'],
    ['nx-sl-fb-kerem','Kerem Aktürkoğlu','LW',1998,'Türkiye','Fenerbahçe','Süper Lig',70,'winger'],
    ['nx-sl-fb-oguz','Oğuz Aydın','RW',2000,'Türkiye','Fenerbahçe','Süper Lig',60,'winger'],
    ['nx-sl-fb-lukaku','Romelu Lukaku','ST',1993,'Belçika','Fenerbahçe','Süper Lig',79,'finisher'],
    ['nx-sl-fb-muriqi','Vedat Muriqi','ST',1994,'Kosova','Fenerbahçe','Süper Lig',73,'aerial'],

    // Galatasaray
    ['nx-sl-gs-ugurcan','Uğurcan Çakır','GK',1996,'Türkiye','Galatasaray','Süper Lig',68,'keeper'],
    ['nx-sl-gs-davinson','Davinson Sánchez','CB',1996,'Kolombiya','Galatasaray','Süper Lig',75,'defender'],
    ['nx-sl-gs-singo','Wilfried Singo','RB',2000,'Fildişi Sahili','Galatasaray','Süper Lig',71,'balanced'],
    ['nx-sl-gs-bitshiabu','El Chadaille Bitshiabu','CB',2005,'Fransa','Galatasaray','Süper Lig',66,'defender'],
    ['nx-sl-gs-jakobs','Ismail Jakobs','LB',1999,'Senegal','Galatasaray','Süper Lig',65,'balanced'],
    ['nx-sl-gs-abdulkerim','Abdülkerim Bardakcı','CB',1994,'Türkiye','Galatasaray','Süper Lig',68,'defender'],
    ['nx-sl-gs-torreira','Lucas Torreira','DM',1996,'Uruguay','Galatasaray','Süper Lig',75,'defender'],
    ['nx-sl-gs-sara','Gabriel Sara','CM',1999,'Brezilya','Galatasaray','Süper Lig',70,'playmaker'],
    ['nx-sl-gs-ilkay','İlkay Gündoğan','CM',1990,'Almanya','Galatasaray','Süper Lig',73,'playmaker'],
    ['nx-sl-gs-sane','Leroy Sané','RW',1996,'Almanya','Galatasaray','Süper Lig',78,'winger'],
    ['nx-sl-gs-baris','Barış Alper Yılmaz','RW',2000,'Türkiye','Galatasaray','Süper Lig',73,'winger'],
    ['nx-sl-gs-leao','Rafael Leão','LW',1999,'Portekiz','Galatasaray','Süper Lig',80,'winger'],
    ['nx-sl-gs-osimhen','Victor Osimhen','ST',1998,'Nijerya','Galatasaray','Süper Lig',80,'finisher'],

    // Beşiktaş
    ['nx-sl-bjk-emirhan','Emirhan Topçu','CB',2000,'Türkiye','Beşiktaş','Süper Lig',63,'defender'],
    ['nx-sl-bjk-ridvan','Rıdvan Yılmaz','LB',2001,'Türkiye','Beşiktaş','Süper Lig',62,'balanced'],
    ['nx-sl-bjk-hekimoglu','Mustafa Hekimoğlu','ST',2007,'Türkiye','Beşiktaş','Süper Lig',58,'finisher'],
    ['nx-sl-bjk-cerny','Václav Černý','RW',1997,'Çekya','Beşiktaş','Süper Lig',68,'creator'],

    // Trabzonspor
    ['nx-sl-ts-onana','André Onana','GK',1996,'Kamerun','Trabzonspor','Süper Lig',70,'sweeper'],
    ['nx-sl-ts-zubkov','Oleksandr Zubkov','RW',1996,'Ukrayna','Trabzonspor','Süper Lig',68,'winger'],
    ['nx-sl-ts-onuachu','Paul Onuachu','ST',1994,'Nijerya','Trabzonspor','Süper Lig',65,'aerial']
  ];

  const CLUB_BY_NAME=new Map(SUPER_LIG_SPECS.map((spec)=>[normalize(spec[1]),spec[5]]));
  let added=0;
  let clubUpdated=0;

  try{
    if(typeof PLAYERS!=='undefined' && Array.isArray(PLAYERS)){
      const existing=new Set(PLAYERS.map((p)=>normalize(p?.name)));
      if(typeof makeExtraPlayer==='function'){
        for(const spec of SUPER_LIG_SPECS){
          const key=normalize(spec[1]);
          if(existing.has(key)) continue;
          try{
            const footballer=makeExtraPlayer(spec);
            if(footballer){
              PLAYERS.push(footballer);
              existing.add(key);
              added++;
            }
          }catch(err){
            console.warn('[NEON XI] Süper Lig player add skipped:',spec[1],err);
          }
        }
      }else{
        console.warn('[NEON XI] makeExtraPlayer unavailable; no new Süper Lig players were generated.');
      }

      for(const p of PLAYERS){
        const targetClub=CLUB_BY_NAME.get(normalize(p?.name));
        if(!targetClub) continue;
        const previousClub=p.club;
        if(previousClub===targetClub && p.league==='Süper Lig') continue;
        p.club=targetClub;
        p.league='Süper Lig';
        if(!Array.isArray(p.former)) p.former=[];
        if(previousClub && previousClub!==targetClub && !p.former.includes(previousClub)) p.former.unshift(previousClub);
        clubUpdated++;
      }
    }
  }catch(err){
    console.warn('[NEON XI] Süper Lig pool refresh skipped',err);
  }

  /* ---------------------------------------------------------
     3) Mobile scoreboard v2 — full-width compact broadcast strip.
     This intentionally overrides legacy landscape min-height:112px.
  --------------------------------------------------------- */
  const style=document.createElement('style');
  style.id='nx-mobile-scoreboard-refresh-20260904';
  style.textContent=`
@media (max-width:780px){
  #matchSimulation{
    padding:calc(6px + env(safe-area-inset-top)) max(6px,env(safe-area-inset-right)) max(6px,env(safe-area-inset-bottom)) max(6px,env(safe-area-inset-left))!important;
    overflow:hidden!important;
  }
  #matchSimulation .matchSimShell{
    width:100%!important;height:100%!important;min-height:0!important;
    grid-template-rows:58px minmax(0,1fr) 40px!important;gap:5px!important;overflow:hidden!important;
  }
  #matchSimulation .matchScoreboard{
    width:100%!important;height:58px!important;min-height:58px!important;max-height:58px!important;
    margin:0!important;padding:4px 6px!important;gap:4px!important;
    grid-template-columns:minmax(0,1fr) 94px minmax(0,1fr)!important;
    border-radius:13px!important;overflow:hidden!important;
    box-shadow:0 7px 22px rgba(0,0,0,.32),inset 0 0 0 1px rgba(255,255,255,.025)!important;
  }
  #matchSimulation .matchTeam{
    min-width:0!important;min-height:48px!important;height:48px!important;
    padding:4px 6px!important;gap:6px!important;border-radius:9px!important;
  }
  #matchSimulation .matchTeam.teamA{border-left:2px solid var(--nx-a,#55d8ff)!important}
  #matchSimulation .matchTeam.teamB{border-right:2px solid var(--nx-b,#ff875c)!important}
  #matchSimulation .matchTeam div:not(.matchTeamBadge){display:block!important;min-width:0!important;overflow:hidden!important}
  #matchSimulation .matchTeamBadge{
    flex:0 0 auto!important;width:30px!important;height:30px!important;border-radius:9px!important;font-size:10px!important;
  }
  #matchSimulation .matchTeam strong{
    display:block!important;max-width:100%!important;font-size:9px!important;line-height:1.05!important;
    white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;
  }
  #matchSimulation .matchTeam span{
    display:block!important;margin-top:3px!important;max-width:100%!important;font-size:6px!important;line-height:1!important;
    white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;opacity:.68!important;
  }
  #matchSimulation .matchCenter{
    min-width:0!important;width:94px!important;margin:0!important;padding:0 3px!important;align-self:center!important;
  }
  #matchSimulation .matchClock{
    min-width:54px!important;min-height:14px!important;height:14px!important;margin:0 auto 1px!important;padding:1px 5px!important;
    border-radius:999px!important;font-size:7px!important;line-height:12px!important;
  }
  #matchSimulation .matchClock::before{display:none!important}
  #matchSimulation .matchScore{
    margin:0!important;gap:4px!important;font-size:24px!important;line-height:.9!important;letter-spacing:-.055em!important;
  }
  #matchSimulation .matchPhase,#matchSimulation .matchTimeline{display:none!important}
  #matchSimulation .nx-goal-lightning{border-radius:13px!important}
}
@media (max-width:390px){
  #matchSimulation .matchScoreboard{
    grid-template-columns:minmax(0,1fr) 84px minmax(0,1fr)!important;padding:4px!important;gap:3px!important;
  }
  #matchSimulation .matchCenter{width:84px!important}
  #matchSimulation .matchTeam{padding:4px!important;gap:4px!important}
  #matchSimulation .matchTeamBadge{width:27px!important;height:27px!important;border-radius:8px!important;font-size:9px!important}
  #matchSimulation .matchTeam strong{font-size:8px!important}
  #matchSimulation .matchTeam span{display:none!important}
  #matchSimulation .matchScore{font-size:22px!important}
}
@media (orientation:landscape) and (max-height:650px){
  #matchSimulation{
    padding:4px max(5px,env(safe-area-inset-right)) max(4px,env(safe-area-inset-bottom)) max(5px,env(safe-area-inset-left))!important;
  }
  #matchSimulation .matchSimShell{grid-template-rows:48px minmax(0,1fr) 34px!important;gap:4px!important}
  #matchSimulation .matchScoreboard{
    width:100%!important;height:48px!important;min-height:48px!important;max-height:48px!important;
    grid-template-columns:minmax(0,1fr) 92px minmax(0,1fr)!important;
    padding:3px 6px!important;gap:4px!important;border-radius:11px!important;overflow:hidden!important;
  }
  #matchSimulation .matchTeam{min-height:40px!important;height:40px!important;padding:3px 6px!important;gap:5px!important}
  #matchSimulation .matchTeamBadge{width:28px!important;height:28px!important;border-radius:8px!important;font-size:9px!important}
  #matchSimulation .matchTeam strong{font-size:8.5px!important}
  #matchSimulation .matchTeam span{font-size:5.5px!important;margin-top:2px!important}
  #matchSimulation .matchCenter{width:92px!important;min-width:0!important;margin:0!important;padding:0!important}
  #matchSimulation .matchClock{height:12px!important;min-height:12px!important;line-height:10px!important;font-size:6.5px!important;margin-bottom:1px!important}
  #matchSimulation .matchScore{font-size:21px!important;gap:3px!important}
  #matchSimulation .matchControls{height:34px!important;min-height:34px!important}
}
`;
  document.getElementById(style.id)?.remove();
  document.head.appendChild(style);

  try{
    if(selectionPatchApplied && typeof render==='function') render();
  }catch(err){
    console.warn('[NEON XI] final Draft refresh render skipped',err);
  }

  // The head guard keeps selectedDetail hidden during boot. From this point,
  // only a real .highlight selection is allowed to display it.
  document.documentElement.classList.add('nx-draft-selection-ready');

  window.NEON_DRAFT_POOL_SCOREBOARD_REFRESH={
    version:'2026-09-04-v1',
    selectionPatchApplied,
    superLigSpecs:SUPER_LIG_SPECS.length,
    added,
    clubUpdated
  };
  console.info(`[NEON XI] Draft/Süper Lig/mobile scoreboard refresh ready · specs ${SUPER_LIG_SPECS.length} · added ${added} · club updates ${clubUpdated}`);
})();
