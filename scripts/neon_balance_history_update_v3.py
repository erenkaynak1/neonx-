from pathlib import Path
import csv, gzip, io, json, re, unicodedata, urllib.request

INDEX=Path('index.html')
text=INDEX.read_text(encoding='utf-8')
original=text
DATA={
 'players':'https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/players.csv.gz',
 'transfers':'https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/transfers.csv.gz',
 'competitions':'https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/competitions.csv.gz'
}
TRANSLATE=str.maketrans({'ø':'o','Ø':'O','ł':'l','Ł':'L','đ':'d','Đ':'D','ð':'d','Ð':'D','þ':'th','Þ':'Th','ı':'i','İ':'I','ß':'ss','æ':'ae','Æ':'AE','œ':'oe','Œ':'OE'})

def norm(v):
 s=str(v or '').translate(TRANSLATE)
 s=unicodedata.normalize('NFKD',s)
 s=''.join(ch for ch in s if not unicodedata.combining(ch))
 return re.sub(r'[^a-z0-9]+','',s.lower())

def load(url):
 req=urllib.request.Request(url,headers={'User-Agent':'NEON-XI-data-updater/1.1'})
 with urllib.request.urlopen(req,timeout=90) as r: raw=r.read()
 return list(csv.DictReader(io.StringIO(gzip.decompress(raw).decode('utf-8-sig'))))

positions=r'(?:GK|LB|RB|CB|DM|CM|AM|LW|RW|ST)'
game_current={}
for m in re.finditer(r'\{[^{}]{0,700}?"name"\s*:\s*"([^"]+)"[^{}]{0,350}?"pos"\s*:\s*"'+positions+r'"[^{}]{0,500}?"club"\s*:\s*"([^"]*)"[^{}]{0,500}?\}',text,re.S):
 game_current.setdefault(m.group(1),m.group(2))
for m in re.finditer(r'\[\s*"[^"]+"\s*,\s*"([^"]+)"\s*,\s*"'+positions+r'"\s*,\s*\d{4}\s*,\s*"[^"]*"\s*,\s*"([^"]*)"\s*,\s*"[^"]*"\s*,\s*\d+\s*,\s*"[^"]+"\s*\]',text):
 game_current.setdefault(m.group(1),m.group(2))
game_names=sorted(game_current)
if len(game_names)<150: raise SystemExit(f'Player extraction too low: {len(game_names)}')
print('NEON XI oyuncu adları:',len(game_names))

existing_former={}
for name in game_names:
 q=re.escape(name)
 m=re.search(r'"name"\s*:\s*"'+q+r'"(?:(?!\}\s*,?\s*\{).){0,1000}?"former"\s*:\s*\[([^\]]*)\]',text,re.S)
 if m: existing_former[name]=re.findall(r'"([^"]+)"',m.group(1))

players=load(DATA['players']); transfers=load(DATA['transfers']); competitions=load(DATA['competitions'])
print(f'Dataset: players={len(players)} transfers={len(transfers)} competitions={len(competitions)}')
comp_map={str(r.get('competition_id','')):(r.get('name') or r.get('competition_name') or '').strip() for r in competitions}
by_name={}
for p in players:
 name=(p.get('name') or p.get('player_name') or '').strip()
 if name: by_name.setdefault(norm(name),[]).append(p)
transfers_by_id={}
for t in transfers:
 pid=str(t.get('player_id') or '').strip()
 if pid: transfers_by_id.setdefault(pid,[]).append(t)
SPECIAL={'withoutclub','retired','retirement','endofcareer','careerbreak','unknown','na'}

def club(p): return (p.get('current_club_name') or p.get('club_name') or '').strip()
def choose(name,cands):
 if len(cands)==1:return cands[0]
 old=norm(game_current.get(name,''))
 exact=[p for p in cands if old and norm(club(p))==old]
 if len(exact)==1:return exact[0]
 active=[p for p in cands if club(p) and norm(club(p)) not in SPECIAL]
 if len(active)==1:return active[0]
 # en yeni last_season değeri tekse onu seç
 try:
  maxseason=max(int(p.get('last_season') or 0) for p in cands)
  newest=[p for p in cands if int(p.get('last_season') or 0)==maxseason]
  if len(newest)==1:return newest[0]
 except Exception: pass
 return None

