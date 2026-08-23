#!/usr/bin/env python3
import json, re
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'side-games'/'career-twin'/'data'
TMP=ROOT/'.tmp-career-twin-player-performances.csv'
ARCHIVE_URL='https://media.githubusercontent.com/media/salimt/football-datasets/refs/heads/main/datalake/transfermarkt/player_performances/player_performances.csv'
TEAM_SEASONS_URL='https://raw.githubusercontent.com/salimt/football-datasets/main/datalake/transfermarkt/team_competitions_seasons/team_competitions_seasons.csv'
CHUNK=180_000

YOUTH_RE=re.compile(r'(\bu[- ]?(?:15|16|17|18|19|20|21|23)\b|under[- ]?(?:15|16|17|18|19|20|21|23)|youth|junioren|juniors|juvenil|primavera|academy|akademi|reserve|reserves)',re.I)
RESERVE_TEAM_RE=re.compile(r'(?:\s|[-–])(?:ii|iii|b|c)$',re.I)
TEAM_ID_RE=re.compile(r'/verein/(\d+)')
COMP_ID_RE=re.compile(r'/wettbewerb/([^/]+)')
SEASON_ID_RE=re.compile(r'/saison_id/(\d+)')


def download():
    if TMP.exists() and TMP.stat().st_size>100_000_000:
        return
    headers={'User-Agent':'Mozilla/5.0 NEON-XI-Career-Twin/2.1'}
    with requests.get(ARCHIVE_URL,stream=True,timeout=(30,300),headers=headers) as r:
        r.raise_for_status()
        with TMP.open('wb') as f:
            for part in r.iter_content(1024*1024):
                if part:f.write(part)
    if TMP.stat().st_size<100_000_000:
        raise RuntimeError(f'archive too small: {TMP.stat().st_size}')


def num(series):
    return pd.to_numeric(series.replace({'-':0,'':0,'None':0,'nan':0}),errors='coerce').fillna(0)


def senior_mask(df):
    team=df['team_name'].fillna('').astype(str).str.strip()
    comp=df['competition_name'].fillna('').astype(str).str.strip()
    youth=team.str.contains(YOUTH_RE,na=False)|comp.str.contains(YOUTH_RE,na=False)
    reserve=team.str.contains(RESERVE_TEAM_RE,na=False)
    return ~(youth|reserve)


def team_key(url,name):
    s=str(url or '')
    m=TEAM_ID_RE.search(s)
    if m:return 'id:'+m.group(1)
    return 'name:'+str(name or '').strip().lower()


def parse_ids(team_url,competition_url,season_value):
    tm=TEAM_ID_RE.search(str(team_url or ''))
    cm=COMP_ID_RE.search(str(competition_url or ''))
    sm=SEASON_ID_RE.search(str(competition_url or '')) or SEASON_ID_RE.search(str(team_url or ''))
    team_id=int(tm.group(1)) if tm else None
    comp_id=cm.group(1) if cm else None
    season_id=int(sm.group(1)) if sm else None
    if season_id is None:
        s=str(season_value or '')
        m=re.search(r'(\d{2,4})',s)
        if m:
            y=int(m.group(1)); season_id=(2000+y if y<60 else 1900+y) if y<100 else y
    return team_id,comp_id,season_id


def load_unique_champions():
    # Conservative trophy rule: a competition-season counts only when the archive
    # contains exactly one team ranked #1. This avoids counting group-stage winners.
    cols=['club_id','competition_id','season_id','season_rank']
    df=pd.read_csv(TEAM_SEASONS_URL,usecols=cols,low_memory=False)
    df['club_id']=pd.to_numeric(df['club_id'],errors='coerce')
    df['season_id']=pd.to_numeric(df['season_id'],errors='coerce')
    df['season_rank']=pd.to_numeric(df['season_rank'],errors='coerce')
    df=df[(df['season_rank']==1)&df['club_id'].notna()&df['season_id'].notna()&df['competition_id'].notna()].copy()
    df['club_id']=df['club_id'].astype(int);df['season_id']=df['season_id'].astype(int);df['competition_id']=df['competition_id'].astype(str)
    df=df.drop_duplicates(['competition_id','season_id','club_id'])
    counts=df.groupby(['competition_id','season_id'])['club_id'].nunique()
    valid=set(counts[counts==1].index)
    winners={}
    for r in df.itertuples(index=False):
        key=(r.competition_id,int(r.season_id))
        if key in valid:winners[key]=int(r.club_id)
    print(f'unique champion competition-seasons={len(winners):,}',flush=True)
    return winners


