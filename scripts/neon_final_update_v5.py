from pathlib import Path
import csv,gzip,io,json,re,unicodedata,urllib.request

P=Path('index.html')
text=P.read_text(encoding='utf-8')
original=text
URL={
 'players':'https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/players.csv.gz',
 'transfers':'https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/transfers.csv.gz',
 'competitions':'https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/competitions.csv.gz'
}
TRANS=str.maketrans({'ø':'o','Ø':'O','ł':'l','Ł':'L','đ':'d','Đ':'D','ð':'d','Ð':'D','þ':'th','Þ':'Th','ı':'i','İ':'I','ß':'ss','æ':'ae','Æ':'AE','œ':'oe','Œ':'OE'})
def deaccent(v):
 s=unicodedata.normalize('NFKD',str(v or '').translate(TRANS))
 return ''.join(c for c in s if not unicodedata.combining(c))
def norm(v): return re.sub(r'[^a-z0-9]+','',deaccent(v).lower())
def words(v): return [x for x in re.split(r'[^a-z0-9]+',deaccent(v).lower()) if len(x)>=2]
def load(u):
 req=urllib.request.Request(u,headers={'User-Agent':'NEON-XI-updater/2.0'})
 raw=urllib.request.urlopen(req,timeout=90).read()
 return list(csv.DictReader(io.StringIO(gzip.decompress(raw).decode('utf-8-sig'))))

# --- Oyundaki oyuncu kayıtlarını çıkar ---
pos=r'(?:GK|LB|RB|CB|DM|CM|AM|LW|RW|ST)'
game_club={}
for m in re.finditer(r'\{[^{}]{0,700}?"name"\s*:\s*"([^"]+)"[^{}]{0,350}?"pos"\s*:\s*"'+pos+r'"[^{}]{0,500}?"club"\s*:\s*"([^"]*)"[^{}]{0,500}?\}',text,re.S):
 game_club.setdefault(m.group(1),m.group(2))
for m in re.finditer(r'\[\s*"[^"]+"\s*,\s*"([^"]+)"\s*,\s*"'+pos+r'"\s*,\s*\d{4}\s*,\s*"[^"]*"\s*,\s*"([^"]*)"\s*,\s*"[^"]*"\s*,\s*\d+\s*,\s*"[^"]+"\s*\]',text):
 game_club.setdefault(m.group(1),m.group(2))
names=sorted(game_club)
if len(names)<150: raise SystemExit(f'Player extraction too low: {len(names)}')
print('Oyuncu biçimli kayıt:',len(names))

# Eski statik former bilgisi, eşleşmeyenlerde güvenli fallback.
existing={}
for name in names:
 m=re.search(r'"name"\s*:\s*"'+re.escape(name)+r'"(?:(?!\}\s*,?\s*\{).){0,1100}?"former"\s*:\s*\[([^\]]*)\]',text,re.S)
 if m: existing[name]=re.findall(r'"([^"]+)"',m.group(1))

players=load(URL['players']); transfers=load(URL['transfers']); comps=load(URL['competitions'])
print('Dataset:',len(players),len(transfers),len(comps))
comp={str(x.get('competition_id','')):(x.get('name') or x.get('competition_name') or '').strip() for x in comps}
by_norm={}
for x in players:
 n=(x.get('name') or x.get('player_name') or '').strip()
 if n: by_norm.setdefault(norm(n),[]).append(x)
by_pid={}
for t in transfers:
 pid=str(t.get('player_id') or '').strip()
 if pid: by_pid.setdefault(pid,[]).append(t)
SPECIAL={'withoutclub','retired','retirement','endofcareer','careerbreak','unknown','na'}
def pcl(x): return (x.get('current_club_name') or x.get('club_name') or '').strip()
def candidate_clubs(x):
 vals=[pcl(x)]
 for r in by_pid.get(str(x.get('player_id') or ''),[]): vals += [(r.get('from_club_name') or ''),(r.get('to_club_name') or '')]
 return {norm(v) for v in vals if v}
