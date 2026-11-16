#!/usr/bin/env python3
"""Question bank for the NEON XI conquest game → side-games/fethet/data/questions.json.

Three kinds, generated ahead of time from the cross-checked player pool so a match never waits on data and every
question can be audited:
  * estimate      — numeric, closest answer wins ("Arda Güler kaç A milli maça çıktı?"); used for the first land
                    grab and to break ties.
  * career        — "Bu kulüplerde sırasıyla oynayan kim?"; four players, one path.
  * intersection  — "Hem Fenerbahçe hem Real Madrid'de oynayan hangisi?"; one player who did, three who played
                    for only one of the two (so they look right).
Rules that keep it correct:
  * only well-known players (recognition), only fields from a trusted or whole-career source;
  * wrong options are checked: a distractor never also fits the question;
  * each question carries difficulty (easy/medium/hard) and the clubs it touches, so the game can theme a
    city's battle on its club.
"""
from __future__ import annotations

import json
import random
import re
from collections import defaultdict
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "side-games" / "data" / "master" / "transfermarkt-players.json"
XOX = ROOT / "side-games" / "data" / "master" / "xox-players.json"
XOX_SUPPLEMENT = ROOT / "side-games" / "data" / "master" / "xox-club-supplement.json"
XOX_RULES = ROOT / "side-games" / "data" / "master" / "xox-rules.json"
OUT = ROOT / "side-games" / "fethet" / "data" / "questions.json"
FACTS = ROOT / "side-games" / "fethet" / "data" / "facts-curated.json"
WHOLE_CAREER = {"wikidata_league", "wikipedia_infobox"}
SEED = 20261116

# Wikidata club labels → the names people use.
CLUB_CLEAN = [
    (r"\s*\((?:football|futbol takımı|association football club)\)$", ""),
    (r"^(?:Real Madrid Club de Fútbol)$", "Real Madrid"), (r"^Futbol Club Barcelona$|^FC Barcelona$", "Barcelona"),
    (r"^Fenerbahçe S\.K\.?$", "Fenerbahçe"), (r"^Galatasaray S\.K\.?$", "Galatasaray"), (r"^Beşiktaş J\.K\.?$", "Beşiktaş"),
    (r"^Trabzonspor\b.*", "Trabzonspor"), (r"^İstanbul Başakşehir.*", "Başakşehir"), (r"^MKE Ankaragücü$", "Ankaragücü"),
    (r"^Çaykur Rizespor$", "Rizespor"), (r"^Gaziantep F\.K\.$", "Gaziantep"), (r"^Amed S\.F\.K\.$", "Amedspor"), (r"^Manchester United F\.C\.$", "Manchester United"),
    (r"^Manchester City F\.C\.$", "Manchester City"), (r"^Liverpool F\.C\.$", "Liverpool"), (r"^Chelsea F\.C\.$", "Chelsea"),
    (r"^Arsenal F\.C\.$", "Arsenal"), (r"^Tottenham Hotspur F\.C\.$", "Tottenham"), (r"^Juventus F\.C\.$|^Juventus FC$", "Juventus"),
    (r"^A\.C\. Milan$|^AC Milan$", "Milan"), (r"^Inter Milan$|^FC Internazionale Milano$", "Inter"),
    (r"^FC Bayern Munich$|^Bayern Munich$", "Bayern Münih"), (r"^Borussia Dortmund$", "Dortmund"),
    (r"^Paris Saint-Germain F\.C\.$|^Paris Saint-Germain FC$", "PSG"), (r"^Atlético Madrid$", "Atlético Madrid"),
    (r"\s+Istanbul$", ""), (r"\s+(?:Calcio|BC)(?:\s+\d{4})?$", ""), (r"\s+\d{4}$", ""),
    (r"\s+(?:F\.C\.|FC|S\.K\.|J\.K\.|A\.Ş\.|CF|AFC|A\.F\.C\.|SC|S\.C\.|C\.F\.)$", ""),
    (r"^(?:FC|AFC|SC|AC|AS|SS|SSC|US|S\.L\.|C\.D\.|A\.C\.|A\.S\.|S\.S\.|R\.C\.D\.|RCD|RC|SL|CD|CA|Club|Real Club)\s+", ""),
    (r"\s+(?:Calcio)$", ""),
    (r"^Atlético de Madrid$", "Atlético Madrid"), (r"^Olympique Lyonnais$", "Lyon"), (r"^Olympique de Marseille$", "Marseille"),
    (r"^Sporting Clube de Portugal$|^Sporting CP$", "Sporting"), (r"^Futebol Clube do Porto$|^Porto$", "Porto"),
    (r"^PFC CSKA Moscow$", "CSKA Moskova"), (r"^K\.R\.C\. Genk$|^KRC Genk$", "Genk"), (r"^Lille OSC$|^LOSC Lille$", "Lille"),
    (r"^São Paulo FC$", "São Paulo"), (r"^Zenit Saint Petersburg$", "Zenit"), (r"^Spartak Moscow$", "Spartak Moskova"),
]


