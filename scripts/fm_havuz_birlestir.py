#!/usr/bin/env python3
"""draft-xi/data/fm-kaynak/partiler/*.csv → havuz.json. Oyuncu partilerini birleştirir: tekrar, çelişki, hatalı/eksik değer raporu. Kullanım: python3 havuz.py"""
import csv,re,json,unicodedata,pathlib,sys
ROOT=pathlib.Path(globals().get('__file__','scripts/fm_havuz_birlestir.py')).resolve().parents[1]/'draft-xi/data/fm-kaynak'
ATTRS=['Crossing','Dribbling','Finishing','First Touch','Heading','Long Shots','Marking','Passing','Tackling','Technique',
 'Aggression','Anticipation','Bravery','Composure','Concentration','Decisions','Determination','Flair','Leadership','Off the Ball',
 'Positioning','Teamwork','Vision','Work Rate','Acceleration','Agility','Balance','Jumping Reach','Natural Fitness','Pace','Stamina','Strength']
GK_ATTRS=['Aerial Reach','Command of Area','Communication','Eccentricity','First Touch','Handling','Kicking','One on Ones','Passing',
 'Punching (Tendency)','Reflexes','Rushing Out (Tendency)','Technique','Throwing',
 'Aggression','Anticipation','Bravery','Composure','Concentration','Decisions','Determination','Flair','Leadership','Off the Ball',
 'Positioning','Teamwork','Vision','Work Rate','Acceleration','Agility','Balance','Jumping Reach','Natural Fitness','Pace','Stamina','Strength']
ALL_ATTRS=set(ATTRS)|set(GK_ATTRS)
def attrs_for(d):return GK_ATTRS if any(k in d for k in ('Reflexes','Handling','One on Ones','Aerial Reach')) else ATTRS
def norm(n):  # "Jurriën Timber" == "Jurrien Timber" == "jurrien  timber"
    n=unicodedata.normalize('NFKD',n.replace('ı','i').replace('ø','o').replace('ł','l').replace('đ','d')).encode('ascii','ignore').decode()
    return re.sub(r'\s+',' ',n).strip().lower()
NAME_RE=re.compile(r'^(.+?)(?: \((key|preferred)\))?$')
def base(t):
    m=NAME_RE.match(t);k=m.group(1).strip()
    return (t.strip(),None) if t.strip() in ALL_ATTRS else (k,m.group(2))
def parse(skills):
    """Token based: an attribute name followed by its number. A name followed directly by another name = value missing."""
    toks=[t.strip() for t in skills.replace('\r','').split('\n') if t.strip()];d={};bad=[];i=0
    while i<len(toks):
        k,role=base(toks[i])
        if k not in ALL_ATTRS:bad.append(f'beklenmeyen satır "{toks[i][:25]}"');i+=1;continue
        nxt=toks[i+1] if i+1<len(toks) else None
        if nxt is not None and re.fullmatch(r'\d{1,2}',nxt) and 1<=int(nxt)<=99:d[k]={'v':int(nxt),'r':role};i+=2
        elif nxt is not None and base(nxt)[0] not in ALL_ATTRS:d[k]={'v':None,'raw':nxt,'r':role};bad.append(f'{k}="{nxt}"');i+=2
        else:bad.append(f'{k} değeri yok');i+=1
    return d,bad
pool={};log=[]
for f in sorted((ROOT/'partiler').glob('*.csv')):
    rows=list(csv.DictReader(open(f,encoding='utf-8-sig')))
    rep={'isaretsiz':0,'parti':f.name,'satir':len(rows),'yeni':[],'tekrar_ayni':[],'tekrar_farkli':[],'parti_ici_tekrar':[],'hatali':{},'eksik':{},'bilinmeyen':{}}
    seen={}
    for r in rows:
        name=(r.get('name') or '').strip();key=norm(name)
        if not key:continue
        d,bad=parse(r.get('skills',''))
        if key in seen:
            first=seen[key];diff=[f"{a}: {first.get(a,{}).get('v')}→{d.get(a,{}).get('v')}" for a in ALL_ATTRS if first.get(a,{}).get('v')!=d.get(a,{}).get('v')]
            rep['parti_ici_tekrar'].append(name+(f" ({len(diff)} fark: {'; '.join(diff[:4])}{' …' if len(diff)>4 else ''})" if diff else ' (aynı)'));continue
        seen[key]=d
        if not any(v.get('r') for v in d.values()):rep['isaretsiz']+=1
        A=attrs_for(d);miss=[a for a in A if a not in d];unk=[k for k in d if k not in ALL_ATTRS]
        if bad:rep['hatali'][name]=bad
        if miss and not bad:rep['eksik'][name]=miss
        elif miss:rep['eksik'][name]=[m for m in miss if not any(b.startswith(m) for b in bad)] or None
        if rep['eksik'].get(name) is None:rep['eksik'].pop(name,None)
        if unk:rep['bilinmeyen'][name]=unk
        if key in pool:
            old=pool[key];oa,na=old['attrs'],d
            hasr=lambda x:any(v.get('r') for v in x.values())
            ch=[f"{a}: {oa.get(a,{}).get('v')}→{na.get(a,{}).get('v')}" for a in ALL_ATTRS if oa.get(a,{}).get('v')!=na.get(a,{}).get('v')]
            if hasr(oa) and hasr(na):ch+=[f"{a} işareti: {oa.get(a,{}).get('r') or '-'}→{na.get(a,{}).get('r') or '-'}" for a in ATTRS if oa.get(a,{}).get('r')!=na.get(a,{}).get('r')]
            if hasr(na) and not hasr(oa):
                for a in ATTRS:
                    if a in oa and a in na:oa[a]['r']=na[a]['r']
            (rep['tekrar_farkli'] if ch else rep['tekrar_ayni']).append(name+(f" ({len(ch)} fark: {'; '.join(ch[:5])}{' …' if len(ch)>5 else ''})" if ch else ''))
            old['partiler'].append(f.name)
            if ch:old.setdefault('celiski',[]).append({f.name:ch})
        else:
            pool[key]={'name':name,'attrs':d,'partiler':[f.name],'kaleci':A is GK_ATTRS};rep['yeni'].append(name)
    log.append(rep)
for rep in log:
    print(f"\n== {rep['parti']}: {rep['satir']} satır · yeni {len(rep['yeni'])} · tekrar (aynı) {len(rep['tekrar_ayni'])} · tekrar (FARKLI) {len(rep['tekrar_farkli'])} · key/preferred işaretsiz {rep['isaretsiz']}")
    for k,t in [('parti_ici_tekrar','Parti içinde iki kez'),('tekrar_farkli','Daha önce farklı değerlerle gelmiş'),('hatali','Sayı olmayan değer'),('eksik','Eksik özellik'),('bilinmeyen','Tanınmayan özellik adı')]:
        if rep[k]:print(f"  ! {t}: {rep[k]}")
print(f"\nHAVUZ: {len(pool)} benzersiz oyuncu")
json.dump({'oyuncular':list(pool.values()),'rapor':log},open(ROOT/'havuz.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
