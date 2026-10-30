#!/usr/bin/env python3
"""Build a compact Football XOX club-history supplement from Transfermarkt transfers.

The main XOX pool is derived from official appearance history. Transfermarkt also
publishes a transfers table that reaches careers/periods not always represented
by the tracked match set. This builder keeps only transfers touching clubs that
are valid XOX conditions and emits a small player_id -> clubs map.
"""

from __future__ import annotations

import argparse
import csv
import gzip
import io
import json
import urllib.request
from collections import defaultdict
from pathlib import Path
from typing import BinaryIO, Iterable

import build_xox_master_pool as xox


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "side-games" / "data" / "master" / "xox-club-supplement.json"
SOURCE_URL = "https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/transfers.csv.gz"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, help="Optional local transfers.csv or transfers.csv.gz")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    return parser.parse_args()


def canonical_club(raw_id: object, raw_name: object) -> str | None:
    try:
        club_id = int(str(raw_id or "").strip())
    except (TypeError, ValueError):
        club_id = None
    if club_id is not None and club_id in xox.CLUB_ID_MAP:
        return xox.CLUB_ID_MAP[club_id]
    return xox.CLUB_INDEX.get(xox.norm(raw_name))


def _rows_from_binary(handle: BinaryIO, gzipped: bool) -> Iterable[dict[str, str]]:
    raw = gzip.GzipFile(fileobj=handle) if gzipped else handle
    text = io.TextIOWrapper(raw, encoding="utf-8-sig", newline="")
    yield from csv.DictReader(text)


def rows(args: argparse.Namespace) -> Iterable[dict[str, str]]:
    if args.input:
        with args.input.open("rb") as handle:
            yield from _rows_from_binary(handle, args.input.suffix.lower() == ".gz")
        return
    request = urllib.request.Request(SOURCE_URL, headers={"User-Agent": "NEON-XI-XOX/1.0"})
    with urllib.request.urlopen(request, timeout=180) as response:
        yield from _rows_from_binary(response, True)


def build(args: argparse.Namespace) -> dict[str, object]:
    evidence: dict[int, set[str]] = defaultdict(set)
    transfer_rows = 0
    matched_rows = 0
    for row in rows(args):
        transfer_rows += 1
        try:
            player_id = int(str(row.get("player_id") or "").strip())
        except (TypeError, ValueError):
            continue
        matched = False
        for prefix in ("from", "to"):
            club = canonical_club(row.get(f"{prefix}_club_id"), row.get(f"{prefix}_club_name"))
            if club:
                evidence[player_id].add(club)
                matched = True
        if matched:
            matched_rows += 1

    players = {str(player_id): sorted(clubs) for player_id, clubs in sorted(evidence.items()) if clubs}
    payload: dict[str, object] = {
        "version": 1,
        "source": SOURCE_URL,
        "policy": "Supplement XOX curated-club history with Transfermarkt senior transfer records; appearance/current-club evidence remains primary.",
        "transfer_rows_scanned": transfer_rows,
        "matching_transfer_rows": matched_rows,
        "player_count": len(players),
        "players": players,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return payload


if __name__ == "__main__":
    result = build(parse_args())
    print(json.dumps({key: value for key, value in result.items() if key != "players"}, ensure_ascii=False, indent=2))