def clean_club(name: str) -> str:
    out = name.strip()
    for pat, rep in CLUB_CLEAN:
        out = re.sub(pat, rep, out)
    return out.strip()


def difficulty(rec: float) -> str:
    return "easy" if rec >= 450 else "medium" if rec >= 260 else "hard"


def age_years(birth: str) -> int | None:
    try:
        b = date.fromisoformat(birth[:10])
    except (TypeError, ValueError):
        return None
    t = date.today()
    return t.year - b.year - ((t.month, t.day) < (b.month, b.day))


def estimate_questions(players: list[dict]) -> list[dict]:
    out = []
    for p in players:
        name, rec, clubs = p["name"], float(p.get("recognition_score") or 0), [clean_club(c) for c in (p.get("career_clubs") or [])]
        base = {"type": "estimate", "player": name, "playerId": p["id"], "difficulty": difficulty(rec), "clubs": sorted(set(clubs))[:8]}
        caps, ig = p.get("international_caps"), p.get("international_goals")
        if caps and caps >= 15:
            out.append({**base, "q": f"{name} kaç A milli maça çıktı?", "answer": caps, "unit": "maç", "field": "caps"})
        if ig and ig >= 8 and caps and ig <= caps:
            out.append({**base, "q": f"{name} millî takımda kaç gol attı?", "answer": ig, "unit": "gol", "field": "intlGoals"})
        if p.get("career_stats_source") in WHOLE_CAREER:
            g, ap = p.get("career_goals"), p.get("career_appearances")
            if g and g >= 40 and p.get("position") in ("Attack", "Midfield"):
                out.append({**base, "q": f"{name} kulüp kariyerinde kaç lig golü attı?", "answer": g, "unit": "gol", "field": "careerGoals"})
            if ap and ap >= 150:
                out.append({**base, "q": f"{name} kulüp kariyerinde kaç lig maçına çıktı?", "answer": ap, "unit": "maç", "field": "careerApps"})
        sl = p.get("superlig_appearances")
        if sl and sl >= 40:
            out.append({**base, "q": f"{name} Süper Lig'de kaç maça çıktı?", "answer": sl, "unit": "maç", "field": "superLig"})
        wc = p.get("world_cups")
        if wc and wc >= 2:
            out.append({**base, "q": f"{name} kaç Dünya Kupası kadrosunda yer aldı?", "answer": wc, "unit": "turnuva", "field": "worldCups"})
        b = p.get("birth_date") or ""
        if re.match(r"^\d{4}-\d{2}-\d{2}$", b) and b[5:] != "01-01" and rec >= 300:
            out.append({**base, "q": f"{name} hangi yıl doğdu?", "answer": int(b[:4]), "unit": "", "field": "birthYear"})
        h = p.get("height_cm")
        if h and 160 <= h <= 205 and rec >= 350:
            out.append({**base, "q": f"{name} kaç santim boyunda?", "answer": h, "unit": "cm", "field": "height"})
    return out


def known_clubs(players: list[dict], min_players: int = 25) -> set[str]:
    """Clubs that appear in many well-known careers: the ones a fan can place."""
    freq: dict[str, int] = defaultdict(int)
    for p in players:
        for c in {clean_club(c) for c in (p.get("career_clubs") or [])}:
            freq[c] += 1
    return {c for c, n in freq.items() if n >= min_players}