def history(pid,current):
 rows=sorted(transfers_by_id.get(str(pid),[]),key=lambda r:str(r.get('transfer_date') or ''),reverse=True)
 ck=norm(current); seen=set(); out=[]
 for r in rows:
  for field in ('from_club_name','to_club_name'):
   c=(r.get(field) or '').strip(); k=norm(c)
   if not c or not k or k==ck or k in SPECIAL or k in seen:continue
   seen.add(k);out.append(c)
 return out

current_map={};former_map={};unmatched=[];ambiguous=[]
for name in game_names:
 cands=by_name.get(norm(name),[])
 if not cands:unmatched.append(name);continue
 p=choose(name,cands)
 if not p:ambiguous.append(name);continue
 current=club(p);pid=str(p.get('player_id') or '')
 comp_id=str(p.get('current_club_domestic_competition_id') or p.get('domestic_competition_id') or '')
 league=comp_map.get(comp_id,'')
 if current and norm(current) not in SPECIAL:current_map[name]={'club':current,'league':league or ''}
 h=history(pid,current)
 if not h and existing_former.get(name):h=existing_former[name]
 former_map[name]=h
print(f'Transfermarkt eşleşen: {len(former_map)} / {len(game_names)}')
print(f'Belirsiz: {len(ambiguous)} | Eşleşmeyen: {len(unmatched)}')
if len(former_map)<int(len(game_names)*.80):raise SystemExit('Transfermarkt coverage below 80%')

def replace_obj(src,name,obj):
 payload=json.dumps(obj,ensure_ascii=False,separators=(',',':'))
 out,n=re.subn(rf'const\s+{re.escape(name)}\s*=\s*\{{.*?\}}\s*;',f'const {name} = {payload};',src,count=1,flags=re.S)
 if n!=1:raise SystemExit('Could not replace '+name)
 return out
text=replace_obj(text,'NEON_XI_CURRENT_CLUB_OVERRIDES_2026',current_map)
text=replace_obj(text,'NEON_XI_FORMER_CLUBS_2026',former_map)

old='player.clubDataSource = "Transfermarkt";\n      player.clubDataUpdatedAt = NEON_XI_CLUB_DATA_UPDATED_AT;'
new='''const clubDataMatched=Object.prototype.hasOwnProperty.call(NEON_XI_FORMER_CLUBS_2026,player.name)||Object.prototype.hasOwnProperty.call(NEON_XI_CURRENT_CLUB_OVERRIDES_2026,player.name);\n      player.clubDataMatched=clubDataMatched;\n      player.clubDataSource=clubDataMatched?"Transfermarkt":(player.clubDataSource||"Mevcut oyun verisi");\n      player.clubDataUpdatedAt=NEON_XI_CLUB_DATA_UPDATED_AT;'''
if old in text:text=text.replace(old,new,1)

# Görünür eski kulüp satırı.
row_old='<div class="playerMeta">${p.nation} · ${p.club} · ${p.league}</div>${m?'
row_new='<div class="playerMeta">${p.nation} · ${p.club} · ${p.league}</div><div class="playerMeta playerFormerMeta">Eski: ${(Array.isArray(p.former)&&p.former.length)?p.former.join(", "):(p.clubDataMatched?"Tek kulüp kariyeri":"Geçmiş veri eşleşmedi")}</div>${m?'
if row_old in text:text=text.replace(row_old,row_new,1)
else:print('WARN player row meta not found')
text=text.replace('Eski kulüpler: ${p.former.join(", ")||"—"}','Eski kulüpler: ${(Array.isArray(p.former)&&p.former.length)?p.former.join(", "):(p.clubDataMatched?"Tek kulüp kariyeri":"Geçmiş veri eşleşmedi")}',1)
text=text.replace('[p.name,p.nation,p.club,p.league,...p.former]','[p.name,p.nation,p.club,p.league,...(Array.isArray(p.former)?p.former:[])]',1)

