#!/usr/bin/env python3
"""Önce: python3 scripts/fm_havuz_birlestir.py (partiler → havuz.json); sonra bu betik → draft-xi/data/havuz-fm.mjs.
Kullanıcının FM verisi havuzunu (havuz.json) Draft XI v2 havuz biçimine çevirir (havuz.mjs ile aynı satır düzeni).
14+4 özellik FM özelliklerinden eşlenir, ardından iki havuzda ortak oyuncular üzerinden özellik başına yüzdelik eşleme
(equipercentile) ile v2 ölçeğine kalibre edilir. Kimlik bilgileri önce v2 havuzundan, yoksa Transfermarkt'tan gelir."""
import json,re,bisect,statistics as st,unicodedata,datetime,pathlib,csv
ROOT=pathlib.Path(__file__).resolve().parents[1]
H=ROOT/'draft-xi/data/fm-kaynak'
src=open(ROOT/'scripts/fm_havuz_birlestir.py',encoding='utf-8').read();ns={};exec(src[:src.index('pool={};log=[]')],ns);norm=ns['norm']
pool=json.load(open(H/'havuz.json',encoding='utf-8'))['oyuncular']
txt=open(ROOT/'draft-xi/data/havuz.mjs',encoding='utf-8').read();body=txt[txt.index('const RAW = [')+len('const RAW = '):];body=body[:body.index('];')+1]
V2=json.loads(body);v2={}
for r in V2:v2.setdefault(norm(r[1]),r)
tm=json.load(open(ROOT/'side-games/data/master/transfermarkt-players.json',encoding='utf-8'));TM={}
for p in tm:TM.setdefault(norm(p['name']),[]).append(p)
CLUB=json.load(open(ROOT/'draft-xi/data/kulup-adlari.json',encoding='utf-8'))['adlar'];CTR=json.load(open(ROOT/'side-games/data/master/country-tr.json',encoding='utf-8'))
K=['fin','lon','hed','posn','dri','ft','sp','lp','cro','vis','tac','mar','pac','str'];GK=['ref','gpos','ghd','one']
MAP={'fin':[('Finishing',1)],'lon':[('Long Shots',1)],'hed':[('Heading',.6),('Jumping Reach',.4)],
 'posn':[('Off the Ball',.7),('Anticipation',.3)],'dri':[('Dribbling',.8),('Agility',.2)],'ft':[('First Touch',1)],
 'sp':[('Passing',.7),('Technique',.3)],'lp':[('Passing',.5),('Vision',.3),('Technique',.2)],'cro':[('Crossing',1)],
 'vis':[('Vision',.7),('Decisions',.3)],'tac':[('Tackling',1)],'mar':[('Marking',.7),('Positioning',.3)],
 'pac':[('Pace',.6),('Acceleration',.4)],'str':[('Strength',1)]}
GMAP={'ref':[('Reflexes',1)],'gpos':[('Positioning',.6),('Concentration',.2),('Anticipation',.2)],
 'ghd':[('Aerial Reach',.5),('Command of Area',.3),('Handling',.2)],'one':[('One on Ones',.7),('Rushing Out (Tendency)',.3)]}
GK_OUT={'ft':[('First Touch',1)],'sp':[('Passing',.7),('Technique',.3)],'lp':[('Kicking',.6),('Passing',.4)],'vis':[('Vision',.7),('Decisions',.3)],
 'pac':[('Pace',.6),('Acceleration',.4)],'str':[('Strength',1)]}
def mix(attrs,ws):
    got=[(attrs[k]['v'],w) for k,w in ws if attrs.get(k,{}).get('v') is not None]
    return sum(v*w for v,w in got)/sum(w for _,w in got) if got else None
isgk=lambda r:r[2]==['GK']
# fallback name matching: same surname + same first initial (Benjamin White ~ Ben White), or the surname alone for one-word names
def lastfirst(n):
    t=n.split();return (t[-1],t[0][:1]) if len(t)>1 else (t[0],'')