def follow_up_for_player(p: dict, rnd: random.Random | None = None) -> dict | None:
    """Open-ended tie-break when both sides got the multiple-choice question right: one of several facts about
    the player (not always league games), so tie-breaks do not repeat."""
    name, opts = p["name"], []
    whole = p.get("career_stats_source") in WHOLE_CAREER
    if whole and (p.get("career_appearances") or 0) >= 100:
        opts.append({"q": f"{name} kulüp kariyerinde kaç lig maçına çıktı?", "answer": p["career_appearances"], "unit": "maç"})
    if whole and (p.get("career_goals") or 0) >= 30 and p.get("position") in ("Attack", "Midfield"):
        opts.append({"q": f"{name} kulüp kariyerinde kaç lig golü attı?", "answer": p["career_goals"], "unit": "gol"})
    if (p.get("international_caps") or 0) >= 15:
        opts.append({"q": f"{name} kaç A milli maça çıktı?", "answer": p["international_caps"], "unit": "maç"})
    b = p.get("birth_date") or ""
    if re.match(r"^\d{4}-\d{2}-\d{2}$", b) and b[5:] != "01-01":
        opts.append({"q": f"{name} hangi yıl doğdu?", "answer": int(b[:4]), "unit": ""})
    h = p.get("height_cm")
    if h and 160 <= h <= 205:
        opts.append({"q": f"{name} kaç santim boyunda?", "answer": h, "unit": "cm"})
    if not opts:
        return None
    return (rnd or random.Random(p["id"])).choice(opts)


def general_questions(rnd: random.Random) -> list[dict]:
    """Football knowledge from facts-curated.json: stadiums and league titles, each with a follow-up."""
    facts = json.loads(FACTS.read_text(encoding="utf-8"))
    out = []
    stadiums = facts["stadiums"]
    for st in stadiums:
        same = [x["club"] for x in stadiums if x["club"] != st["club"] and x["country"] == st["country"]]
        other = [x["club"] for x in stadiums if x["club"] != st["club"] and x["country"] != st["country"]]
        rnd.shuffle(same); rnd.shuffle(other)
        wrong = (same + other)[:3]
        opts = wrong + [st["club"]]
        rnd.shuffle(opts)
        q = {"type": "stadium", "q": f"{st['name']} hangi takımın stadyumu?", "options": opts, "answer": st["club"],
             "difficulty": "easy" if st["country"] == "Türkiye" else "medium", "clubs": [st["club"]], "city": st["city"]}
        wd = st.get("capacity_wikidata")
        if wd and abs(wd - st["capacity"]) <= 0.05 * st["capacity"]:
            q["followUp"] = {"q": f"{st['name']} kaç kişilik?", "answer": st["capacity"], "unit": "kişi"}
        out.append(q)
    for lg in facts["leagues"]:
        titles = lg["titles"]
        if lg.get("pending"):
            continue  # latest champion not confirmed: no title questions for this league yet
        ranked = sorted(titles.items(), key=lambda kv: -kv[1])
        top, n = ranked[0]
        if not lg.get("no_most_question") and len(ranked) >= 4 and ranked[1][1] < n:
            opts = [c for c, _ in ranked[1:4]] + [top]
            rnd.shuffle(opts)
            out.append({"type": "league", "q": f"{lg['scope']} tarihinde en çok şampiyon olan takım hangisi?", "options": opts,
                        "answer": top, "difficulty": "easy", "clubs": [c for c, _ in ranked[:4]],
                        "followUp": {"q": f"{top} {lg['scope']} şampiyonluğunu kaç kez kazandı?", "answer": n, "unit": "şampiyonluk"},
                        "asOf": lg["complete_through"]})
        for club, k in ranked:
            if k >= 4:
                out.append({"type": "estimate", "q": f"{club}, {lg['scope']} şampiyonluğunu kaç kez kazandı?", "answer": k,
                            "unit": "şampiyonluk", "difficulty": "medium", "clubs": [club], "field": "leagueTitles",
                            "asOf": lg["complete_through"]})
    return out


