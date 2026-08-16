from pathlib import Path
import json

p = Path('index.html')
text = p.read_text(encoding='utf-8')
marker = 'NEON_XI_CLUB_DATA_UPDATED_AT = "2026-08-16"'
if marker in text:
    print('Club data patch already present; nothing to do.')
    raise SystemExit(0)

overrides = {
    "Mohamed Salah":{"club":"Trabzonspor","league":"Süper Lig"},
    "Bruno Guimarães":{"club":"Arsenal","league":"Premier League"},
    "Sandro Tonali":{"club":"Tottenham","league":"Premier League"},
    "Anthony Gordon":{"club":"Barcelona","league":"La Liga"},
    "Ibrahima Konaté":{"club":"Real Madrid","league":"La Liga"},
    "Cristian Romero":{"club":"Atlético Madrid","league":"La Liga"},
    "Marc Cucurella":{"club":"Real Madrid","league":"La Liga"},
    "Denzel Dumfries":{"club":"Real Madrid","league":"La Liga"},
    "Dušan Vlahović":{"club":"Beşiktaş","league":"Süper Lig"},
    "Yann Sommer":{"club":"Club Brugge","league":"Belgian Pro League"},
    "Evan Ferguson":{"club":"Brighton","league":"Premier League"},
    "Artem Dovbyk":{"club":"Bologna","league":"Serie A"},
    "Nahuel Molina":{"club":"Roma","league":"Serie A"},
    "Yan Couto":{"club":"Como","league":"Serie A"},
    "Crysencio Summerville":{"club":"Al-Hilal","league":"Saudi Pro League"},
    "Mason Greenwood":{"club":"Fenerbahçe","league":"Süper Lig"},
    "Gonçalo Ramos":{"club":"Milan","league":"Serie A"},
    "Morten Hjulmand":{"club":"Atlético Madrid","league":"La Liga"}
}