V2LF={};TMLF={}
for r in V2:V2LF.setdefault(lastfirst(norm(r[1])),[]).append(r)
for q in tm:TMLF.setdefault(lastfirst(norm(q['name'])),[]).append(q)
def find_v2(key):
    if key in v2:return v2[key]
    c=V2LF.get(lastfirst(key),[]);return c[0] if len(c)==1 else None
TMTOK={}
for q in tm:
    if q.get('status')=='active':
        for tok in set(norm(q['name']).split()):TMTOK.setdefault(tok,[]).append(q)
SURN={}
for q in tm:
    if q.get('status')=='active':SURN.setdefault(norm(q['name']).split()[-1],[]).append(q)
def find_tm(key):
    c=TM.get(key) or TMLF.get(lastfirst(key),[])
    if not c:  # token subset: 'Fermín' ~ 'Fermín López', 'Eli Junior Kroupi' ~ 'Junior Kroupi'
        toks=set(key.split());cand=set()
        for tok in toks:
            for q in TMTOK.get(tok,[]):
                qt=set(norm(q['name']).split())
                if toks<=qt or qt<=toks:cand.add(id(q))
        c=[q for tok in toks for q in TMTOK.get(tok,[]) if id(q) in cand]
        c=[q for q in c if (q.get('recognition_score') or 0)>=60]
    if not c:  # transliteration (Heorhii/Georgiy Sudakov): unique well-known active surname
        sc=[q for q in SURN.get(key.split()[-1],[]) if (q.get('recognition_score') or 0)>=150]
        c=sc if len(sc)==1 else []
    c=[q for q in c if q.get('status')!='legend'] or c
    return max(c,key=lambda q:q.get('recognition_score') or 0) if c else None
# calibration: per key, sorted FM-derived values and v2 values of overlapping players
pairs={k:([],[]) for k in K+GK+['g_'+k for k in GK_OUT]}
for p in pool:
    r=find_v2(norm(p['name']))
    if not r:continue
    if p.get('kaleci') and isgk(r) and r[12]:
        for k,i in zip(GK,range(4)):
            x=mix(p['attrs'],GMAP[k]);x is not None and (pairs[k][0].append(x),pairs[k][1].append(r[12][i]))
        for k,ws in GK_OUT.items():
            x=mix(p['attrs'],ws);x is not None and (pairs['g_'+k][0].append(x),pairs['g_'+k][1].append(r[11][K.index(k)]))
    elif not p.get('kaleci') and not isgk(r):
        for i,k in enumerate(K):
            x=mix(p['attrs'],MAP[k]);x is not None and (pairs[k][0].append(x),pairs[k][1].append(r[11][i]))
for k in pairs:pairs[k]=(sorted(pairs[k][0]),sorted(pairs[k][1]))
def cal(k,x):
    a,b=pairs[k]
    if len(a)<15:return round(x)
    lo,hi=bisect.bisect_left(a,x),bisect.bisect_right(a,x);q=(lo+hi)/2/len(a)
    q=min(max(q,.01),.99);  # trim the extreme 1% so single outliers of the v2 pool are not copied
    j=q*(len(b)-1);i0=int(j);f=j-i0;v=b[i0]*(1-f)+b[min(i0+1,len(b)-1)]*f
    return max(1,min(99,round(v)))