def unique_best(name,cands):
 if len(cands)==1:return cands[0]
 old=norm(game_club.get(name,''))
 if old:
  hist=[x for x in cands if old in candidate_clubs(x)]
  if len(hist)==1:return hist[0]
  cur=[x for x in cands if norm(pcl(x))==old]
  if len(cur)==1:return cur[0]
 active=[x for x in cands if pcl(x) and norm(pcl(x)) not in SPECIAL]
 if len(active)==1:return active[0]
 try:
  mx=max(int(x.get('last_season') or 0) for x in cands); z=[x for x in cands if int(x.get('last_season') or 0)==mx]
  if len(z)==1:return z[0]
 except: pass
 return None
ALIASES={
 'Dani Carvajal':['Daniel Carvajal','Carvajal'],
 'Gabriel Magalhães':['Gabriel','Gabriel Magalhaes'],
 'Gleison Bremer':['Bremer'],
 'Kim Min-jae':['Min-jae Kim','Kim Min Jae'],
 'Son Heung-min':['Heung-min Son','Heung Min Son'],
 'Estêvão':['Estêvão Willian','Estevao Willian'],
 'Alisson':['Alisson Becker'],
 'Ederson':['Ederson Moraes','Ederson Santana de Moraes'],
 'Éderson':['Ederson Silva','Ederson José dos Santos Lourenço'],
 'Luis Díaz':['Luis Diaz'],
 'João Pedro':['Joao Pedro']
}
def find_candidates(name):
 c=list(by_norm.get(norm(name),[]))
 for alias in ALIASES.get(name,[]):
  for x in by_norm.get(norm(alias),[]):
   if x not in c:c.append(x)
 if c:return c
 # Son çare: ad tokenları + mevcut/eski kulüp geçmişi eşleşmesi.
 nw=set(words(name)); old=norm(game_club.get(name,'')); pool=[]
 if nw:
  for x in players:
   xn=set(words(x.get('name') or x.get('player_name') or ''))
   if nw & xn and (len(nw & xn)>=min(2,len(nw)) or len(nw)==1):
    if not old or old in candidate_clubs(x): pool.append(x)
 return pool

def history(x,current):
 rows=sorted(by_pid.get(str(x.get('player_id') or ''),[]),key=lambda r:str(r.get('transfer_date') or ''),reverse=True)
 ck=norm(current);out=[];seen=set()
 for r in rows:
  for f in ('from_club_name','to_club_name'):
   c=(r.get(f) or '').strip();k=norm(c)
   if c and k and k!=ck and k not in SPECIAL and k not in seen:
    seen.add(k);out.append(c)
 return out

current={};former={};matched=set(); unresolved=[]
for name in names:
 cands=find_candidates(name); x=unique_best(name,cands)
 if x:
  matched.add(name); cur=pcl(x); pid=str(x.get('player_id') or ''); cid=str(x.get('current_club_domestic_competition_id') or x.get('domestic_competition_id') or '')
  if cur and norm(cur) not in SPECIAL: current[name]={'club':cur,'league':comp.get(cid,'')}
  former[name]=history(x,cur) or existing.get(name,[])
 else:
  unresolved.append(name); former[name]=existing.get(name,[])
print('Transfermarkt eşleşen:',len(matched),'/',len(names))
print('Eşleşmeyen/belirsiz:',unresolved)
if len(matched)<int(len(names)*.90): raise SystemExit('Coverage below 90%')

def replace_obj(src,n,obj):
 payload=json.dumps(obj,ensure_ascii=False,separators=(',',':'))
 out,c=re.subn(rf'const\s+{re.escape(n)}\s*=\s*\{{.*?\}}\s*;',f'const {n} = {payload};',src,count=1,flags=re.S)
 if c!=1:raise SystemExit('Map replace failed: '+n)
 return out
text=replace_obj(text,'NEON_XI_CURRENT_CLUB_OVERRIDES_2026',current)
text=replace_obj(text,'NEON_XI_FORMER_CLUBS_2026',former)