# Kart kararını fonksiyon içinde formattan bağımsız değiştir.
func=re.search(r'async\s+function\s+maybeDisciplinaryEvent\s*\([^)]*\)\s*\{.*?(?=\n\s*function\s+penaltyTaker\s*\(|\n\s*function\s+makePenaltyPlan\s*\()',text,re.S)
if not func:raise SystemExit('Disciplinary function not found')
body=func.group(0)
# Önce eski cardRisk varsa temizle; sonra direkt kırmızı satırının önüne yenisini koy.
body=re.sub(r'\s*const\s+cardRisk\s*=\s*[^;]+;','',body,count=1)
body,nred=re.subn(r'const\s+directRedChance\s*=\s*[^;]+;', 'const cardRisk=clamp(Number(profile?.foulRisk||1),.85,1.18);\n    const directRedChance=clamp(.05*cardRisk,.04,.065);',body,count=1)
body,nyellow=re.subn(r'const\s+yellowChance\s*=\s*[^;]+;', 'const yellowChance=clamp(.315*cardRisk,.27,.38);',body,count=1)
if nred!=1 or nyellow!=1:raise SystemExit(f'Card declarations not found red={nred} yellow={nyellow}')
text=text[:func.start()]+body+text[func.end():]
print('Kart kararları: sarı ~30%, direkt kırmızı ~5% (faul sonrası)')

# Penaltı planına DOKUNULMAZ.
# Taktik karşılıklarını keskinleştir, iyi hücumun ve doğru savunmanın sonucu daha görünür olsun.
repls=[
 ('if(route==="wing"&&defenseProfile.tactic.defense==="Kanatları Kapat"){progression*=.82;xGModifier*=.84;','if(route==="wing"&&defenseProfile.tactic.defense==="Kanatları Kapat"){progression*=.78;xGModifier*=.80;'),
 ('if(route==="center"&&defenseProfile.tactic.defense==="Merkezi Kapat"){progression*=.80;xGModifier*=.84;turnoverModifier*=1.16;','if(route==="center"&&defenseProfile.tactic.defense==="Merkezi Kapat"){progression*=.76;xGModifier*=.80;turnoverModifier*=1.20;'),
 ('if(route==="direct"&&highPress){progression*=1.15;xGModifier*=1.08;','if(route==="direct"&&highPress){progression*=1.20;xGModifier*=1.12;'),
 ('if(route==="direct"&&deepBlock){progression*=.80;xGModifier*=.84;','if(route==="direct"&&deepBlock){progression*=.76;xGModifier*=.80;'),
 ('if(route==="transition"&&highPress){progression*=1.18;xGModifier*=1.15;','if(route==="transition"&&highPress){progression*=1.23;xGModifier*=1.20;'),
 ('if(route==="transition"&&deepBlock){progression*=.75;xGModifier*=.78;','if(route==="transition"&&deepBlock){progression*=.70;xGModifier*=.74;'),
 ('if(route==="longShot"&&deepBlock){progression*=1.12;xGModifier*=.78;','if(route==="longShot"&&deepBlock){progression*=1.16;xGModifier*=.82;'),
 ('progression*=clamp(.82+(routeQuality(attackProfile,route)-routeDefense(defenseProfile,route))/150,.75,1.25);','progression*=clamp(.82+(routeQuality(attackProfile,route)-routeDefense(defenseProfile,route))/130,.72,1.30);'),
 ('const progressionChance=clamp(.52*progression+(effectiveRating(attackingTeam)-effectiveRating(defendingTeam))/350-pressBreakRisk-turnoverPenalty,.16,.84);','const progressionChance=clamp(.54*progression+(effectiveRating(attackingTeam)-effectiveRating(defendingTeam))/315-pressBreakRisk-turnoverPenalty,.15,.87);'),
 ('boxEntryChance*clamp(.88+xGModifier*.10,.80,1.15)','boxEntryChance*clamp(.90+xGModifier*.11,.80,1.18)'),
 ('(.42+(attackProfile.shotVolume-1)*.28+(boxEntry?.17:0)','(.44+(attackProfile.shotVolume-1)*.28+(boxEntry?.17:0)')
]
hits=0
for a,b in repls:
 if a in text:text=text.replace(a,b,1);hits+=1
