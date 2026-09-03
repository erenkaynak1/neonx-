(()=>{
  'use strict';

  // NEON XI Draft club refresh — verified 2026-09-03.
  // The embedded Draft pool predates the final weeks of the 2026 summer window.
  // Keep ratings/attributes untouched; only current playing club, league and career history are refreshed here.
  if(typeof PLAYERS==='undefined'||!Array.isArray(PLAYERS)) return;

  const OVERRIDES={
    gk6:{club:'Ajax',league:'Eredivisie'},                         // Marc-André ter Stegen — loan from Barcelona
    cb6:{club:'Liverpool',league:'Premier League'},              // Ronald Araújo — loan from Barcelona
    dm1:{club:'Barcelona',league:'La Liga'},                     // Rodri — from Manchester City
    dm9:{club:'Tottenham',league:'Premier League'},              // Sandro Tonali — from Newcastle United
    cm9:{club:'Arsenal',league:'Premier League'},                // Bruno Guimarães — from Newcastle United
    cm16:{club:'Manchester City',league:'Premier League'},       // Enzo Fernández — from Chelsea
    lw4:{club:'Galatasaray',league:'Süper Lig'},                 // Rafael Leão — from Milan
    lw8:{club:'Liverpool',league:'Premier League'},              // Bradley Barcola — from Paris Saint-Germain
    lw10:{club:'Al-Hilal',league:'Saudi Pro League'},            // Gabriel Martinelli — from Arsenal
    rw1:{club:'Trabzonspor',league:'Süper Lig'},                 // Mohamed Salah — from Liverpool
    rw12:{club:'Tottenham',league:'Premier League'},             // Sávio/Savinho — from Manchester City
    cb13:{club:'Atlético Madrid',league:'La Liga'},              // Cristian Romero — from Tottenham
    st10:{club:'Beşiktaş',league:'Süper Lig'},                   // Dušan Vlahović — from Juventus
    st11:{club:'Tottenham',league:'Premier League'}              // Omar Marmoush — loan from Manchester City
  };

  let changed=0;
  for(const p of PLAYERS){
    const next=OVERRIDES[p.id];
    if(!next) continue;
    const previousClub=p.club;
    if(previousClub===next.club&&p.league===next.league) continue;

    p.club=next.club;
    p.league=next.league;
    if(!Array.isArray(p.former)) p.former=[];
    if(previousClub&&previousClub!==next.club&&!p.former.includes(previousClub)) p.former.unshift(previousClub);
    changed++;
  }

  // Recalculate visible Draft cards and chemistry using the refreshed current clubs.
  try{ if(changed&&typeof render==='function') render(); }catch(err){ console.warn('[NEON XI] Draft club refresh render skipped',err); }

  window.NEON_DRAFT_CLUB_REFRESH={version:'2026-09-03',changed,ids:Object.keys(OVERRIDES)};
  console.info(`[NEON XI] Draft club refresh applied: ${changed} player(s).`);
})();
