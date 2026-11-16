#!/usr/bin/env python3
"""API-Football season stats, spent carefully on the free plan → side-games/data/api-football/.

Free plan: 100 requests a day, seasons 2022–2024 only (2022-23 … 2024-25), about 10 requests a minute. Used as a
validation source for career totals (docs/roadmap.md), so the requests go where our players are:

  1. once per league and season: /teams?league&season  (team ids and names)
  2. clubs ranked by how famous the pool players at them are (sum of recognition of active pool players whose
     current club matches the team by name), then /players?team&season&page (20 players per request) for the
     best-ranked clubs not fetched yet, page by page until the day's budget is spent.

State (what was fetched, when, how many requests today) lives in state.json, so each run continues where the
last one stopped and never asks twice for the same page. Output: players-<season>.json with compact rows per
player (identity + per-competition season stats). The API key is never read here: the cloud environment's proxy
adds the x-apisports-key header (host v3.football.api-sports.io); outside it set API_FOOTBALL_KEY.

Run: python3 scripts/fetch_api_football.py --season 2024 --budget 90
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import time
import unicodedata
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "side-games" / "data" / "api-football"
MASTER = ROOT / "side-games" / "data" / "master" / "transfermarkt-players.json"
API = "https://v3.football.api-sports.io"
# API-Football league ids for the leagues our best-known active players play in (checked against /leagues).
LEAGUES = {203: "super-lig", 39: "premier-league", 135: "serie-a", 140: "laliga", 78: "bundesliga", 61: "ligue-1",
           307: "saudi-pro-league", 94: "liga-portugal", 88: "eredivisie", 197: "super-league-1", 235: "premier-liga",
           144: "jupiler-pro-league", 71: "campeonato-brasileiro-serie-a", 253: "major-league-soccer"}
MIN_GAP_S = 6.5  # stay under ~10 requests a minute


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", str(s).lower().replace("ı", "i"))
    s = "".join(ch for ch in s if ch.isalnum() or ch == " ")
    s = re.sub(r"\b(fc|cf|sk|jk|fk|afc|sc|ac|as|ss|ssc|club|de|cd|ud|calcio|1907|1905|1903|spor kulubu|kulubu|futbol)\b", " ", s)
    return " ".join(s.split())


class Client:
    def __init__(self, state: dict, budget: int):
        self.state, self.budget, self.last = state, budget, 0.0

    def left(self) -> int:
        today = dt.date.today().isoformat()
        used = self.state.setdefault("used", {}).get(today, 0)
        return min(self.budget - self.state.get("_run", 0), 100 - used)

    def get(self, path: str, **params):
        if self.left() <= 0:
            raise RuntimeError("budget spent")
        wait = MIN_GAP_S - (time.time() - self.last)
        if wait > 0:
            time.sleep(wait)
        url = f"{API}/{path}?{urllib.parse.urlencode(params)}"
        req = urllib.request.Request(url, headers={"x-apisports-key": os.environ.get("API_FOOTBALL_KEY", "proxy-injected"),
                                                   "User-Agent": "neonxi-data/1.0"})
        with urllib.request.urlopen(req, timeout=60) as r:
            data = json.load(r)
        self.last = time.time()
        today = dt.date.today().isoformat()
        self.state["used"][today] = self.state["used"].get(today, 0) + 1
        self.state["_run"] = self.state.get("_run", 0) + 1
        if data.get("errors"):
            raise RuntimeError(f"{path} {params}: {data['errors']}")
        return data


def compact(item: dict) -> dict:
    p = item["player"]
    stats = []
    for s in item.get("statistics") or []:
        g, gl = s.get("games") or {}, s.get("goals") or {}
        if not (g.get("appearences") or g.get("minutes")):
            continue
        stats.append({"team": (s.get("team") or {}).get("name"), "teamId": (s.get("team") or {}).get("id"),
                      "league": (s.get("league") or {}).get("name"), "leagueId": (s.get("league") or {}).get("id"),
                      "apps": g.get("appearences") or 0, "minutes": g.get("minutes") or 0, "goals": gl.get("total") or 0,
                      "assists": gl.get("assists") or 0, "yellow": (s.get("cards") or {}).get("yellow") or 0,
                      "red": (s.get("cards") or {}).get("red") or 0})
    b = p.get("birth") or {}
    return {"id": p.get("id"), "name": p.get("name"), "first": p.get("firstname"), "last": p.get("lastname"),
            "birth": b.get("date"), "nationality": p.get("nationality"), "height": p.get("height"), "stats": stats}


def club_priority(teams: dict[int, dict]) -> list[tuple[float, int]]:
    """Teams ranked by the recognition of the active pool players currently there."""
    pool = json.loads(MASTER.read_text(encoding="utf-8"))
    by_club: dict[str, float] = defaultdict(float)
    for p in pool:
        if p.get("status") == "active" and p.get("current_club"):
            by_club[norm(p["current_club"])] += float(p.get("recognition_score") or 0)
    ranked = []
    for tid, t in teams.items():
        key = norm(t["name"])
        score = by_club.get(key, 0.0)
        if not score:  # "Galatasaray" vs "Galatasaray Spor Kulübü": fall back to containment either way
            score = max((v for k, v in by_club.items() if k and key and (key in k or k in key)), default=0.0)
        ranked.append((score, tid))
    ranked.sort(reverse=True)
    return ranked


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--season", type=int, default=2024)
    ap.add_argument("--budget", type=int, default=90, help="requests this run (the day's cap is 100)")
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    state_path, players_path = OUT / "state.json", OUT / f"players-{args.season}.json"
    state = json.loads(state_path.read_text()) if state_path.exists() else {}
    state["_run"] = 0
    players = json.loads(players_path.read_text()) if players_path.exists() else {}
    season = state.setdefault("seasons", {}).setdefault(str(args.season), {"teams": {}, "pages": {}})
    api = Client(state, args.budget)
    try:  # /status does not count against the quota: start from the account's real count for today
        req = urllib.request.Request(f"{API}/status", headers={"x-apisports-key": os.environ.get("API_FOOTBALL_KEY", "proxy-injected")})
        with urllib.request.urlopen(req, timeout=30) as r:
            cur = (json.load(r).get("response") or {}).get("requests", {}).get("current")
        if isinstance(cur, int):
            state.setdefault("used", {})[dt.date.today().isoformat()] = cur
    except Exception as e:
        print("status check skipped:", e)
    fetched_players = 0
    try:
        for lid in LEAGUES:  # 1. team lists (once per league and season)
            if str(lid) in season.setdefault("leagues", {}):
                continue
            data = api.get("teams", league=lid, season=args.season)
            for t in data["response"]:
                season["teams"][str(t["team"]["id"])] = {"name": t["team"]["name"], "league": lid}
            season["leagues"][str(lid)] = dt.date.today().isoformat()
        teams = {int(k): v for k, v in season["teams"].items()}
        for score, tid in club_priority(teams):  # 2. players of the best-ranked clubs, page by page
            if score <= 0:
                break
            page_state = season["pages"].setdefault(str(tid), {"done": [], "total": None})
            total = page_state["total"]
            page = 1
            while total is None or page <= total:
                if page in page_state["done"]:
                    page += 1
                    continue
                data = api.get("players", team=tid, season=args.season, page=page)
                page_state["total"] = total = (data.get("paging") or {}).get("total") or 1
                for item in data["response"]:
                    row = compact(item)
                    if row["stats"]:
                        players[str(row["id"])] = row
                        fetched_players += 1
                page_state["done"].append(page)
                page += 1
    except RuntimeError as e:
        if "budget spent" not in str(e):
            print("stopped:", e)
    finally:
        state.pop("_run", None)
        state_path.write_text(json.dumps(state, ensure_ascii=False, indent=1))
        players_path.write_text(json.dumps(players, ensure_ascii=False, separators=(",", ":")))
    done_clubs = sum(1 for v in season["pages"].values() if v["total"] and len(v["done"]) >= v["total"])
    today = dt.date.today().isoformat()
    print(f"season {args.season}: {len(players)} players stored (+{fetched_players} this run), "
          f"{done_clubs} clubs complete, requests today {state['used'].get(today, 0)}/100")


if __name__ == "__main__":
    main()