def career_questions(players: list[dict], rnd: random.Random) -> list[dict]:
    famous = known_clubs(players)
    paths = {}
    for p in players:
        seq = []
        for c in p.get("career_clubs") or []:
            c = clean_club(c)
            if c and (not seq or seq[-1] != c):
                seq.append(c)
        # At least half of the path, and two clubs, must be clubs a fan knows; otherwise the question is a guess.
        if 3 <= len(seq) <= 8 and len(set(seq)) >= 3 and sum(c in famous for c in seq) >= max(2, len(seq) / 2):
            paths[p["id"]] = seq
    by_pos = defaultdict(list)
    for p in players:
        if p["id"] in paths:
            by_pos[p.get("position")].append(p)
    out = []
    for p in players:
        seq = paths.get(p["id"])
        if not seq:
            continue
        rec = float(p.get("recognition_score") or 0)
        pool = [o for o in by_pos[p.get("position")] if o["id"] != p["id"] and paths[o["id"]] != seq
                and abs(float(o.get("recognition_score") or 0) - rec) < 250]
        # Prefer look-alikes: shared clubs or same nationality make the question think-worthy.
        pool.sort(key=lambda o: (-len(set(paths[o["id"]]) & set(seq)), o.get("nationality") != p.get("nationality"), rnd.random()))
        wrong = []
        for o in pool:
            if o["name"] != p["name"] and o["name"] not in wrong:
                wrong.append(o["name"])
            if len(wrong) == 3:
                break
        if len(wrong) < 3:
            continue
        opts = wrong + [p["name"]]
        rnd.shuffle(opts)
        q = {"type": "career", "q": "Bu kulüplerde sırasıyla oynayan kim?", "path": seq, "options": opts,
             "answer": p["name"], "playerId": p["id"], "difficulty": difficulty(rec), "clubs": sorted(set(seq))}
        q["followUp"] = follow_up_for_player(p, rnd)
        if not q["followUp"]:
            del q["followUp"]
        out.append(q)
    return out


def intersection_questions(rnd: random.Random, limit: int = 2500) -> list[dict]:
    xox = json.loads(XOX.read_text(encoding="utf-8"))
    sup = json.loads(XOX_SUPPLEMENT.read_text(encoding="utf-8")).get("players", {}) if XOX_SUPPLEMENT.exists() else {}
    rules = json.loads(XOX_RULES.read_text(encoding="utf-8"))
    allowed = {c for cs in (rules.get("clubs") or {}).values() for c in cs}
    known = []
    for p in xox:
        clubs = set(p.get("clubs") or []) | set(sup.get(str(p.get("id")), []))
        p["_clubs"] = clubs & allowed
        if float(p.get("recognitionScore") or 0) >= 200 and len(p["_clubs"]) >= 1:
            known.append(p)
    by_club = defaultdict(list)
    for p in known:
        for c in p["_clubs"]:
            by_club[c].append(p)
    out, seen = [], set()
    clubs = sorted(by_club)
    pairs = [(a, b) for i, a in enumerate(clubs) for b in clubs[i + 1:]]
    rnd.shuffle(pairs)
    for a, b in pairs:
        both = [p for p in by_club[a] if b in p["_clubs"]]
        if not both:
            continue
        right = max(both, key=lambda p: float(p.get("recognitionScore") or 0))
        only = [p for p in by_club[a] + by_club[b] if not (a in p["_clubs"] and b in p["_clubs"]) and p["name"] != right["name"]]
        if len(only) < 3:
            continue
        only.sort(key=lambda p: -float(p.get("recognitionScore") or 0))
        wrong = []
        for p in only[:30]:
            if p["name"] not in wrong:
                wrong.append(p["name"])
        wrong = rnd.sample(wrong, 3) if len(wrong) >= 3 else wrong
        if len(wrong) < 3 or right["name"] in wrong:
            continue
        key = (a, b)
        if key in seen:
            continue
        seen.add(key)
        opts = wrong + [right["name"]]
        rnd.shuffle(opts)
        rec = float(right.get("recognitionScore") or 0)
        out.append({"type": "intersection", "q": f"Hem {a} hem {b} formasını giyen hangisi?", "clubs": [a, b], "options": opts,
                    "answer": right["name"], "playerId": right["id"], "difficulty": difficulty(rec)})
        if len(out) >= limit:
            break
    return out