former = {
    "Emiliano Martínez":["Arsenal","Reading","Getafe","Wolverhampton Wanderers","Rotherham United","Sheffield Wednesday","Oxford United"],
    "Yann Sommer":["Inter","Bayern Münih","Borussia Mönchengladbach","Basel","Grasshoppers","Vaduz"],
    "Alex Meret":["Udinese","SPAL"],
    "Dean Henderson":["Manchester United","Nottingham Forest","Sheffield United","Shrewsbury Town","Stockport County","Grimsby Town"],
    "Mile Svilar":["Benfica","Anderlecht"],
    "Marc Cucurella":["Chelsea","Brighton","Getafe","Eibar","Barcelona"],
    "Antonee Robinson":["Wigan Athletic","Bolton","Everton"],
    "Rayan Aït-Nouri":["Wolverhampton Wanderers","Angers"],
    "David Raum":["Hoffenheim","Greuther Fürth"],
    "Maxim De Cuyper":["Club Brugge","Westerlo"],
    "Pervis Estupiñán":["Brighton","Villarreal","Osasuna","Mallorca","Almería","Granada","Watford","LDU Quito"],
    "Jorrel Hato":["Ajax"],
    "Noussair Mazraoui":["Bayern Münih","Ajax"],
    "Nahuel Molina":["Atlético Madrid","Udinese","Rosario Central","Defensa y Justicia","Boca Juniors"],
    "Vanderson":["Grêmio"],
    "Yan Couto":["Borussia Dortmund","Girona","Braga","Manchester City","Coritiba"],
    "Murillo":["Corinthians"],
    "Lisandro Martínez":["Ajax","Defensa y Justicia","Newell's Old Boys"],
    "Jarrad Branthwaite":["PSV","Blackburn Rovers","Carlisle United"],
    "Gleison Bremer":["Torino","Atlético Mineiro"],
    "Benjamin Pavard":["Marseille","Bayern Münih","Stuttgart","Lille"],
    "Evan Ndicka":["Eintracht Frankfurt","Auxerre"],
    "Nico Schlotterbeck":["Freiburg","Union Berlin"],
    "Edmond Tapsoba":["Vitória Guimarães","Leixões"],
    "Amadou Onana":["Everton","Lille","Hamburg","Hoffenheim"],
    "Angelo Stiller":["Hoffenheim","Bayern Münih"],
    "Exequiel Palacios":["River Plate"],
    "Morten Hjulmand":["Sporting CP","Lecce","Admira Wacker"],
    "Manuel Locatelli":["Sassuolo","Milan"],
    "Khéphren Thuram":["Nice","Monaco"],
    "Xavi Simons":["Paris Saint-Germain","PSV","Barcelona"],
    "James Maddison":["Leicester City","Norwich City","Aberdeen","Coventry City"],
    "Warren Zaïre-Emery":[],
    "Kobbie Mainoo":[],
    "Morgan Gibbs-White":["Wolverhampton Wanderers","Sheffield United","Swansea City"],
    "Teun Koopmeiners":["Atalanta","AZ Alkmaar"],
    "Adrien Rabiot":["Juventus","Paris Saint-Germain","Toulouse"],
    "Cody Gakpo":["PSV"],
    "Anthony Gordon":["Newcastle United","Everton","Preston North End"],
    "Kingsley Coman":["Juventus","Paris Saint-Germain"],
    "Serge Gnabry":["Werder Bremen","Hoffenheim","West Bromwich Albion","Arsenal"],
    "Harvey Barnes":["Leicester City","West Bromwich Albion","Barnsley","MK Dons"],
    "Noa Lang":["PSV","Club Brugge","Ajax","Twente"],
    "Crysencio Summerville":["West Ham United","Leeds United","ADO Den Haag","Feyenoord"],
    "Jarrod Bowen":["Hull City","Hereford United"],
    "Pedro Neto":["Wolverhampton Wanderers","Lazio","Braga"],
    "Francisco Conceição":["Porto","Ajax"],
    "Amad Diallo":["Atalanta","Sunderland","Rangers"],
    "Brahim Díaz":["Milan","Manchester City"],
    "Dejan Kulusevski":["Juventus","Parma","Atalanta"],
    "Noni Madueke":["Chelsea","PSV"],
    "Matías Soulé":["Juventus","Frosinone"],
    "Mason Greenwood":["Marseille","Getafe","Manchester United"],
    "Hugo Ekitiké":["Eintracht Frankfurt","Paris Saint-Germain","Reims","Vejle"],
    "Randal Kolo Muani":["Paris Saint-Germain","Tottenham","Eintracht Frankfurt","Nantes","Boulogne"],
    "Jonathan David":["Lille","Gent"],
    "Victor Boniface":["Werder Bremen","Union Saint-Gilloise","Bodø/Glimt"],
    "Serhou Guirassy":["Stuttgart","Rennes","Amiens","Köln","Auxerre","Lille","Laval"],
    "Moise Kean":["Juventus","Paris Saint-Germain","Everton","Hellas Verona"],
    "Santiago Giménez":["Feyenoord","Cruz Azul"],
    "Evan Ferguson":["Roma","West Ham","Bohemians"],
    "Dominic Solanke":["Bournemouth","Liverpool","Vitesse","Chelsea"],
    "Artem Dovbyk":["Roma","Girona","Dnipro-1","Midtjylland","SønderjyskE"],
    "Alexander Sørloth":["Villarreal","Real Sociedad","RB Leipzig","Trabzonspor","Gent","Crystal Palace","Midtjylland","Groningen","Rosenborg","Bodø/Glimt"],
    "Patrik Schick":["RB Leipzig","Roma","Sampdoria","Bohemians 1905","Sparta Prague"],
    "Gonçalo Ramos":["Paris Saint-Germain","Benfica"],
    "Jean-Philippe Mateta":["Mainz","Le Havre","Lyon","Châteauroux"],
    "Liam Delap":["Ipswich Town","Hull City","Stoke City","Preston North End","Manchester City"]
}

