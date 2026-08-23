#!/usr/bin/env python3
import json,re,unicodedata
from datetime import datetime,timezone
from pathlib import Path

import duckdb
import pandas as pd
import requests

ROOT=Path(__file__).resolve().parents[1]
MASTER=ROOT/'side-games'/'data'/'master'
RULES_PATH=MASTER/'xox-rules.json'
OUT_PATH=MASTER/'xox-players.json'
META_PATH=MASTER/'xox-meta.json'
TM_DB=ROOT/'.tmp-transfermarkt.duckdb'
PERF=ROOT/'.tmp-xox-player-performances.csv'
TM_URL='https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/transfermarkt-datasets.duckdb'
PERF_URL='https://media.githubusercontent.com/media/salimt/football-datasets/refs/heads/main/datalake/transfermarkt/player_performances/player_performances.csv'
MIN_PLAYERS=800
MAX_PLAYERS=5000
CHUNK=200_000
YOUTH_RE=re.compile(r'(\bu[- ]?(?:15|16|17|18|19|20|21|23)\b|under[- ]?(?:15|16|17|18|19|20|21|23)|youth|junioren|juniors|juvenil|primavera|academy|akademi|reserve|reserves)',re.I)
RESERVE_TEAM_RE=re.compile(r'(?:\s|[-–])(?:ii|iii|b|c)$',re.I)

def norm(s):
    s=unicodedata.normalize('NFKD',str(s or '')).encode('ascii','ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+','',s)

def download(url,path,min_size):
    if path.exists() and path.stat().st_size>=min_size:return
    with requests.get(url,stream=True,timeout=(30,300),headers={'User-Agent':'Mozilla/5.0 NEON-XI-XOX/1.0'}) as r:
        r.raise_for_status()
        with path.open('wb') as f:
            for part in r.iter_content(1024*1024):
                if part:f.write(part)
    if path.stat().st_size<min_size:raise RuntimeError(f'incomplete download: {path.name}')

COUNTRY_MAP={
'Turkey':'Türkiye','Türkiye':'Türkiye','Argentina':'Arjantin','Brazil':'Brezilya','France':'Fransa','Spain':'İspanya','Germany':'Almanya','Italy':'İtalya','England':'İngiltere','Portugal':'Portekiz','Netherlands':'Hollanda','Belgium':'Belçika','Croatia':'Hırvatistan','Serbia':'Sırbistan','Colombia':'Kolombiya','Morocco':'Fas','Algeria':'Cezayir','Egypt':'Mısır','Nigeria':'Nijerya','Senegal':'Senegal',"Cote d'Ivoire":'Fildişi Sahili','Ivory Coast':'Fildişi Sahili','Japan':'Japonya','Norway':'Norveç','Sweden':'İsveç'}

CLUB_ALIASES={
'Fenerbahçe':['Fenerbahce','Fenerbahçe SK','Fenerbahçe'],
'Galatasaray':['Galatasaray','Galatasaray SK'],
'Beşiktaş':['Besiktas','Beşiktaş JK','Besiktas JK','Beşiktaş'],
'Trabzonspor':['Trabzonspor'],
'Real Madrid':['Real Madrid'],
'Barcelona':['FC Barcelona','Barcelona'],
'Atlético Madrid':['Atlético de Madrid','Atletico de Madrid','Atlético Madrid','Atletico Madrid'],
'Sevilla':['Sevilla FC','Sevilla'],
'Manchester United':['Manchester United'],
'Manchester City':['Manchester City'],
'Liverpool':['Liverpool FC','Liverpool'],
'Arsenal':['Arsenal FC','Arsenal'],
'Chelsea':['Chelsea FC','Chelsea'],
'Tottenham Hotspur':['Tottenham Hotspur'],
'Newcastle United':['Newcastle United'],
'Juventus':['Juventus FC','Juventus'],
'Inter':['Inter Milan','Inter','FC Internazionale'],
'AC Milan':['AC Milan'],
'Roma':['AS Roma','Roma'],
'Napoli':['SSC Napoli','Napoli'],
'Bayern Münih':['Bayern Munich','Bayern München','FC Bayern Munich','FC Bayern München'],
'Borussia Dortmund':['Borussia Dortmund'],
'Bayer Leverkusen':['Bayer 04 Leverkusen','Bayer Leverkusen'],
'RB Leipzig':['RB Leipzig'],
'Paris Saint-Germain':['Paris Saint-Germain','Paris SG'],
'Olympique Marseille':['Olympique Marseille','Marseille'],
'Olympique Lyon':['Olympique Lyon','Olympique Lyonnais'],
'Ajax':['Ajax Amsterdam','Ajax'],
'PSV':['PSV Eindhoven','PSV'],
'Feyenoord':['Feyenoord Rotterdam','Feyenoord'],
'Benfica':['SL Benfica','Benfica'],
'Porto':['FC Porto','Porto'],
'Sporting CP':['Sporting CP','Sporting Lisbon']}

