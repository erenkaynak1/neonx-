(()=>{
  'use strict';

  const PATCH_VERSION='2026-09-04-fm26.2-v1';
  if(window.NEON_SUPERLIG_FM26_DATA_REFRESH?.version===PATCH_VERSION) return;

  const normalize=(value)=>String(value||'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[’'`´]/g,'')
    .replace(/[^a-zA-Z0-9]+/g,'')
    .toLowerCase();

  // Same tuple contract used by FMINSIDE_EXPANSION_2026 + makeExtraPlayer():
  // [id, name, position, birthYear, nation, currentClub, league, FMInside rating, style]
  // Ratings below use the current FMInside FM26.2 (26.2.0) club/player dataset.
  const REFRESH_SPECS=[
    // Fenerbahçe
    ['nx-fmi262-fb-ederson','Ederson','GK',1993,'Brazil','Fenerbahçe','Süper Lig',80,'sweeper'],
    ['nx-fmi262-fb-ake','Nathan Aké','CB',1995,'Netherlands','Fenerbahçe','Süper Lig',77,'defender'],
    ['nx-fmi262-fb-skriniar','Milan Škriniar','CB',1995,'Slovakia','Fenerbahçe','Süper Lig',78,'defender'],
    ['nx-fmi262-fb-semedo','Nélson Semedo','RB',1993,'Portugal','Fenerbahçe','Süper Lig',70,'balanced'],
    ['nx-fmi262-fb-mert','Mert Müldür','RB',1999,'Türkiye','Fenerbahçe','Süper Lig',63,'balanced'],
    ['nx-fmi262-fb-kante',"N'Golo Kanté",'DM',1991,'France','Fenerbahçe','Süper Lig',75,'defender'],
    ['nx-fmi262-fb-guendouzi','Mattéo Guendouzi','CM',1999,'France','Fenerbahçe','Süper Lig',75,'playmaker'],
    ['nx-fmi262-fb-ismail','İsmail Yüksek','DM',1999,'Türkiye','Fenerbahçe','Süper Lig',68,'defender'],
    ['nx-fmi262-fb-asensio','Marco Asensio','RW',1996,'Spain','Fenerbahçe','Süper Lig',78,'creator'],
    ['nx-fmi262-fb-greenwood','Mason Greenwood','RW',2001,'Jamaica','Fenerbahçe','Süper Lig',78,'winger'],
    ['nx-fmi262-fb-kerem','Kerem Aktürkoğlu','LW',1998,'Türkiye','Fenerbahçe','Süper Lig',70,'winger'],
    ['nx-fmi262-fb-oguz','Oğuz Aydın','RW',2000,'Türkiye','Fenerbahçe','Süper Lig',60,'winger'],
    ['nx-fmi262-fb-lukaku','Romelu Lukaku','ST',1993,'Belgium','Fenerbahçe','Süper Lig',79,'finisher'],
    ['nx-fmi262-fb-muriqi','Vedat Muriqi','ST',1994,'Kosovo','Fenerbahçe','Süper Lig',73,'aerial'],

    // Galatasaray
    ['nx-fmi262-gs-ugurcan','Uğurcan Çakır','GK',1996,'Türkiye','Galatasaray','Süper Lig',68,'keeper'],
    ['nx-fmi262-gs-davinson','Davinson Sánchez','CB',1996,'Colombia','Galatasaray','Süper Lig',75,'defender'],
    ['nx-fmi262-gs-singo','Wilfried Singo','RB',2000,"Cote d'Ivoire",'Galatasaray','Süper Lig',70,'balanced'],
    ['nx-fmi262-gs-bitshiabu','El Chadaille Bitshiabu','CB',2005,'France','Galatasaray','Süper Lig',66,'defender'],
    ['nx-fmi262-gs-jakobs','Ismail Jakobs','LB',1999,'Senegal','Galatasaray','Süper Lig',65,'balanced'],
    ['nx-fmi262-gs-abdulkerim','Abdülkerim Bardakcı','CB',1994,'Türkiye','Galatasaray','Süper Lig',68,'defender'],
    ['nx-fmi262-gs-torreira','Lucas Torreira','DM',1996,'Uruguay','Galatasaray','Süper Lig',75,'defender'],
    ['nx-fmi262-gs-sara','Gabriel Sara','CM',1999,'Brazil','Galatasaray','Süper Lig',70,'playmaker'],
    ['nx-fmi262-gs-ilkay','İlkay Gündoğan','CM',1990,'Germany','Galatasaray','Süper Lig',73,'playmaker'],
    ['nx-fmi262-gs-sane','Leroy Sané','RW',1996,'Germany','Galatasaray','Süper Lig',78,'winger'],
    ['nx-fmi262-gs-baris','Barış Alper Yılmaz','RW',2000,'Türkiye','Galatasaray','Süper Lig',73,'winger'],
    ['nx-fmi262-gs-leao','Rafael Leão','LW',1999,'Portugal','Galatasaray','Süper Lig',80,'winger'],
    ['nx-fmi262-gs-osimhen','Victor Osimhen','ST',1998,'Nigeria','Galatasaray','Süper Lig',80,'finisher'],

    // Beşiktaş
    ['nx-fmi262-bjk-emirhan','Emirhan Topçu','CB',2000,'Türkiye','Beşiktaş','Süper Lig',63,'defender'],
    ['nx-fmi262-bjk-ridvan','Rıdvan Yılmaz','LB',2001,'Türkiye','Beşiktaş','Süper Lig',60,'balanced'],
    ['nx-fmi262-bjk-hekimoglu','Mustafa Hekimoğlu','ST',2007,'Türkiye','Beşiktaş','Süper Lig',58,'finisher'],
    ['nx-fmi262-bjk-cerny','Václav Černý','RW',1997,'Czech Republic','Beşiktaş','Süper Lig',68,'creator'],

    // Trabzonspor + current AEK transfer
    ['nx-fmi262-ts-onana','André Onana','GK',1996,'Cameroon','Trabzonspor','Süper Lig',70,'sweeper'],
    ['nx-fmi262-aek-zubkov','Oleksandr Zubkov','RW',1996,'Ukraine','AEK Athens','Greek Super League',68,'winger'],
    ['nx-fmi262-ts-onuachu','Paul Onuachu','ST',1994,'Nigeria','Trabzonspor','Süper Lig',65,'aerial']
  ];

  // Full career-history layer used by the same former-club chemistry field as the main pool.
  // Current club is deliberately NOT repeated in `former` to prevent double chemistry credit.
  const FORMER_CLUBS={
    'Ederson':['Manchester City','Benfica','Rio Ave','GD Ribeirão','Benfica U19','Benfica U17','São Paulo U17'],
    'Nathan Aké':['Manchester City','Bournemouth','Chelsea','Watford','Reading','Chelsea U18','Feyenoord U17','ADO Den Haag Youth','VV Wilhelmus Youth'],
    'Milan Škriniar':['Paris Saint-Germain','Inter Milan','Sampdoria','MŠK Žilina','FC ViOn Zlaté Moravce','MŠK Žilina Youth','FK Žiar nad Hronom Youth'],
    'Nélson Semedo':['Wolverhampton Wanderers','FC Barcelona','Benfica','Benfica B','CD Fátima','SU Sintrense'],
    'Mert Müldür':['Sassuolo','Rapid Vienna','Rapid Wien II','Rapid Vienna U18','Rapid Vienna U16','Rapid Vienna Youth'],
    "N'Golo Kanté":['Al-Ittihad','Chelsea','Leicester City','SM Caen','US Boulogne','Boulogne B','JS Suresnes'],
    'Mattéo Guendouzi':['Lazio','Olympique Marseille','Hertha BSC','Arsenal','FC Lorient','FC Lorient B','FC Lorient U17','Paris Saint-Germain U17','Paris Saint-Germain Youth'],
    'İsmail Yüksek':['Bursaspor','Adana Demirspor','Balıkesirspor','Gölcükspor','Bursa Yıldırım Spor','Yıldırım Belediyesi Jimnastikspor','Yeşil Bursa','Bursa Merinosspor','Bursaspor Youth'],
    'Marco Asensio':['Aston Villa','Paris Saint-Germain','Real Madrid','Espanyol','RCD Mallorca','RCD Mallorca B','RCD Mallorca Youth','Playas de Calvià Youth'],
    'Mason Greenwood':['Olympique Marseille','Getafe','Manchester United','Manchester United U23','Manchester United U18','Manchester United Youth','Idle Juniors FC'],
    'Kerem Aktürkoğlu':['Benfica','Galatasaray','24 Erzincanspor','Karacabey Belediyespor','Bodrumspor','Başakşehir U21','Başakşehir Youth','Hisareynspor Youth','Gölcükspor Youth'],
    'Oğuz Aydın':['Alanyaspor','1928 Bucaspor','Bucaspor','Karacabey Belediyespor','Bucaspor Youth','AZ Alkmaar Youth'],
    'Romelu Lukaku':['Napoli','Roma','Inter Milan','Chelsea','Manchester United','Everton','West Bromwich Albion','RSC Anderlecht','Anderlecht U17','Anderlecht Youth','Lierse Youth','KFC Wintam','Rupel Boom FC'],
    'Vedat Muriqi':['RCD Mallorca','Lazio','Çaykur Rizespor','Gençlerbirliği','Giresunspor','KS Besa','KF Teuta','KF Liria','Liria Prizren Youth'],

    'Uğurcan Çakır':['Trabzonspor','1461 Trabzon','Trabzonspor U21','Trabzonspor U19','1461 Trabzon Youth','Yamanspor Youth','Çekmeköyspor Youth'],
    'Davinson Sánchez':['Tottenham Hotspur','Ajax','Jong Ajax','Atlético Nacional','Atlético Nacional U20','América de Cali Youth'],
    'Wilfried Singo':['AS Monaco','Torino','Torino U19','AS Denguélé','RCDE International Academy'],
    'El Chadaille Bitshiabu':['RB Leipzig','Paris Saint-Germain','Paris Saint-Germain U19','Paris Saint-Germain U17','AC Boulogne-Billancourt Youth','US Saint-Denis Youth'],
    'Ismail Jakobs':['AS Monaco','1.FC Köln','1.FC Köln II','1.FC Köln U19','1.FC Köln U17','1.FC Köln Youth','BC Bliesheim Youth'],
    'Abdülkerim Bardakcı':['Konyaspor','Denizlispor','Samsunspor','Adana Demirspor','Anadolu Selçukspor','Konyaspor U21','Konyaspor Youth','Fenerspor Youth'],
    'Lucas Torreira':['Fiorentina','Atlético de Madrid','Arsenal','Sampdoria','Pescara','Pescara U19','Montevideo Wanderers U19','Institución Atlética 18 de Julio'],
    'Gabriel Sara':['Norwich City','São Paulo','São Paulo U20','São Paulo U17'],
    'İlkay Gündoğan':['Manchester City','FC Barcelona','Borussia Dortmund','1.FC Nürnberg','VfL Bochum II','VfL Bochum U19','VfL Bochum U17','SSV Buer Youth','SV Heßler 06 Youth','Schalke 04 Youth'],
    'Leroy Sané':['Bayern Munich','Manchester City','Schalke 04','Schalke 04 U19','Schalke 04 U17','Bayer Leverkusen Youth','SG Wattenscheid 09 Youth'],
    'Barış Alper Yılmaz':['Ankara Keçiörengücü','Ankara Demirspor','Rize Özel İdare Spor Youth'],
    'Rafael Leão':['AC Milan','Lille','Sporting CP','Sporting B','Sporting U19','Sporting U17','Sporting U15','Sporting Youth','Foot 21 Youth'],
    'Victor Osimhen':['Napoli','Lille','R Charleroi SC','Wolfsburg','Ultimate Strikers Academy'],

    'Emirhan Topçu':['Çaykur Rizespor','Menemenspor','NK Čelik Zenica','Çaykur Rizespor U21','Çaykur Rizespor Youth'],
    'Rıdvan Yılmaz':['Rangers','Beşiktaş U21','Beşiktaş U19','Beşiktaş U17','Beşiktaş Youth'],
    'Mustafa Hekimoğlu':['Beşiktaş U19','Beşiktaş U17','Beşiktaş U16','Beşiktaş Youth'],
    'Václav Černý':['Rangers','VfL Wolfsburg','FC Twente','FC Utrecht','Ajax','Jong Ajax','Ajax U19','Ajax U17','Ajax Youth','1.FK Příbram Youth'],

    'André Onana':['Manchester United','Inter Milan','Ajax','Jong Ajax','FC Barcelona U19','FC Barcelona U18','FC Barcelona U16',"Samuel Eto'o Academy"],
    'Oleksandr Zubkov':['Trabzonspor','Shakhtar Donetsk','Ferencváros','FC Mariupol','Shakhtar Donetsk U21','Shakhtar Donetsk U19','Shakhtar Donetsk Youth'],
    'Paul Onuachu':['Southampton','Genk','FC Midtjylland','Vejle BK','FC Midtjylland U19','FC Ebedei']
  };

  const byName=new Map(REFRESH_SPECS.map((spec)=>[normalize(spec[1]),spec]));
  const mergeFormer=(currentClub, curated, existing=[])=>{
    const current=normalize(currentClub);
    const seen=new Set();
    const merged=[];
    [...(curated||[]),...(existing||[])].forEach((club)=>{
      const clean=String(club||'').trim();
      const key=normalize(clean);
      if(!clean || !key || key===current || seen.has(key)) return;
      if(['kulupsuz','serbestoyuncu','withoutclub'].includes(key)) return;
      seen.add(key);
      merged.push(clean);
    });
    return merged;
  };

  let updated=0;
  let added=0;
  let historiesFilled=0;
  const missing=[];

  try{
    if(typeof PLAYERS==='undefined' || !Array.isArray(PLAYERS)) throw new Error('PLAYERS unavailable');
    if(typeof makeExtraPlayer!=='function') throw new Error('makeExtraPlayer unavailable');

    for(const spec of REFRESH_SPECS){
      const [,name,,,,currentClub,league,overall,style]=spec;
      const key=normalize(name);
      let player=PLAYERS.find((p)=>normalize(p?.name)===key);
      const previousPlayerClub=player?.club;
      const previousFormer=Array.isArray(player?.former)?player.former.slice():[];

      const generated=makeExtraPlayer(spec);
      if(!generated){
        missing.push(name);
        continue;
      }

      if(!player){
        player=generated;
        PLAYERS.push(player);
        added++;
      }else{
        // Keep the stable pool id so saved/drafted references do not break.
        const stableId=player.id;
        Object.assign(player,generated);
        player.id=stableId;
        player.name=name;
        updated++;
      }

      player.club=currentClub;
      player.league=league;
      player.fmInsideOverall=overall;
      player.fmInsideStyle=style;
      player.ratingSource='FMInside FM26.2 (26.2.0)';
      player.ratingMethod='NEON XI makeExtraPlayer positional/style generator';
      player.ratingUpdatedAt='2026-09-04';
      player.clubHistorySource='Transfermarkt career history + official club confirmations';
      player.clubHistoryUpdatedAt='2026-09-04';
      player.dataPool='NEON XI FMInside/Transfermarkt';
      player.clubDataMatched=true;

      const curated=FORMER_CLUBS[name]||[];
      const carry=[];
      if(previousPlayerClub && normalize(previousPlayerClub)!==normalize(currentClub)) carry.push(previousPlayerClub);
      player.former=mergeFormer(currentClub,curated,[...carry,...previousFormer]);
      if(player.former.length) historiesFilled++;
    }

    // Ensure no accidental duplicate rows survived previous hotfixes.
    // Keep the first/stable record (the one refreshed above) so ids remain intact.
    const seenNames=new Set();
    for(let i=0;i<PLAYERS.length;){
      const p=PLAYERS[i];
      const key=normalize(p?.name);
      if(!byName.has(key)){ i++; continue; }
      if(seenNames.has(key)){ PLAYERS.splice(i,1); continue; }
      seenNames.add(key);
      i++;
    }

    if(typeof render==='function'){
      try{ render(); }catch(_){ }
    }
  }catch(err){
    console.warn('[NEON XI] FM26.2 Süper Lig data refresh failed',err);
  }

  window.NEON_SUPERLIG_FM26_DATA_REFRESH={
    version:PATCH_VERSION,
    players:REFRESH_SPECS.length,
    updated,
    added,
    historiesFilled,
    missing,
    ratingCorrections:{'Nélson Semedo':70,'Wilfried Singo':70,'Rıdvan Yılmaz':60},
    currentClubCorrections:{'Oleksandr Zubkov':'AEK Athens'},
    ratingSource:'FMInside FM26.2 (26.2.0)',
    historySource:'Transfermarkt career history + official club confirmations'
  };

  console.info(`[NEON XI] FM26.2 player data refresh ready · players ${REFRESH_SPECS.length} · updated ${updated} · added ${added} · histories ${historiesFilled}`);
})();
