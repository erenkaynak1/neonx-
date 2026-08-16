from pathlib import Path
import csv,gzip,io,json,re,unicodedata,urllib.request
p=Path('index.html'); text=p.read_text(encoding='utf-8'); original=text
URL={'players':'https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/players.csv.gz','transfers':'https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/transfers.csv.gz','competitions':'https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/competitions.csv.gz'}
TRANS=str.maketrans({'ø':'o','Ø':'O','ł':'l','Ł':'L','đ':'d','Đ':'D','ð':'d','Ð':'D','þ':'th','Þ':'Th','ı':'i','İ':'I','ß':'ss','æ':'ae','Æ':'AE','œ':'oe','Œ':'OE'})
def norm(v):
 s=unicodedata.normalize('NFKD',str(v or '').translate(TRANS)); return re.sub(r'[^a-z0-9]+','', ''.join(c for c in s if not unicodedata.combining(c)).lower())
def load(u):
 req=urllib.request.Request(u,headers={'User-Agent':'NEON-XI-updater/1.2'}); raw=urllib.request.urlopen(req,timeout=90).read(); return list(csv.DictReader(io.StringIO(gzip.decompress(raw).decode('utf-8-sig'))))
positions=r'(?:GK|LB|RB|CB|DM|CM|AM|LW|RW|ST)'; gc={}
for m in re.finditer(r'\{[^{}]{0,700}?"name"\s*:\s*"([^"]+)"[^{}]{0,350}?"pos"\s*:\s*"'+positions+r'"[^{}]{0,500}?"club"\s*:\s*"([^"]*)"[^{}]{0,500}?\}',text,re.S):gc.setdefault(m.group(1),m.group(2))
for m in re.finditer(r'\[\s*"[^"]+"\s*,\s*"([^"]+)"\s*,\s*"'+positions+r'"\s*,\s*\d{4}\s*,\s*"[^"]*"\s*,\s*"([^"]*)"\s*,\s*"[^"]*"\s*,\s*\d+\s*,\s*"[^"]+"\s*\]',text):gc.setdefault(m.group(1),m.group(2))
names=sorted(gc); print('NEON XI oyuncu adları:',len(names)); assert len(names)>=150
existing={}
for name in names:
 m=re.search(r'"name"\s*:\s*"'+re.escape(name)+r'"(?:(?!\}\s*,?\s*\{).){0,1000}?"former"\s*:\s*\[([^\]]*)\]',text,re.S)
 if m:existing[name]=re.findall(r'"([^"]+)"',m.group(1))
players=load(URL['players']); transfers=load(URL['transfers']); comps=load(URL['competitions']); print('Dataset:',len(players),len(transfers),len(comps))
cm={str(r.get('competition_id','')):(r.get('name') or r.get('competition_name') or '').strip() for r in comps}; bn={}
for x in players:
 n=(x.get('name') or x.get('player_name') or '').strip();
 if n:bn.setdefault(norm(n),[]).append(x)
tb={}
for x in transfers:
 pid=str(x.get('player_id') or '').strip();
 if pid:tb.setdefault(pid,[]).append(x)
SPECIAL={'withoutclub','retired','retirement','endofcareer','careerbreak','unknown','na'}
def club(x):return (x.get('current_club_name') or x.get('club_name') or '').strip()
def choose(name,cands):
 if len(cands)==1:return cands[0]
 old=norm(gc.get(name,'')); exact=[x for x in cands if old and norm(club(x))==old]
 if len(exact)==1:return exact[0]
 active=[x for x in cands if club(x) and norm(club(x)) not in SPECIAL]
 if len(active)==1:return active[0]
 try:
  mx=max(int(x.get('last_season') or 0) for x in cands); z=[x for x in cands if int(x.get('last_season') or 0)==mx]
  if len(z)==1:return z[0]
 except:pass
 return None
def hist(pid,current):
 out=[];seen=set();ck=norm(current)
 for r in sorted(tb.get(str(pid),[]),key=lambda x:str(x.get('transfer_date') or ''),reverse=True):
  for f in ('from_club_name','to_club_name'):
   c=(r.get(f) or '').strip();k=norm(c)
   if c and k and k!=ck and k not in SPECIAL and k not in seen:seen.add(k);out.append(c)
 return out