CLUB_FACTS = ROOT / "side-games" / "fethet" / "data" / "facts-clubs.json"
TR_CLUBS = {"Galatasaray", "Fenerbahçe", "Beşiktaş", "Trabzonspor", "Başakşehir", "Bursaspor", "Göztepe", "Altay", "Karşıyaka", "Kocaelispor",
            "Eskişehirspor", "Antalyaspor", "Alanyaspor", "Mersin İdmanyurdu", "Adana Demirspor", "Adanaspor", "Hatayspor", "Ankaragücü",
            "Gençlerbirliği", "Konyaspor", "Kayserispor", "Sivasspor", "Samsunspor", "Rizespor", "Malatyaspor", "Gaziantepspor", "Gaziantep",
            "Kasımpaşa", "Sakaryaspor", "Denizlispor", "Boluspor", "Giresunspor", "Orduspor", "Elazığspor", "Manisaspor", "Amedspor",
            "Eyüpspor", "Fatih Karagümrük"}
BIG4 = {"Galatasaray", "Fenerbahçe", "Beşiktaş", "Trabzonspor"}
STADIUM_OK = {"Başakşehir", "Altay", "Eskişehirspor", "Rizespor", "Gaziantep", "Kasımpaşa", "Sivasspor", "Denizlispor",
              "Barcelona", "Villarreal", "Real Betis", "Aston Villa", "Wolverhampton", "Norwich City", "Crystal Palace",
              "Fiorentina", "Dortmund", "Bayer Leverkusen", "Schalke 04", "Hamburg", "Werder Bremen", "PSV", "Monaco",
              "Panathinaikos", "Club Brugge", "Anderlecht", "Kızılyıldız"}
NO_CAPACITY = {"Barcelona"}


def four(answer: str, wrong: list[str], rnd: random.Random) -> list[str] | None:
    wrong = [w for w in dict.fromkeys(wrong) if w != answer][:3]
    if len(wrong) < 3:
        return None
    opts = wrong + [answer]
    rnd.shuffle(opts)
    return opts