LEAGUE_ALIASES={
'Süper Lig':['Süper Lig','Super Lig'],
'Premier League':['Premier League'],
'LaLiga':['LaLiga','Primera División','Primera Division'],
'Serie A':['Serie A'],
'Bundesliga':['Bundesliga'],
'Ligue 1':['Ligue 1'],
'Eredivisie':['Eredivisie'],
'Primeira Liga':['Liga Portugal','Primeira Liga'],
'Saudi Pro League':['Saudi Pro League','Saudi Professional League'],
'MLS':['Major League Soccer','MLS']}

def alias_index(source):
    out={}
    for canon,aliases in source.items():
        for x in [canon,*aliases]:out[norm(x)]=canon
    return out

CLUB_INDEX=alias_index(CLUB_ALIASES)
LEAGUE_INDEX=alias_index(LEAGUE_ALIASES)

def senior_mask(df):
    team=df['team_name'].fillna('').astype(str).str.strip()
    comp=df['competition_name'].fillna('').astype(str).str.strip()
    return ~(team.str.contains(YOUTH_RE,na=False)|comp.str.contains(YOUTH_RE,na=False)|team.str.contains(RESERVE_TEAM_RE,na=False))

def main():
    rules=json.loads(RULES_PATH.read_text(encoding='utf-8'))
    allowed_nat=set(rules['nationalities']);allowed_clubs={c for arr in rules['clubs'].values() for c in arr};allowed_leagues=set(rules['leagues'])
    download(TM_URL,TM_DB,20_000_000);download(PERF_URL,PERF,100_000_000)
    con=duckdb.connect(str(TM_DB),read_only=True)
    prof=con.execute('''
      select player_id,name,current_club_name,country_of_citizenship,last_season,
             coalesce(market_value_in_eur,0) current_value,
             coalesce(highest_market_value_in_eur,0) highest_value,
             coalesce(international_caps,0) caps
      from players where player_id is not null and name is not null
    ''').df();con.close()
    profiles={int(r.player_id):r for r in prof.itertuples(index=False)}
    agg={}
    rows_read=rows_kept=0
    use=['player_id','competition_name','team_name','nb_on_pitch']
    for ch in pd.read_csv(PERF,usecols=use,chunksize=CHUNK,low_memory=False):
        rows_read+=len(ch);ch['player_id']=pd.to_numeric(ch['player_id'],errors='coerce');ch=ch[ch['player_id'].notna()]
        ch=ch[senior_mask(ch)]
        apps=pd.to_numeric(ch['nb_on_pitch'].replace({'-':0,'':0}),errors='coerce').fillna(0);ch=ch[apps>0]
        if ch.empty:continue
        for r in ch.itertuples(index=False):
            pid=int(r.player_id)
            if pid not in profiles:continue
            club=CLUB_INDEX.get(norm(r.team_name));league=LEAGUE_INDEX.get(norm(r.competition_name))
            if not club and not league:continue
            x=agg.setdefault(pid,{'clubs':set(),'leagues':set()})
            if club in allowed_clubs:x['clubs'].add(club)
            if league in allowed_leagues:x['leagues'].add(league)
            rows_kept+=1
    records=[]
    for pid,p in profiles.items():
        nationality=COUNTRY_MAP.get(str(p.country_of_citizenship))
        x=agg.get(pid,{'clubs':set(),'leagues':set()})
        clubs=sorted(x['clubs']);leagues=sorted(x['leagues'])
        if nationality not in allowed_nat and not clubs and not leagues:continue
        current_club=None if pd.isna(p.current_club_name) else str(p.current_club_name)
        score=(float(p.current_value or 0)/1_000_000)*2+(float(p.highest_value or 0)/1_000_000)*.55+float(p.caps or 0)*.8+len(clubs)*16+len(leagues)*8
        season=int(p.last_season) if pd.notna(p.last_season) else 0
        if season>=2025:score+=90
        elif season>=2022:score+=45
        elif season>=2015:score+=15
        if clubs:score+=70
        records.append({'id':pid,'name':str(p.name),'nationality':nationality,'nationalTeam':nationality,'currentClub':current_club,'clubs':clubs,'leagues':leagues,'status':'active' if season>=2025 else ('recent' if season>=2015 else 'legend'),'recognitionScore':round(score,2)})
    records.sort(key=lambda r:(-r['recognitionScore'],r['name']))
    # Keep a broad but mobile-friendly pool; ensure historical stars survive via peak value/caps score.
    records=records[:MAX_PLAYERS]
    if len(records)<MIN_PLAYERS:raise SystemExit(f'XOX pool only {len(records)} players; minimum {MIN_PLAYERS}')
    OUT_PATH.write_text(json.dumps(records,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    meta={'generated_at':datetime.now(timezone.utc).isoformat(),'player_count':len(records),'minimum_required':MIN_PLAYERS,'rows_read':rows_read,'matched_performance_rows':rows_kept,'identity':'Transfermarkt player_id','club_rule':'at least one senior official appearance in Transfermarkt performance archive','league_rule':'at least one senior official league appearance','nationality_rule':'Transfermarkt country_of_citizenship mapped to XOX whitelist','sources':{'profiles':TM_URL,'career_performances':PERF_URL,'rules':'side-games/data/master/xox-rules.json'}}
    META_PATH.write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(meta,ensure_ascii=False))

if __name__=='__main__':main()