current={};former={};unmatched=[];amb=[]
for name in names:
 cands=bn.get(norm(name),[])
 if not cands:unmatched.append(name); former[name]=existing.get(name,[]); continue
 x=choose(name,cands)
 if not x:amb.append(name); former[name]=existing.get(name,[]); continue
 cur=club(x); pid=str(x.get('player_id') or ''); compid=str(x.get('current_club_domestic_competition_id') or x.get('domestic_competition_id') or '')
 if cur and norm(cur) not in SPECIAL:current[name]={'club':cur,'league':cm.get(compid,'')}
 former[name]=hist(pid,cur) or existing.get(name,[])
print('Transfermarkt doğrudan eşleşen:',len(names)-len(unmatched)-len(amb),'/',len(names));print('Belirsiz:',amb);print('Eşleşmeyen:',unmatched)
def repobj(src,n,obj):
 payload=json.dumps(obj,ensure_ascii=False,separators=(',',':')); out,c=re.subn(rf'const\s+{re.escape(n)}\s*=\s*\{{.*?\}}\s*;',f'const {n} = {payload};',src,count=1,flags=re.S)
 if c!=1:raise SystemExit('Map replace failed '+n)
 return out
text=repobj(text,'NEON_XI_CURRENT_CLUB_OVERRIDES_2026',current);text=repobj(text,'NEON_XI_FORMER_CLUBS_2026',former)
old='player.clubDataSource = "Transfermarkt";\n      player.clubDataUpdatedAt = NEON_XI_CLUB_DATA_UPDATED_AT;';new='''const clubDataMatched=Object.prototype.hasOwnProperty.call(NEON_XI_FORMER_CLUBS_2026,player.name);\n      player.clubDataMatched=clubDataMatched;\n      player.clubDataSource=clubDataMatched?"Transfermarkt / mevcut doğrulanmış geçmiş":"Mevcut oyun verisi";\n      player.clubDataUpdatedAt=NEON_XI_CLUB_DATA_UPDATED_AT;'''
if old in text:text=text.replace(old,new,1)
row='<div class="playerMeta">${p.nation} · ${p.club} · ${p.league}</div>${m?'; row2='<div class="playerMeta">${p.nation} · ${p.club} · ${p.league}</div><div class="playerMeta playerFormerMeta">Eski: ${(Array.isArray(p.former)&&p.former.length)?p.former.join(", "):(p.clubDataMatched?"Tek kulüp kariyeri":"Geçmiş veri bulunamadı")}</div>${m?'
if row in text:text=text.replace(row,row2,1)
text=text.replace('Eski kulüpler: ${p.former.join(", ")||"—"}','Eski kulüpler: ${(Array.isArray(p.former)&&p.former.length)?p.former.join(", "):(p.clubDataMatched?"Tek kulüp kariyeri":"Geçmiş veri bulunamadı")}',1)
text=text.replace('[p.name,p.nation,p.club,p.league,...p.former]','[p.name,p.nation,p.club,p.league,...(Array.isArray(p.former)?p.former:[])]',1)
# Kart oranları: faul sonrası karar; penaltı planı değişmez.
redpat=r'const\s+directRedChance\s*=\s*\.0012\s*\*\s*Math\.max\(\s*\.8\s*,\s*profile\.foulRisk\s*\)\s*;'
yelpat=r'const\s+yellowChance\s*=\s*\.19\s*\*\s*Math\.max\(\s*\.85\s*,\s*profile\.foulRisk\s*\)\s*;'
text,nr=re.subn(redpat,'const cardRisk=clamp(Number(profile.foulRisk||1),.85,1.18);\n    const directRedChance=clamp(.05*cardRisk,.04,.065);',text,count=1)
text,ny=re.subn(yelpat,'const yellowChance=clamp(.315*cardRisk,.27,.38);',text,count=1)
print('Kart patch:',nr,ny)
if nr!=1 or ny!=1:raise SystemExit('Card lines not found')
# Taktik karşılıkları ve genel üretim.
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
('(.42+(attackProfile.shotVolume-1)*.28+(boxEntry?.17:0)','(.44+(attackProfile.shotVolume-1)*.28+(boxEntry?.17:0)')]
hits=0
for a,b in repls:
 if a in text:text=text.replace(a,b,1);hits+=1