def club_questions(rnd: random.Random) -> list[dict]:
    """General football knowledge about clubs: founding, city, colours, symbol, nickname, stadium, titles."""
    curated = json.loads(FACTS.read_text(encoding="utf-8"))
    hand = curated.get("clubs", {})
    wd = json.loads(CLUB_FACTS.read_text(encoding="utf-8"))["clubs"] if CLUB_FACTS.exists() else {}
    founded = {n: v["founded"] for n, v in wd.items() if v.get("founded")}
    founded.update(curated.get("founded_extra", {}))
    out: list[dict] = []
    diff = lambda names: "easy" if set(names) & BIG4 else "medium" if set(names) & TR_CLUBS else "hard"

    # Which club is older? Four clubs whose founding years are at least 6 years apart.
    names = sorted(founded)
    for _ in range(420):
        pool = [n for n in names if n in TR_CLUBS] if rnd.random() < 0.5 else names
        if len(pool) < 4:
            break
        pick = rnd.sample(pool, 4)
        ys = sorted(founded[n] for n in pick)
        if any(b - a < 6 for a, b in zip(ys, ys[1:])):
            continue
        oldest = min(pick, key=lambda n: founded[n])
        opts = pick[:]
        rnd.shuffle(opts)
        out.append({"type": "older", "q": "Bu kulüplerden hangisi daha önce kuruldu?", "options": opts, "answer": oldest,
                    "difficulty": diff(pick), "clubs": sorted(pick),
                    "followUp": {"q": f"{oldest} hangi yıl kuruldu?", "answer": founded[oldest], "unit": ""}})
    for n, y in founded.items():
        out.append({"type": "estimate", "q": f"{n} hangi yıl kuruldu?", "answer": y, "unit": "", "field": "founded",
                    "difficulty": diff([n]), "clubs": [n]})

    # City of a club (skipped when the name gives the city away).
    cities_tr = sorted({v["city"] for n, v in hand.items() if v.get("city") and n in TR_CLUBS})
    cities_xx = sorted({v["city"] for n, v in hand.items() if v.get("city") and n not in TR_CLUBS})
    for n, v in hand.items():
        c = v.get("city")
        if not c or c.lower().split()[0][:5] in n.lower():
            continue
        pool = [x for x in (cities_tr if n in TR_CLUBS else cities_xx) if x != c]
        opts = four(c, rnd.sample(pool, min(len(pool), 6)), rnd)
        if opts:
            out.append({"type": "city", "q": f"{n} hangi şehrin kulübü?", "options": opts, "answer": c, "difficulty": diff([n]), "clubs": [n]})

    # Colours (Turkish clubs): the three wrong clubs have other colour pairs.
    col = {n: v["colors"] for n, v in hand.items() if v.get("colors")}
    for n, c in col.items():
        others = [m for m, k in col.items() if k != c]
        rnd.shuffle(others)
        opts = four(n, others, rnd)
        if opts:
            out.append({"type": "colors", "q": f"Renkleri {c} olan kulüp hangisi?", "options": opts, "answer": n,
                        "difficulty": "easy" if n in BIG4 else "medium", "clubs": [n]})

    # Symbol / mascot animal: wrong options are clubs with a known, different symbol.
    sym = {n: v["symbol"] for n, v in hand.items() if v.get("symbol")}
    for n, s in sym.items():
        others = [m for m, k in sym.items() if k != s]
        rnd.shuffle(others)
        opts = four(n, others, rnd)
        if opts:
            out.append({"type": "symbol", "q": f"Sembolü {s} olan kulüp hangisi?", "options": opts, "answer": n, "difficulty": diff([n]), "clubs": [n]})

    # Nicknames.
    nick = {n: v["nicknames"] for n, v in hand.items() if v.get("nicknames")}
    for n, ks in nick.items():
        for k in ks:
            others = [m for m in nick if m != n]
            rnd.shuffle(others)
            opts = four(n, others, rnd)
            if opts:
                out.append({"type": "nickname", "q": f"“{k}” lakabı hangi kulübe ait?", "options": opts, "answer": n, "difficulty": diff([n]), "clubs": [n]})

    # Stadiums from Wikidata (current, unshared home ground), capacity as the follow-up. Wikidata's home-ground
    # records lag behind moves and renames (Ankaragücü still at the demolished 19 Mayıs), so only grounds checked
    # by hand are used; Camp Nou's capacity is left out while it is being rebuilt.
    have = {s["club"] for s in curated.get("stadiums", [])}
    stad = {n: v for n, v in wd.items() if v.get("stadium") and n not in have and n in STADIUM_OK}
    for n, v in stad.items():
        same = [m for m in stad if m != n and (m in TR_CLUBS) == (n in TR_CLUBS)]
        rnd.shuffle(same)
        opts = four(n, same, rnd)
        if not opts:
            continue
        q = {"type": "stadium", "q": f"{v['stadium']} hangi takımın stadyumu?", "options": opts, "answer": n, "difficulty": diff([n]), "clubs": [n]}
        if v.get("capacity") and n not in NO_CAPACITY:
            q["followUp"] = {"q": f"{v['stadium']} kaç kişilik?", "answer": v["capacity"], "unit": "kişi"}
            out.append({"type": "estimate", "q": f"{v['stadium']} ({n}) kaç kişilik?", "answer": v["capacity"], "unit": "kişi",
                        "field": "capacity", "difficulty": "hard", "clubs": [n]})
        out.append(q)

    # Which of these has more league titles? Four clubs of one league with different counts.
    for lg in curated["leagues"]:
        if lg.get("pending"):
            continue
        t = lg["titles"]
        clubs = list(t)
        for _ in range(12):
            if len(clubs) < 4:
                break
            pick = rnd.sample(clubs, 4)
            if len({t[c] for c in pick}) < 4:
                continue
            best = max(pick, key=lambda c: t[c])
            opts = pick[:]
            rnd.shuffle(opts)
            out.append({"type": "titles", "q": f"Hangisi {lg['scope']} şampiyonluğunu daha çok kazandı?", "options": opts, "answer": best,
                        "difficulty": diff(pick), "clubs": sorted(pick), "asOf": lg["complete_through"],
                        "followUp": {"q": f"{best} kaç kez {lg['scope']} şampiyonu oldu?", "answer": t[best], "unit": "şampiyonluk"}})
    return dedupe(out)