# Map içindeki her isim veri statüsünü alır; former alanı her oyuncu için güvenle dizi olur.
old='player.clubDataSource = "Transfermarkt";\n      player.clubDataUpdatedAt = NEON_XI_CLUB_DATA_UPDATED_AT;'
new='''const clubDataMatched=Object.prototype.hasOwnProperty.call(NEON_XI_FORMER_CLUBS_2026,player.name);\n      player.clubDataMatched=clubDataMatched;\n      player.clubDataSource=clubDataMatched?"Transfermarkt / mevcut doğrulanmış geçmiş":"Mevcut oyun verisi";\n      player.clubDataUpdatedAt=NEON_XI_CLUB_DATA_UPDATED_AT;'''
if old in text:text=text.replace(old,new,1)

# Draft listesinin doğrudan altında eski kulüpler görünür.
row='<div class="playerMeta">${p.nation} · ${p.club} · ${p.league}</div>${m?'
row2='<div class="playerMeta">${p.nation} · ${p.club} · ${p.league}</div><div class="playerMeta playerFormerMeta">Eski: ${(Array.isArray(p.former)&&p.former.length)?p.former.join(", "):(p.clubDataMatched?"Tek kulüp kariyeri":"Geçmiş veri bulunamadı")}</div>${m?'
if row in text:text=text.replace(row,row2,1)
else: print('WARN: list former row point not found')
text=text.replace('Eski kulüpler: ${p.former.join(", ")||"—"}','Eski kulüpler: ${(Array.isArray(p.former)&&p.former.length)?p.former.join(", "):(p.clubDataMatched?"Tek kulüp kariyeri":"Geçmiş veri bulunamadı")}',1)
text=text.replace('[p.name,p.nation,p.club,p.league,...p.former]','[p.name,p.nation,p.club,p.league,...(Array.isArray(p.former)?p.former:[])]',1)

# --- Disiplin: faul gerçekleştikten sonra %5 direkt kırmızı + %30 sarı ---
# Kırmızı ilk %5; sarı sonraki %30 => toplam eşik %35.
if 'if(cardRoll<.012)' not in text or 'else if(cardRoll<.22)' not in text: raise SystemExit('Live card thresholds not found')
text=text.replace('if(cardRoll<.012)','if(cardRoll<.05)',1)
text=text.replace('else if(cardRoll<.22)','else if(cardRoll<.35)',1)
print('Kart: faul sonrası direkt kırmızı %5, sarı %30')

# --- Taktik motoru: üstün olan hücum/savunmayı biraz daha belirgin sonuçlandır ---
changes={
 'const magnitude=phase===2?5:15;':'const magnitude=phase===2?6:18;',
 'return clamp(total,-10,10);':'return clamp(total,-12,12);',
 'if(direction==="Kanatları Kapat")return route==="wing"?10:-10;':'if(direction==="Kanatları Kapat")return route==="wing"?12:-12;',
 'if(direction==="Merkezi Kapat")return route==="center"?10:-10;':'if(direction==="Merkezi Kapat")return route==="center"?12:-12;',
 'return clamp(value,-18,18);':'return clamp(value,-22,22);',
 'function v3ApplyAdjustment(score,adjustment) { return score*(1+clamp(adjustment,-18,18)/100); }':'function v3ApplyAdjustment(score,adjustment) { return score*(1+clamp(adjustment,-22,22)/100); }',
 'return clamp(baseline+(a-d)*.0075,.25,.92);':'return clamp(baseline+(a-d)*.0088,.22,.94);',
 'if(defenseTactic===row.opposite)return 1.5;':'if(defenseTactic===row.opposite)return 1.65;'
}
hits=0
for a,b in changes.items():
 if a in text:text=text.replace(a,b,1);hits+=1
 else:print('WARN tactical string absent:',a)
print('Taktik motor değişiklikleri:',hits)
if hits<7:raise SystemExit('Too few tactical changes')

# Gol conversion formülü ve penalty planı bilinçli olarak değiştirilmedi.

