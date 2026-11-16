#!/usr/bin/env python3
"""Club facts for the conquest game's general-knowledge questions → side-games/fethet/data/facts-clubs.json.

From Wikidata (CC0), for a pinned list of clubs (QIDs, so a name never resolves to the wrong club):
  * founded  — inception (P571); clubs with several inception years (refoundations) are skipped unless the
               year is set in FOUNDED_OVERRIDE, which holds the founding year the club itself uses.
  * stadium  — current home venue (P115 without an end date) and its capacity (P1083), only when the venue
               is not shared with another listed club (otherwise "whose stadium is this?" has two answers).
Hand facts that Wikidata does not hold reliably (city, colours, symbol, nicknames) live in facts-curated.json.
Run: python3 scripts/build_fethet_club_facts.py   (needs query.wikidata.org)
"""
from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "side-games" / "fethet" / "data" / "facts-clubs.json"
UA = "neonxi-data/1.0 (football trivia game)"

CLUBS = {
    "Galatasaray": "Q495299", "Fenerbahçe": "Q6601875", "Beşiktaş": "Q172567", "Trabzonspor": "Q192641", "Başakşehir": "Q857938",
    "Bursaspor": "Q203573", "Göztepe": "Q1423118", "Altay": "Q434929", "Kocaelispor": "Q513237", "Eskişehirspor": "Q748445",
    "Antalyaspor": "Q43710", "Alanyaspor": "Q1636019", "Mersin İdmanyurdu": "Q929360", "Adana Demirspor": "Q352251",
    "Adanaspor": "Q352270", "Hatayspor": "Q1110567", "Ankaragücü": "Q492826", "Gençlerbirliği": "Q641373", "Konyaspor": "Q513840",
    "Kayserispor": "Q608122", "Sivasspor": "Q372599", "Samsunspor": "Q430107", "Rizespor": "Q272712", "Malatyaspor": "Q1368064",
    "Gaziantepspor": "Q285722", "Gaziantep": "Q824850", "Kasımpaşa": "Q138230", "Sakaryaspor": "Q1369461", "Denizlispor": "Q643107",
    "Boluspor": "Q891679", "Giresunspor": "Q1543501", "Orduspor": "Q178180", "Elazığspor": "Q1127498", "Manisaspor": "Q128148",
    "Amedspor": "Q1231804", "Eyüpspor": "Q118919", "Fatih Karagümrük": "Q1398111",
    "Real Madrid": "Q8682", "Barcelona": "Q7156", "Atlético Madrid": "Q8701", "Valencia": "Q10333", "Athletic Bilbao": "Q8687",
    "Villarreal": "Q12297", "Real Betis": "Q8723", "Real Sociedad": "Q10315",
    "Manchester United": "Q18656", "Manchester City": "Q50602", "Liverpool": "Q1130849", "Arsenal": "Q9617", "Chelsea": "Q9616",
    "Tottenham": "Q18741", "Everton": "Q5794", "Newcastle United": "Q18716", "Aston Villa": "Q18711", "West Ham": "Q18747",
    "Leicester City": "Q19481", "Wolverhampton": "Q19500", "Norwich City": "Q18721", "Crystal Palace": "Q19467",
    "Juventus": "Q1422", "Milan": "Q1543", "Inter": "Q631", "Roma": "Q2739", "Lazio": "Q2609", "Napoli": "Q2641",
    "Fiorentina": "Q2052", "Atalanta": "Q1886",
    "Bayern Münih": "Q15789", "Dortmund": "Q41420", "Bayer Leverkusen": "Q104761", "Schalke 04": "Q32494", "Hamburg": "Q51974",
    "Werder Bremen": "Q51976", "Ajax": "Q81888", "PSV": "Q11938", "Feyenoord": "Q134241", "Benfica": "Q131499", "Porto": "Q128446",
    "Sporting": "Q75729", "PSG": "Q483020", "Marseille": "Q132885", "Lyon": "Q704", "Monaco": "Q180305", "Celtic": "Q19593",
    "Rangers": "Q19597", "Panathinaikos": "Q4122219", "Club Brugge": "Q190916", "Anderlecht": "Q187528",
    "Shakhtar Donetsk": "Q172969", "Dinamo Kiev": "Q179075", "Zenit": "Q29108", "Spartak Moskova": "Q29112",
    "Kızılyıldız": "Q173009", "River Plate": "Q15799", "Flamengo": "Q17479", "Santos": "Q80955", "Al Hilal": "Q73965", "Al Nassr": "Q482764",
}
# The year the club itself uses where Wikidata also lists a refoundation or a renaming.
FOUNDED_OVERRIDE = {"Başakşehir": 1990, "Napoli": 1926, "Fiorentina": 1926, "Atalanta": 1907}
# Never ask: founding disputed by the club and historians.
FOUNDED_SKIP = {"Sevilla"}