def world_cup_questions(rnd: random.Random) -> list[dict]:
    wcs = json.loads(FACTS.read_text(encoding="utf-8")).get("world_cups", [])
    wins: dict[str, int] = defaultdict(int)
    for w in wcs:
        wins[w["winner"]] += 1
    nations = sorted(set(wins) | {"Hollanda", "Portekiz", "Hırvatistan", "Belçika", "Macaristan", "Çekoslovakya", "İsveç"})
    hosts = sorted({w["host"] for w in wcs})
    out = []
    for w in wcs:
        opts = four(w["winner"], rnd.sample([n for n in nations if n != w["winner"]], 5), rnd)
        out.append({"type": "worldcup", "q": f"{w['year']} Dünya Kupası'nı hangi ülke kazandı?", "options": opts, "answer": w["winner"],
                    "difficulty": "medium" if w["year"] >= 1990 else "hard", "clubs": [],
                    "followUp": {"q": f"{w['winner']} toplam kaç kez Dünya Kupası kazandı?", "answer": wins[w["winner"]], "unit": "kez"}})
        opts = four(w["host"], rnd.sample([h for h in hosts if h != w["host"]], 5), rnd)
        out.append({"type": "worldcup", "q": f"{w['year']} Dünya Kupası hangi ülkede düzenlendi?", "options": opts, "answer": w["host"],
                    "difficulty": "medium" if w["year"] >= 1990 else "hard", "clubs": []})
    return out


def player_trivia(players: list[dict], rnd: random.Random) -> list[dict]:
    """Which club did he never play for? / Who has more caps? / Which national team?"""
    famous = known_clubs(players, 40)
    career = {}
    for p in players:
        if p.get("career_stats_source") not in WHOLE_CAREER:
            continue  # the "never played for" answer must come from a whole-career list
        cs = {clean_club(c) for c in (p.get("career_clubs") or [])} | {clean_club(c) for c in (p.get("clubs") or [])}
        cs.discard("")
        if len(cs & famous) >= 3:
            career[p["id"]] = cs
    co: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for cs in career.values():
        for a in cs & famous:
            for b in cs & famous:
                if a != b:
                    co[a][b] += 1
    out = []
    for p in players:
        cs = career.get(p["id"])
        if not cs or float(p.get("recognition_score") or 0) < 250:
            continue
        played = sorted(cs & famous, key=lambda c: rnd.random())[:3]
        # A club that often shows up next to his clubs (so it looks right) but is not in his career.
        cand: dict[str, int] = defaultdict(int)
        for c in played:
            for o, k in co[c].items():
                if o not in cs and not any(o.lower() in x.lower() or x.lower() in o.lower() for x in cs):
                    cand[o] += k
        if not cand:
            continue
        # Best decoy: linked to every club he played for (Caner Erkin: Trabzonspor rather than Chelsea).
        top = sorted(cand, key=lambda o: (-min(co[c].get(o, 0) for c in played), -cand[o]))[:2]
        never = rnd.choice(top)
        opts = played + [never]
        rnd.shuffle(opts)
        q = {"type": "notplayed", "q": f"{p['name']} hangi takımda oynamadı?", "options": opts, "answer": never, "playerId": p["id"],
             "difficulty": difficulty(float(p.get("recognition_score") or 0)), "clubs": sorted(set(played) | {never})}
        fu = follow_up_for_player(p, rnd)
        if fu:
            q["followUp"] = fu
        out.append(q)

    tr_names = json.loads((ROOT / "side-games" / "data" / "master" / "country-tr.json").read_text(encoding="utf-8"))
    def nat_tr(n: str | None) -> str | None:
        if not n:
            return None
        if n == "Türkiye":
            return n
        import unicodedata
        key = "".join(ch for ch in unicodedata.normalize("NFKD", n.lower()) if ch.isalpha() and ch.isascii())
        return tr_names.get(key)  # unknown spelling: leave the player out rather than show an English name
    by_nat: dict[str, list[dict]] = defaultdict(list)
    for p in players:
        p = {**p, "nationality": nat_tr(p.get("nationality"))}
        if (p.get("international_caps") or 0) >= 10 and float(p.get("recognition_score") or 0) >= 250 and p.get("nationality"):
            by_nat[p["nationality"]].append(p)
    for nat, ps in by_nat.items():
        if len(ps) < 4:
            continue
        for _ in range(min(25, len(ps))):
            pick = rnd.sample(ps, 4)
            caps = sorted((x["international_caps"] for x in pick), reverse=True)
            if caps[0] - caps[1] < max(6, caps[0] * 0.1):
                continue
            best = max(pick, key=lambda x: x["international_caps"])
            opts = [x["name"] for x in pick]
            if len(set(opts)) < 4:
                continue
            rnd.shuffle(opts)
            out.append({"type": "caps", "q": "Bu oyunculardan hangisi daha çok A milli maça çıktı?", "options": opts, "answer": best["name"],
                        "difficulty": "medium", "clubs": [], "playerId": best["id"],
                        "followUp": {"q": f"{best['name']} kaç A milli maça çıktı?", "answer": best["international_caps"], "unit": "maç"}})
    nats = [n for n, ps in by_nat.items() if len(ps) >= 3]
    for p in players:
        p = {**p, "nationality": nat_tr(p.get("nationality"))}
        if (p.get("international_caps") or 0) >= 20 and float(p.get("recognition_score") or 0) >= 300 and p.get("nationality") in nats:
            others = [n for n in nats if n != p["nationality"]]
            opts = four(p["nationality"], rnd.sample(others, min(5, len(others))), rnd)
            if not opts:
                continue
            out.append({"type": "nation", "q": f"{p['name']} hangi ülkenin milli takımında oynadı?", "options": opts, "answer": p["nationality"],
                        "difficulty": difficulty(float(p.get("recognition_score") or 0)), "clubs": [], "playerId": p["id"],
                        "followUp": {"q": f"{p['name']} kaç A milli maça çıktı?", "answer": p["international_caps"], "unit": "maç"}})
    return dedupe(out)