# --- Olay animasyonlarını tam ekran popup yerine 2D maç kartına taşı ---
if 'document.body.appendChild(scene);' not in text:raise SystemExit('kadroPresentationScene body append not found')
text=text.replace('document.body.appendChild(scene);','const nxSceneHost=document.getElementById("matchVisualCard")||document.querySelector(".matchVisualCard")||document.body;\n  nxSceneHost.appendChild(scene);',1)
pat=r'if\s*\(\s*!overlay\s*\)\s*\{\s*overlay\s*=\s*document\.createElement\("div"\);\s*overlay\.id\s*=\s*"nxEventCinema";\s*document\.body\.appendChild\(overlay\);\s*\}'
rep='if (!overlay) { overlay=document.createElement("div"); overlay.id="nxEventCinema"; const nxEventHost=document.getElementById("matchVisualCard")||document.querySelector(".matchVisualCard")||document.body; nxEventHost.appendChild(overlay); }'
text,n=re.subn(pat,rep,text,count=1,flags=re.S)
print('Event cinema mount:',n)
if n!=1:raise SystemExit('nxEventCinema body append not found')
text=text.replace('document.body.classList.toggle("nx-event-cinema-open",open);','document.body.classList.remove("nx-event-cinema-open");',1)
text=text.replace('role="dialog" aria-modal="true"','role="region" aria-modal="false"',1)

css='''<style id="neon-xi-inline-events-history-v5">\n#matchVisualCard{position:relative!important;isolation:isolate}\n#matchVisualCard>#kadroPresentationScene.kp-scene,#matchVisualCard>#nxEventCinema.nx-event-cinema{position:absolute!important;inset:25px 0 0!important;z-index:90!important;width:auto!important;height:auto!important;min-height:0!important;padding:4px!important;border-radius:0 0 10px 10px!important;overflow:hidden!important;background:rgba(2,7,5,.96)!important;backdrop-filter:none!important}\n#matchVisualCard>#kadroPresentationScene .kp-scene-box{width:100%!important;height:100%!important;max-width:none!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;padding:8px!important}\n#matchVisualCard>#kadroPresentationScene .kp-scene-title{font-size:clamp(20px,4vw,42px)!important;margin-top:5px!important}\n#matchVisualCard>#kadroPresentationScene .kp-scene-sub{font-size:clamp(9px,1.4vw,13px)!important;margin-top:5px!important;min-height:0!important}\n#matchVisualCard>#kadroPresentationScene .kp-play{width:100%!important;max-width:520px!important;max-height:70%!important;margin:8px auto 0!important;overflow:hidden!important}\n#matchVisualCard>#nxEventCinema .nx-event-cinema-shell{width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;border:0!important;border-radius:7px!important;box-shadow:none!important;background:#020604!important}\n#matchVisualCard>#nxEventCinema video{width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;object-fit:contain!important}\n#matchVisualCard>#nxEventCinema .nx-event-cinema-close{display:none!important}\n#matchVisualCard>#nxEventCinema .nx-event-cinema-meta{left:7px!important;top:7px!important;font-size:7px!important;padding:4px 6px!important}\nbody.nx-event-cinema-open{overflow:inherit!important}\n.playerFormerMeta{opacity:.76;font-size:8px!important;line-height:1.25!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;margin-top:2px}\n@media (orientation:landscape) and (max-height:620px){#draftScreen .playerRow{min-height:49px!important}#draftScreen .selectedDetail{max-height:94px!important}#matchVisualCard>#kadroPresentationScene.kp-scene,#matchVisualCard>#nxEventCinema.nx-event-cinema{inset:25px 0 0!important}}\n</style>'''
if 'neon-xi-inline-events-history-v5' not in text:text=text.replace('</head>',css+'\n</head>',1)

marker='<!-- NEON XI UPDATE: FULL-HISTORY + TACTICAL-SPREAD + INLINE-EVENTS 2026-08-16 -->'
if marker not in text:text=text.replace('<!DOCTYPE html>','<!DOCTYPE html>\n'+marker,1)

# Basit doğrulamalar.
checks=['if(cardRoll<.05)','else if(cardRoll<.35)','clamp(adjustment,-22,22)','(a-d)*.0088','nxSceneHost','nxEventHost','playerFormerMeta']
missing=[c for c in checks if c not in text]
if missing:raise SystemExit('Final validation failed: '+repr(missing))
if text==original:raise SystemExit('No changes produced')
P.write_text(text,encoding='utf-8')
print('PATCH SUCCESS')
print('former map entries:',len(former),'current club entries:',len(current))