gk_med={k:round(st.median(r[11][i] for r in V2 if isgk(r))) for i,k in enumerate(K)}
SUB={'Goalkeeper':'GK','Centre-Back':'CB','Left-Back':'LB','Right-Back':'RB','Defensive Midfield':'DM','Central Midfield':'CM','Attacking Midfield':'AM','Left Midfield':'LM','Right Midfield':'RM','Left Winger':'LW','Right Winger':'RW','Centre-Forward':'ST','Second Striker':'ST'}
LIG={'premier-league':'Premier League','laliga':'La Liga','serie-a':'Serie A','bundesliga':'Bundesliga','ligue-1':'Ligue 1','super-lig':'Süper Lig','liga-portugal':'Liga Portugal','eredivisie':'Eredivisie','saudi-pro-league':'Saudi Pro League','major-league-soccer':'MLS','jupiler-pro-league':'Belçika Pro Lig','scottish-premiership':'İskoçya Premiership','super-league-1':'Yunanistan Süper Lig','superliga':'Danimarka Süper Lig','campeonato-brasileiro-serie-a':'Brasileirão','championship':'Championship','2-bundesliga':'2. Bundesliga','laliga2':'La Liga 2','serie-b':'Serie B','ligue-2':'Ligue 2'}
BOY={'GK':191,'CB':188,'DM':183,'ST':184,'CM':180,'AM':177,'LB':178,'RB':178,'LM':176,'RM':176,'LW':176,'RW':176}
LEGAL=re.compile(r"(\b(Football Club|Futbol Club|Fútbol Club|Futebol Clube|Calcio|S\.p\.A\.|FC|CF|AFC|SC|SK|FK|AC|SV|CD|UD|SD|SFC)\b\.?)",re.I)
def kisa(n):
    if not n:return ''
    if n in CLUB:return CLUB[n]
    c=re.sub(r'\s+',' ',LEGAL.sub('',n)).strip(' .-') or n;return CLUB.get(c,c)
nat=lambda e:CTR.get(re.sub(r'[^a-z]','',(e or '').lower()),e or '')
TODAY=datetime.date(2026,11,23)
def age(b):
    try:d=datetime.date.fromisoformat(b[:10]);return TODAY.year-d.year-((TODAY.month,TODAY.day)<(d.month,d.day))
    except Exception:return None
rows=[];stats={'v2_kimlik':0,'tm_kimlik':0,'kimliksiz':0}
for p in pool:
    key=norm(p['name']);r=find_v2(key);gkp=bool(p.get('kaleci'));tah=[]
    if r and isgk(r)!=gkp:r=None   # same name, different player type
    t=find_tm(key)
    if t and (t.get('sub_position')=='Goalkeeper')!=gkp:t=None   # same name, different player type
    if t and (age(t.get('birth_date') or '') or 0)>41:t=None          # an old namesake, not this player
    if r:
        stats['v2_kimlik']+=1;ident=dict(id=r[0],positions=r[2],foot=r[3],wf=r[4],h=r[5],nation=r[6],club=r[7],league=r[8],former=r[9],age=r[10])
        tah+=[x for x in (r[14] or []) if x in ('weakFoot','height','foot')]
    elif t:
        stats['tm_kimlik']+=1;pos=SUB.get(t.get('sub_position') or '', 'GK' if gkp else None)
        if gkp:pos='GK'
        foot={'right':'R','left':'L','both':'B'}.get(t.get('foot') or '','R');both=foot=='B';foot='R' if both else foot
        if not t.get('foot'):tah.append('foot')
        h=t.get('height_cm') or BOY.get(pos or 'CM',180)
        if not t.get('height_cm'):tah.append('height')
        tah.append('weakFoot')
        clubs=[kisa(x) for x in (t.get('career_clubs') or t.get('clubs') or [])]
        cur=kisa(t.get('current_club'))
        if not cur and clubs:cur=clubs[-1];tah.append('club')   # no current club in the data set: last known club
        former=[x for x in dict.fromkeys(clubs) if x and x!=cur][:10]
        ident=dict(id=f"tm{t['id']}",positions=[pos] if pos else [],foot=foot,wf=4 if both else 3,h=h,nation=nat(t.get('nationality')),club=cur,
                   league=LIG.get(t.get('current_league') or '',t.get('current_league') or '') or 'Diğer',former=former,age=age(t.get('birth_date') or ''))
        if not pos:tah.append('positions')
    else:
        stats['kimliksiz']+=1;tah+=['positions','foot','height','weakFoot','nation','club','age']
        ident=dict(id='fm-'+re.sub(r'[^a-z0-9]+','-',key).strip('-'),positions=['GK'] if gkp else [],foot='R',wf=3,h=191 if gkp else 180,nation='',club='',league='',former=[],age=None)
    a=p['attrs'];att=[];g=None
    if gkp:
        g=[]
        for k in GK:
            x=mix(a,GMAP[k]);g.append(cal(k,x) if x is not None else None)
            if x is None:tah.append(k)
        for k in K:
            if k in GK_OUT and mix(a,GK_OUT[k]) is not None:att.append(cal('g_'+k,mix(a,GK_OUT[k])))
            else:att.append(gk_med[k])
        tah.append('saha-ozellikleri-kaleci')
    else:
        for k in K:
            x=mix(a,MAP[k]);att.append(cal(k,x) if x is not None else None)
            if x is None:tah.append(k)
    rows.append(dict(name=p['name'],gk=gkp,ident=ident,a=att,g=g,tah=tah,inv2=bool(r)))