js = f'''
  /* NEON XI — CLUB / TRANSFER HISTORY UPDATE — 2026-08-16 */
  const NEON_XI_CLUB_DATA_UPDATED_AT = "2026-08-16";
  const NEON_XI_CURRENT_CLUB_OVERRIDES_2026 = {json.dumps(overrides, ensure_ascii=False, separators=(',',':'))};
  const NEON_XI_FORMER_CLUBS_2026 = {json.dumps(former, ensure_ascii=False, separators=(',',':'))};
  function neonXiNormalizeClubHistoryName(value) {{ return String(value || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[’'`´]/g, "").replace(/[^a-zA-Z0-9]+/g, "").toLowerCase(); }}
  function neonXiMergeFormerClubs(player, extraFormer) {{
    const currentKey = neonXiNormalizeClubHistoryName(player.club), blocked = new Set(["", "kulupsuz", "serbestoyuncu", "withoutclub"]), seen = new Set(), merged = [];
    [...(extraFormer || []), ...(Array.isArray(player.former) ? player.former : [])].forEach(club => {{ const clean=String(club||"").trim(), key=neonXiNormalizeClubHistoryName(clean); if (!key || blocked.has(key) || key === currentKey || seen.has(key)) return; seen.add(key); merged.push(clean); }});
    player.former = merged;
  }}
  function applyNeonXiClubData2026() {{
    if (typeof PLAYERS === "undefined" || !Array.isArray(PLAYERS)) return;
    let currentClubChanges=0, formerHistoriesFilled=0;
    PLAYERS.forEach(player => {{
      const previousClub=player.club, override=NEON_XI_CURRENT_CLUB_OVERRIDES_2026[player.name];
      if (override) {{
        if (previousClub && neonXiNormalizeClubHistoryName(previousClub)!==neonXiNormalizeClubHistoryName(override.club) && !["kulupsuz","serbest oyuncu"].includes(String(previousClub).toLocaleLowerCase("tr-TR"))) {{ player.former=Array.isArray(player.former)?player.former:[]; player.former.unshift(previousClub); }}
        if (player.club!==override.club || player.league!==override.league) currentClubChanges++;
        player.club=override.club; player.league=override.league;
      }}
      const mappedFormer=NEON_XI_FORMER_CLUBS_2026[player.name];
      if (mappedFormer) {{ neonXiMergeFormerClubs(player,mappedFormer); formerHistoriesFilled++; }} else neonXiMergeFormerClubs(player,[]);
      player.clubDataSource="Transfermarkt"; player.clubDataUpdatedAt=NEON_XI_CLUB_DATA_UPDATED_AT;
    }});
    window.NEON_XI_CLUB_DATA_INFO={{updatedAt:NEON_XI_CLUB_DATA_UPDATED_AT,playerCount:PLAYERS.length,currentClubChanges,formerHistoriesFilled,source:"Transfermarkt"}};
  }}
  applyNeonXiClubData2026();
'''

needle = '  addExpandedPlayerPool();\n  updatePoolCountTexts();'
if needle not in text:
    raise SystemExit('Patch insertion point not found')
text = text.replace(needle, '  addExpandedPlayerPool();\n' + js + '\n  updatePoolCountTexts();', 1)
text = text.replace('Kadro: 16 Temmuz 2026 · 124 oyuncu · Çok kaynaklı v2', 'Kadro: 16 Ağustos 2026 · 192 oyuncu · Kulüp verisi güncel', 1)
header = '<!-- NEON XI CLUB DATA: Transfermarkt · 2026-08-16 · active clubs + former clubs -->\n'
if header.strip() not in text:
    text = text.replace('<!-- NEON XI BUILD:', header + '<!-- NEON XI BUILD:', 1)
p.write_text(text, encoding='utf-8')
print('Patched index.html')
