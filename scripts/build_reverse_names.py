#!/usr/bin/env python3
"""Player names for RE:VERSE's speech matcher → side-games/reverse-xi/data/names.json.

The speech recogniser runs in Turkish, so foreign names come back spelled by ear ("ırling holand"). The game
matches what it heard against these names by sound (side-games/reverse-xi/name-match-v1.js). Rows:
[name, recognition, turkish?] for the best-known players of the NEON XI master pool, plus every player the
pool marks as familiar to a Turkish audience.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "side-games" / "data" / "master" / "transfermarkt-players.json"
OUT = ROOT / "side-games" / "reverse-xi" / "data" / "names.json"
TOP = 7000


def main() -> None:
    players = json.loads(MASTER.read_text(encoding="utf-8"))
    rows = [p for p in players if p.get("name")]
    rows.sort(key=lambda p: -float(p.get("recognition_score") or 0))
    keep, seen = [], set()
    for i, p in enumerate(rows):
        if i >= TOP and not p.get("turkish_familiar"):
            continue
        name = " ".join(str(p["name"]).split())
        if name.lower() in seen:
            continue
        seen.add(name.lower())
        keep.append([name, round(float(p.get("recognition_score") or 0)), 1 if p.get("nationality") == "Türkiye" else 0])
    OUT.write_text(json.dumps({"source": "NEON XI master pool (names only)", "names": keep}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(len(keep), "names →", OUT.relative_to(ROOT), f"{OUT.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