def main():
    players=json.loads((DATA/'players.json').read_text(encoding='utf-8'))
    candidates=json.loads((DATA/'candidates.json').read_text(encoding='utf-8'))
    byid={int(p['id']):p for p in players+candidates}
    wanted=set(byid)
    if not wanted:raise RuntimeError('no Career Twin candidates')

    download()
    champions=load_unique_champions()
    agg={pid:{'apps':0,'goals':0,'assists':0,'clubs':set(),'rows':0,'trophy_keys':set()} for pid in wanted}
    usecols=['player_id','season','competition_url','competition_name','team_url','team_name','nb_on_pitch','goals','assists']
    read_rows=matched_rows=0
    for chunk in pd.read_csv(TMP,usecols=usecols,chunksize=CHUNK,low_memory=False):
        read_rows+=len(chunk)
        chunk['player_id']=pd.to_numeric(chunk['player_id'],errors='coerce')
        chunk=chunk[chunk['player_id'].isin(wanted)]
        if chunk.empty:continue
        chunk=chunk[senior_mask(chunk)]
        if chunk.empty:continue
        chunk['apps']=num(chunk['nb_on_pitch'])
        chunk['g']=num(chunk['goals'])
        chunk['a']=num(chunk['assists'])
        chunk=chunk[chunk['apps']>0]
        matched_rows+=len(chunk)
        for row in chunk.itertuples(index=False):
            pid=int(row.player_id);x=agg[pid]
            x['apps']+=int(row.apps);x['goals']+=int(row.g);x['assists']+=int(row.a);x['rows']+=1
            x['clubs'].add(team_key(row.team_url,row.team_name))
            team_id,comp_id,season_id=parse_ids(row.team_url,row.competition_url,row.season)
            if team_id is not None and comp_id and season_id is not None:
                ck=(comp_id,season_id)
                if champions.get(ck)==team_id:x['trophy_keys'].add(ck)
        if read_rows%900000<CHUNK:
            print(f'archive rows={read_rows:,} matched={matched_rows:,}',flush=True)

    matched_players=trophy_filled=0
    for pid,p in byid.items():
        a=agg[pid]
        if a['apps']<=0:continue
        matched_players+=1
        p['career_appearances']=a['apps']
        p['career_goals']=a['goals']
        p['career_assists']=a['assists']
        if a['clubs']:p['club_count']=len(a['clubs'])
        p.setdefault('sources',{})['career_stats']='salimt/football-datasets Transfermarkt player_performances'
        p['sources']['club_count']='salimt/football-datasets Transfermarkt player_performances'
        # Keep a direct Transfermarkt/UOC trophy total when available; otherwise
        # use the conservative champion-season derivation from the open archive.
        if p.get('trophies') is None:
            p['trophies']=len(a['trophy_keys'])
            p['sources']['trophies']='salimt/football-datasets unique champion seasons'
            trophy_filled+=1

    req=['height_cm','weight_kg','birth_date','club_count','trophies','career_goals','career_assists','peak_market_value_eur','career_appearances']
    playable=[];remaining=[]
    for p in byid.values():
        complete=all(p.get(k) is not None for k in req) and int(p.get('career_appearances') or 0)>0
        p['playable']=bool(complete)
        (playable if complete else remaining).append(p)
    key=lambda p:(not bool(p.get('turkish_familiar')),-float(p.get('recognition_score') or 0))
    playable.sort(key=key);remaining.sort(key=key)
    (DATA/'players.json').write_text(json.dumps(playable,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    (DATA/'candidates.json').write_text(json.dumps(remaining,ensure_ascii=False,separators=(',',':')),encoding='utf-8')

    meta=json.loads((DATA/'meta.json').read_text(encoding='utf-8'))
    meta.update({
        'generated_at':datetime.now(timezone.utc).isoformat(),
        'playable_count':len(playable),'candidate_count':len(remaining),
        'open_archive_rows_read':read_rows,'open_archive_rows_matched':matched_rows,'open_archive_players_matched':matched_players,
        'open_archive_trophies_filled':trophy_filled,'unique_champion_seasons':len(champions),
        'career_stats_source':'salimt/football-datasets Transfermarkt player_performances; senior club competition rows summed',
        'trophy_fallback_source':'salimt/football-datasets; unique #1 team per competition-season only',
        'zero_appearance_records_playable':False
    })
    meta.setdefault('sources',{})['career_performance_archive']=ARCHIVE_URL
    meta['sources']['team_competition_seasons']=TEAM_SEASONS_URL
    (DATA/'meta.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'playable':len(playable),'remaining':len(remaining),'career_players':matched_players,'matched_rows':matched_rows,'trophy_filled':trophy_filled},ensure_ascii=False),flush=True)

if __name__=='__main__':main()