def dedupe(qs: list[dict]) -> list[dict]:
    seen, out = set(), []
    for q in qs:
        k = (q["q"], q.get("answer"), tuple(sorted(q.get("options") or [])))
        if k not in seen:
            seen.add(k)
            out.append(q)
    return out


def main() -> None:
    rnd = random.Random(SEED)
    master = json.loads(MASTER.read_text(encoding="utf-8"))
    known = [p for p in master if float(p.get("recognition_score") or 0) >= 150 and p.get("name")]
    known.sort(key=lambda p: -float(p.get("recognition_score") or 0))
    known = known[:4000]
    # Numeric questions: famous players, or anyone with a real Süper Lig career (the audience knows them).
    est = estimate_questions([p for p in known if float(p.get("recognition_score") or 0) >= 250
                              or (p.get("superlig_appearances") or 0) >= 40])
    car = career_questions(known, rnd)
    inter = intersection_questions(rnd)
    gen = general_questions(rnd)
    extra = club_questions(rnd) + world_cup_questions(rnd) + player_trivia(known, rnd)
    bank = est + car + inter + gen + extra
    for i, q in enumerate(bank):
        q["id"] = f"q{i:05d}"
        if q["type"] not in ("estimate",):
            assert q.get("options") and q["answer"] in q["options"] and len(set(q["options"])) == 4, q
    OUT.parent.mkdir(parents=True, exist_ok=True)
    counts = defaultdict(int)
    for q in bank:
        counts[f"{q['type']}:{q['difficulty']}"] += 1
    OUT.write_text(json.dumps({"generated_from": "NEON XI master pool (Transfermarkt + Wikidata + Wikipedia + Reep, cross-checked)",
                               "counts": dict(sorted(counts.items())), "questions": bank}, ensure_ascii=False, separators=(",", ":")),
                   encoding="utf-8")
    print(f"{len(bank)} questions →", OUT.relative_to(ROOT), dict(sorted(counts.items())))


if __name__ == "__main__":
    main()