def sparql(query: str) -> list[dict]:
    url = "https://query.wikidata.org/sparql?" + urllib.parse.urlencode({"query": query, "format": "json"})
    for attempt in range(10):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/sparql-results+json"})
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.load(r)["results"]["bindings"]
        except Exception as e:  # rate limit / outage: wait and retry
            print("retry", attempt + 1, e)
            time.sleep(65)  # the public endpoint allows about one query a minute when busy
    raise SystemExit("Wikidata query failed")


def main() -> None:
    values = " ".join(f"wd:{q}" for q in CLUBS.values())
    by_qid = {q: name for name, q in CLUBS.items()}
    rows = sparql(f"""SELECT ?club ?inception WHERE {{ VALUES ?club {{ {values} }} OPTIONAL {{ ?club wdt:P571 ?inception }} }}""")
    founded: dict[str, set[int]] = {}
    for r in rows:
        name = by_qid[r["club"]["value"].rsplit("/", 1)[1]]
        if "inception" in r:
            founded.setdefault(name, set()).add(int(r["inception"]["value"][:4]))
    time.sleep(65)
    venues = sparql(f"""SELECT ?club ?venue ?venueLabel ?cap WHERE {{ VALUES ?club {{ {values} }}
        ?club p:P115 ?st . ?st ps:P115 ?venue . FILTER NOT EXISTS {{ ?st pq:P582 ?end }}
        OPTIONAL {{ ?venue wdt:P1083 ?cap }}
        SERVICE wikibase:label {{ bd:serviceParam wikibase:language "tr,en". }} }}""")
    by_venue: dict[str, set[str]] = {}
    venue_of: dict[str, dict] = {}
    for r in venues:
        name = by_qid[r["club"]["value"].rsplit("/", 1)[1]]
        vid = r["venue"]["value"]
        by_venue.setdefault(vid, set()).add(name)
        label = r["venueLabel"]["value"]
        if label.startswith("Q") and label[1:].isdigit():
            continue  # no label in tr/en
        cap = int(float(r["cap"]["value"])) if "cap" in r else None
        venue_of.setdefault(name, {})[vid] = {"name": label, "capacity": cap}
    out = {}
    for name in CLUBS:
        rec: dict = {"qid": CLUBS[name]}
        years = founded.get(name, set())
        if name in FOUNDED_OVERRIDE:
            rec["founded"] = FOUNDED_OVERRIDE[name]
        elif len(years) == 1 and name not in FOUNDED_SKIP:
            rec["founded"] = next(iter(years))
        vs = {vid: v for vid, v in venue_of.get(name, {}).items() if len(by_venue[vid]) == 1}
        if len(vs) == 1:  # one current, unshared home ground
            v = next(iter(vs.values()))
            rec["stadium"] = v["name"]
            if v["capacity"] and 3000 <= v["capacity"] <= 120000:
                rec["capacity"] = v["capacity"]
        out[name] = rec
    OUT.write_text(json.dumps({"source": "Wikidata (CC0): P571 inception, P115 home venue, P1083 capacity",
                               "clubs": out}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(out)} clubs, founded {sum('founded' in v for v in out.values())}, stadium {sum('stadium' in v for v in out.values())}")


if __name__ == "__main__":
    main()