print('Taktik/atak katsayı değişiklikleri:',hits)
if hits<7:raise SystemExit('Too few tactical replacements: '+str(hits))

# Tam ekran popup sunumları 2D maç kartına taşı.
if 'document.body.appendChild(scene);' not in text:raise SystemExit('Scene append not found')
text=text.replace('document.body.appendChild(scene);','const nxSceneHost=document.getElementById("matchVisualCard")||document.body;\n  nxSceneHost.appendChild(scene);',1)
event_old='''if (!overlay) {\n    overlay = document.createElement("div");\n    overlay.id = "nxEventCinema";\n    document.body.appendChild(overlay);\n  }'''
event_new='''if (!overlay) {\n    overlay = document.createElement("div");\n    overlay.id = "nxEventCinema";\n    const nxEventHost=document.getElementById("matchVisualCard")||document.body;\n    nxEventHost.appendChild(overlay);\n  }'''
if event_old not in text:raise SystemExit('Event cinema append not found')
text=text.replace(event_old,event_new,1)
text=text.replace('document.body.classList.toggle("nx-event-cinema-open",open);','document.body.classList.remove("nx-event-cinema-open");',1)

css=r'''
<style id="neon-xi-inline-event-and-history-v2">
#matchVisualCard{position:relative!important}
#matchVisualCard>#kadroPresentationScene.kp-scene,#matchVisualCard>#nxEventCinema.nx-event-cinema{position:absolute!important;inset:25px 0 0!important;z-index:90!important;width:auto!important;height:auto!important;min-height:0!important;padding:4px!important;border-radius:0 0 10px 10px!important;overflow:hidden!important;background:rgba(2,7,5,.96)!important;backdrop-filter:none!important}
#matchVisualCard>#kadroPresentationScene .kp-scene-box{width:100%!important;height:100%!important;max-width:none!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;padding:8px!important}
#matchVisualCard>#kadroPresentationScene .kp-scene-title{font-size:clamp(20px,4vw,42px)!important;margin-top:5px!important}
#matchVisualCard>#kadroPresentationScene .kp-scene-sub{font-size:clamp(9px,1.4vw,13px)!important;margin-top:5px!important;min-height:0!important}
#matchVisualCard>#kadroPresentationScene .kp-play{width:100%!important;max-height:70%!important;overflow:hidden!important}
#matchVisualCard>#nxEventCinema .nx-event-cinema-shell{width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;border:0!important;border-radius:7px!important;box-shadow:none!important;background:#020604!important}
#matchVisualCard>#nxEventCinema video{width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;object-fit:contain!important}
#matchVisualCard>#nxEventCinema .nx-event-cinema-close{display:none!important}
#matchVisualCard>#nxEventCinema .nx-event-cinema-meta{left:7px!important;top:7px!important;font-size:7px!important;padding:4px 6px!important}
body.nx-event-cinema-open{overflow:inherit!important}
.playerFormerMeta{opacity:.72;font-size:8px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
@media (orientation:landscape) and (max-height:620px){#draftScreen .playerRow{min-height:48px!important}#draftScreen .selectedDetail{max-height:92px!important}}
</style>
'''
if 'neon-xi-inline-event-and-history-v2' not in text:text=text.replace('</head>',css+'\n</head>',1)
marker='<!-- NEON XI BALANCE/HISTORY/UI: 2026-08-16 v2 -->'
if marker not in text:text=text.replace('<!DOCTYPE html>','<!DOCTYPE html>\n'+marker,1)

if text==original:raise SystemExit('No changes')
INDEX.write_text(text,encoding='utf-8')
print('index.html patched successfully')
print('Current club entries:',len(current_map))
print('Former club entries:',len(former_map))
print('Unmatched:',unmatched)
print('Ambiguous:',ambiguous)