GRP={'CB':'D','LB':'D','RB':'D','DM':'M','CM':'M','AM':'M','LM':'A','RM':'A','LW':'A','RW':'A','ST':'A'}
def nearest(v,cent):return min(cent,key=lambda k:sum((a-b)**2 for a,b in zip(v,cent[k])))
_c={}
for q in rows:
    if q['ident']['positions'] and not q['gk'] and None not in q['a']:_c.setdefault(q['ident']['positions'][0],[]).append(q['a'])
_c={k:[st.mean(c) for c in zip(*v)] for k,v in _c.items() if len(v)>=10}
for q in rows:
    if q['gk'] or not q['ident']['positions'] or q['inv2']:continue
    v=[x if x is not None else 60 for x in q['a']];guess=nearest(v,_c)
    tp=q['ident']['positions'][0]
    if (tp=='CB' and guess in ('ST','LW','RW','AM')) or (tp=='ST' and guess=='CB'):   # centre-back vs forward: a namesake
        q['ident']=dict(id='fm-'+re.sub(r'[^a-z0-9]+','-',norm(q['name'])).strip('-'),positions=[],foot='R',wf=3,h=180,nation='',club='',league='',former=[],age=None)
        q['tah']+=['positions','foot','height','weakFoot','nation','club','age']
# positions still unknown: nearest centroid (calibrated 14 attributes) of players whose primary position is known
cent={}
for q in rows:
    if q['ident']['positions'] and not q['gk'] and None not in q['a']:cent.setdefault(q['ident']['positions'][0],[]).append(q['a'])
cent={k:[st.mean(c) for c in zip(*v)] for k,v in cent.items() if len(v)>=10}
for q in rows:
    if not q['ident']['positions'] and not q['gk']:
        v=[x if x is not None else 60 for x in q['a']]
        q['ident']['positions']=[min(cent,key=lambda k:sum((a-b)**2 for a,b in zip(v,cent[k])))]
        if 'positions' not in q['tah']:q['tah'].append('positions')
# fill attributes that had no input at all with the position-group median
grp=lambda q:'GK' if q['gk'] else {'CB':'D','LB':'D','RB':'D','DM':'M','CM':'M','AM':'M','LM':'A','RM':'A','LW':'A','RW':'A','ST':'A'}.get((q['ident']['positions'] or ['CM'])[0],'M')
for idx,k in enumerate(K):
    med={}
    for G in 'DMAG':
        vals=[q['a'][idx] for q in rows if grp(q)==G and q['a'][idx] is not None];med[G]=round(st.median(vals)) if vals else 60
    for q in rows:
        if q['a'][idx] is None:q['a'][idx]=med[grp(q)]
