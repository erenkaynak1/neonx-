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
    (r"^Trabzonspor\b.*", "Trabzonspor"), (r"^Manchester United F\.C\.$", "Manchester United"),
    (r"^Manchester City F\.C\.$", "Manchester City"), (r"^Liverpool F\.C\.$", "Liverpool"), (r"^Chelsea F\.C\.$", "Chelsea"),
    (r"^Arsenal F\.C\.$", "Arsenal"), (r"^Tottenham Hotspur F\.C\.$", "Tottenham"), (r"^Juventus F\.C\.$|^Juventus FC$", "Juventus"),
    (r"^A\.C\. Milan$|^AC Milan$", "Milan"), (r"^Inter Milan$|^FC Internazionale Milano$", "Inter"),
    (r"^FC Bayern Munich$|^Bayern Munich$", "Bayern Münih"), (r"^Borussia Dortmund$", "Dortmund"),
    (r"^Paris Saint-Germain F\.C\.$|^Paris Saint-Germain FC$", "PSG"), (r"^Atlético Madrid$", "Atlético Madrid"),
    (r"\s+Istanbul$", ""), (r"\s+(?:Calcio|BC)(?:\s+\d{4})?$", ""), (r"\s+\d{4}$", ""),
    (r"\s+(?:F\.C\.|FC|S\.K\.|J\.K\.|A\.Ş\.|CF|AFC|A\.F\.C\.|SC|S\.C\.|C\.F\.)$", ""),
    (r"^(?:FC|AFC|SC|AC|AS|SS|SSC|US|S\.L\.|C\.D\.|A\.C\.|A\.S\.|S\.S\.|R\.C\.D\.|RCD|SL|CD|CA|Club)\s+", ""),
    (r"\s+(?:Calcio)$", ""),
    (r"^Atlético de Madrid$", "Atlético Madrid"), (r"^Olympique Lyonnais$", "Lyon"), (r"^Olympique de Marseille$", "Marseille"),
    (r"^Sporting Clube de Portugal$|^Sporting CP$", "Sporting"), (r"^Futebol Clube do Porto$|^Porto$", "Porto"),
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


def follow_up_for_player(p: dict) -> dict | None:
    """Open-ended tie-break when both sides got the multiple-choice question right."""
    name = p["name"]
    if p.get("career_stats_source") in WHOLE_CAREER and (p.get("career_appearances") or 0) >= 100:
        return {"q": f"{name} kulüp kariyerinde kaç lig maçına çıktı?", "answer": p["career_appearances"], "unit": "maç"}
    if (p.get("international_caps") or 0) >= 15:
        return {"q": f"{name} kaç A milli maça çıktı?", "answer": p["international_caps"], "unit": "maç"}
    return None


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
        q["followUp"] = follow_up_for_player(p)
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
    bank = est + car + inter + gen
    for i, q in enumerate(bank):
        q["id"] = f"q{i:05d}"
        if q["type"] not in ("estimate",):
            assert q["answer"] in q["options"] and len(set(q["options"])) == 4, q
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