print('Taktik patch hits:',hits)
if hits<7:raise SystemExit('Too few tactic hits '+str(hits))
# Popup sunumlarını 2D maç paneline göm.
if 'document.body.appendChild(scene);' not in text:raise SystemExit('scene append not found')
text=text.replace('document.body.appendChild(scene);','const nxSceneHost=document.getElementById("matchVisualCard")||document.body;\n  nxSceneHost.appendChild(scene);',1)
eventpat=r'if\s*\(\s*!overlay\s*\)\s*\{\s*overlay\s*=\s*document\.createElement\("div"\);\s*overlay\.id\s*=\s*"nxEventCinema";\s*document\.body\.appendChild\(overlay\);\s*\}'
eventrep='if (!overlay) { overlay=document.createElement("div"); overlay.id="nxEventCinema"; const nxEventHost=document.getElementById("matchVisualCard")||document.body; nxEventHost.appendChild(overlay); }'
text,ne=re.subn(eventpat,eventrep,text,count=1,flags=re.S);print('Event cinema host patch:',ne)
if ne!=1:raise SystemExit('event cinema host not found')
text=text.replace('document.body.classList.toggle("nx-event-cinema-open",open);','document.body.classList.remove("nx-event-cinema-open");',1)
css='''<style id="neon-xi-inline-event-and-history-v2">\n#matchVisualCard{position:relative!important}\n#matchVisualCard>#kadroPresentationScene.kp-scene,#matchVisualCard>#nxEventCinema.nx-event-cinema{position:absolute!important;inset:25px 0 0!important;z-index:90!important;width:auto!important;height:auto!important;min-height:0!important;padding:4px!important;border-radius:0 0 10px 10px!important;overflow:hidden!important;background:rgba(2,7,5,.96)!important;backdrop-filter:none!important}\n#matchVisualCard>#kadroPresentationScene .kp-scene-box{width:100%!important;height:100%!important;max-width:none!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;padding:8px!important}\n#matchVisualCard>#kadroPresentationScene .kp-scene-title{font-size:clamp(20px,4vw,42px)!important;margin-top:5px!important}\n#matchVisualCard>#kadroPresentationScene .kp-scene-sub{font-size:clamp(9px,1.4vw,13px)!important;margin-top:5px!important;min-height:0!important}\n#matchVisualCard>#kadroPresentationScene .kp-play{width:100%!important;max-height:70%!important;overflow:hidden!important}\n#matchVisualCard>#nxEventCinema .nx-event-cinema-shell{width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;border:0!important;border-radius:7px!important;box-shadow:none!important;background:#020604!important}\n#matchVisualCard>#nxEventCinema video{width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;object-fit:contain!important}\n#matchVisualCard>#nxEventCinema .nx-event-cinema-close{display:none!important}\n#matchVisualCard>#nxEventCinema .nx-event-cinema-meta{left:7px!important;top:7px!important;font-size:7px!important;padding:4px 6px!important}\nbody.nx-event-cinema-open{overflow:inherit!important}.playerFormerMeta{opacity:.72;font-size:8px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}\n@media (orientation:landscape) and (max-height:620px){#draftScreen .playerRow{min-height:48px!important}#draftScreen .selectedDetail{max-height:92px!important}}\n</style>'''
if 'neon-xi-inline-event-and-history-v2' not in text:text=text.replace('</head>',css+'\n</head>',1)
marker='<!-- NEON XI BALANCE/HISTORY/UI: 2026-08-16 v2 -->'
if marker not in text:text=text.replace('<!DOCTYPE html>','<!DOCTYPE html>\n'+marker,1)
if text==original:raise SystemExit('No changes')
p.write_text(text,encoding='utf-8');print('PATCH SUCCESS');print('current map',len(current),'former map',len(former))