for i,k in enumerate(GK):
    vals=[q['g'][i] for q in rows if q['gk'] and q['g'][i] is not None];m=round(st.median(vals)) if vals else 70
    for q in rows:
        if q['gk'] and q['g'][i] is None:q['g'][i]=m
# duplicate ids (two pool names resolving to the same TM id) get a suffix
seen={}
for q in rows:
    i=q['ident']['id']
    if i in seen:seen[i]+=1;q['ident']['id']=f"{i}-{seen[i]}"
    else:seen[i]=1
eksik=[q for q in rows if not q['ident']['club'] or not q['ident']['age']]
rows=[q for q in rows if q['ident']['club'] and q['ident']['age']]
json.dump([q['name'] for q in eksik],open(H/'kimliksiz.json','w'),ensure_ascii=False)
print('kimlik bilgisi bulunamadığı için dışarıda',len(eksik))
lines=[]
for q in rows:
    d=q['ident'];lines.append('  '+json.dumps([d['id'],q['name'],d['positions'],d['foot'],d['wf'],d['h'],d['nation'],d['club'],d['league'],d['former'],d['age'],q['a'],q['g'],'FM (kullanıcı verisi, v2 ölçeğine kalibre)',sorted(set(q['tah']))],ensure_ascii=False))
out=f"""// ÜRETİLMİŞ DOSYA — elle düzenleme. Kaynak: kullanıcının FM özellik listeleri (birleşik havuz, {len(rows)} oyuncu), {TODAY.isoformat()}.
// Üretici: v2_cevir.py. 14+4 özellik FM özelliklerinden eşlendi ve ortak oyuncular üzerinden v2 ölçeğine kalibre edildi.
// Kimlik (mevki, ayak, boy, ülke, kulüp, yaş): önce draft-xi/data/havuz.mjs, yoksa Transfermarkt. Tahmini alanlar son sütunda.
// Sırası: [id, ad, mevkiler, ayak, zayıf ayak, boy, ülke, kulüp, lig, eski kulüpler, yaş, özellikler[14], kaleci[4]|null, değer kaynağı, tahmini alanlar]
export const KEYS = {json.dumps(K)};
export const GK_KEYS = {json.dumps(GK)};
const RAW = [
{(','+chr(10)).join(lines)}
];
export const HAVUZ = RAW.map(([id, name, positions, foot, weakFoot, height, nation, club, league, former, age, a, g, kaynak, tahmini]) => {{
  const attrs = Object.fromEntries(KEYS.map((k, i) => [k, a[i]]));
  if (g) GK_KEYS.forEach((k, i) => {{ attrs[k] = g[i]; }});
  return {{ id, name, positions, foot, weakFoot, height, nation, club, league, former, age, attrs, kaynak, tahmini }};
}});
export const HAVUZ_BY_ID = Object.fromEntries(HAVUZ.map((p) => [p.id, p]));
"""
open(ROOT/'draft-xi/data/havuz-fm.mjs','w',encoding='utf-8').write(out)
with open(H/'havuz-fm.csv','w',encoding='utf-8',newline='') as f:
    w=csv.writer(f);w.writerow(['id','ad','mevkiler','ayak','zayif_ayak','boy','ulke','kulup','lig','yas']+K+GK+['tahmini'])
    for q in rows:
        d=q['ident'];w.writerow([d['id'],q['name'],'/'.join(d['positions']),d['foot'],d['wf'],d['h'],d['nation'],d['club'],d['league'],d['age']]+q['a']+(q['g'] or ['']*4)+[' '.join(sorted(set(q['tah'])))])
print(stats,'toplam',len(rows),'kaleci',sum(q['gk'] for q in rows))
print('kalibrasyon örnek sayısı:',{k:len(v[0]) for k,v in pairs.items()})
nopos=[q['name'] for q in rows if not q['ident']['positions']];print('mevkisiz',len(nopos),nopos[:15])
