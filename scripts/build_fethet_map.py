#!/usr/bin/env python3
"""Turkey map for the conquest game → side-games/fethet/data/map-tr.json.

* Outline: Natural Earth 1:50m admin-0 countries (public domain), Turkey only.
* Regions: one per football city; every point of Turkey belongs to the nearest city (Voronoi cells clipped to
  the outline), so the regions tile the country with natural borders.
* Neighbours: regions that share a border of real length.
* Start regions for 2, 3 and 4 players: the base cities that are furthest apart on the region graph.
Coordinates are projected to an SVG viewBox (equirectangular, x scaled by cos of the mean latitude).
"""
from __future__ import annotations

import itertools
import json
import math
from collections import deque
from pathlib import Path

from shapely.geometry import MultiPoint, Point, shape
from shapely.ops import unary_union, voronoi_diagram

ROOT = Path(__file__).resolve().parents[1]
NE = ROOT / ".tmp-geo" / "ne50.geojson"
OUT = ROOT / "side-games" / "fethet" / "data" / "map-tr.json"

# city, lon, lat, clubs (the names used in the question bank), short label
CITIES = [
    ("İstanbul", 28.98, 41.01, ["Galatasaray", "Fenerbahçe", "Beşiktaş", "Başakşehir"], "İST"),
    ("Kocaeli", 29.92, 40.77, ["Kocaelispor"], "KOC"),
    ("Bursa", 29.06, 40.19, ["Bursaspor"], "BUR"),
    ("Eskişehir", 30.52, 39.78, ["Eskişehirspor"], "ESK"),
    ("İzmir", 27.14, 38.42, ["Göztepe", "Karşıyaka", "Altay"], "İZM"),
    ("Balıkesir", 27.88, 39.65, ["Balıkesirspor"], "BAL"),
    ("Denizli", 29.09, 37.78, ["Denizlispor"], "DEN"),
    ("Antalya", 30.71, 36.90, ["Antalyaspor", "Alanyaspor"], "ANT"),
    ("Mersin", 34.64, 36.81, ["Mersin İdmanyurdu"], "MER"),
    ("Adana", 35.32, 37.00, ["Adana Demirspor", "Adanaspor"], "ADA"),
    ("Hatay", 36.16, 36.20, ["Hatayspor"], "HAT"),
    ("Ankara", 32.86, 39.93, ["Ankaragücü", "Gençlerbirliği", "Ankaraspor"], "ANK"),
    ("Konya", 32.48, 37.87, ["Konyaspor"], "KON"),
    ("Kayseri", 35.48, 38.73, ["Kayserispor"], "KAY"),
    ("Sivas", 37.02, 39.75, ["Sivasspor"], "SİV"),
    ("Samsun", 36.33, 41.29, ["Samsunspor"], "SAM"),
    ("Trabzon", 39.72, 41.00, ["Trabzonspor"], "TRA"),
    ("Rize", 40.52, 41.02, ["Rizespor"], "RİZ"),
    ("Erzurum", 41.27, 39.90, ["Erzurumspor"], "ERZ"),
    ("Malatya", 38.31, 38.35, ["Malatyaspor", "Yeni Malatyaspor"], "MAL"),
    ("Gaziantep", 37.38, 37.07, ["Gaziantep", "Gaziantepspor"], "GAZ"),
    ("Diyarbakır", 40.23, 37.91, ["Amedspor"], "DİY"),
    ("Van", 43.38, 38.50, ["Vanspor"], "VAN"),
    # More villages: smaller regions make the map last longer and the land grab shorter.
    ("Edirne", 26.56, 41.68, ["Edirnespor"], "EDİ"),
    ("Tekirdağ", 27.51, 40.98, ["Tekirdağspor"], "TEK"),
    ("Çanakkale", 26.41, 40.15, ["Dardanelspor"], "ÇAN"),
    ("Sakarya", 30.40, 40.78, ["Sakaryaspor"], "SAK"),
    ("Zonguldak", 31.79, 41.45, ["Zonguldak Kömürspor"], "ZON"),
    ("Bolu", 31.61, 40.74, ["Boluspor"], "BOL"),
    ("Kastamonu", 33.78, 41.38, ["Kastamonuspor"], "KAS"),
    ("Manisa", 27.43, 38.61, ["Manisaspor"], "MAN"),
    ("Aydın", 27.84, 37.85, ["Aydınspor"], "AYD"),
    ("Muğla", 28.36, 37.22, ["Bodrumspor"], "MUĞ"),
    ("Afyon", 30.54, 38.76, ["Afyonspor"], "AFY"),
    ("Isparta", 30.55, 37.76, ["Ispartaspor"], "ISP"),
    ("Aksaray", 34.03, 38.37, ["Aksarayspor"], "AKS"),
    ("Çorum", 34.95, 40.55, ["Çorum FK"], "ÇOR"),
    ("Ordu", 37.88, 40.98, ["Orduspor"], "ORD"),
    ("Giresun", 38.39, 40.91, ["Giresunspor"], "GİR"),
    ("Tokat", 36.55, 40.31, ["Tokatspor"], "TOK"),
    ("Elazığ", 39.22, 38.67, ["Elazığspor"], "ELA"),
    ("Maraş", 36.94, 37.58, ["Kahramanmaraşspor"], "KMR"),
    ("Urfa", 38.79, 37.16, ["Şanlıurfaspor"], "URF"),
    ("Mardin", 40.74, 37.31, ["Mardinspor"], "MAR"),
    ("Kars", 43.10, 40.60, ["Kars 36"], "KAR"),
    ("Ağrı", 43.05, 39.72, ["Ağrı 1970"], "AĞR"),
    ("Erzincan", 39.49, 39.75, ["Erzincanspor"], "ERC"),
    ("Muş", 41.49, 38.74, ["Muşspor"], "MUŞ"),
    ("Batman", 41.13, 37.88, ["Batman Petrolspor"], "BAT"),
    ("Artvin", 41.82, 41.18, ["Artvin Hopaspor"], "ART"),
]
# Bases sit on strong football cities; the corners are chosen among these.
BASE_CANDIDATES = ["İstanbul", "İzmir", "Antalya", "Ankara", "Trabzon", "Gaziantep", "Erzurum", "Van", "Samsun", "Adana"]
W = 1000  # viewBox width


def main() -> None:
    feat = next(f for f in json.loads(NE.read_text())["features"] if f["properties"].get("ADM0_A3") == "TUR")
    land = shape(feat["geometry"])
    land = unary_union([g for g in getattr(land, "geoms", [land]) if g.area > 0.05])  # drop specks of islands
    minx, miny, maxx, maxy = land.bounds
    kx = math.cos(math.radians((miny + maxy) / 2))
    scale = W / ((maxx - minx) * kx)
    H = round((maxy - miny) * scale)
    proj = lambda lon, lat: (round((lon - minx) * kx * scale, 1), round((maxy - lat) * scale, 1))

    def path(geom) -> str:
        parts = []
        for poly in getattr(geom, "geoms", [geom]):
            for ring in [poly.exterior, *poly.interiors]:
                pts = [proj(x, y) for x, y in ring.simplify(0.02).coords]
                parts.append("M" + "L".join(f"{x},{y}" for x, y in pts) + "Z")
        return "".join(parts)

    pts = MultiPoint([Point(lon, lat) for _, lon, lat, _, _ in CITIES])
    cells = voronoi_diagram(pts, envelope=land.envelope.buffer(2))
    regions = []
    for name, lon, lat, clubs, short in CITIES:
        cell = next(c for c in cells.geoms if c.contains(Point(lon, lat)))
        reg = cell.intersection(land)
        c = reg.representative_point() if not reg.contains(reg.centroid) else reg.centroid
        regions.append({"id": short, "name": name, "clubs": clubs, "geom": reg, "city": proj(lon, lat), "label": proj(c.x, c.y)})
    for a in regions:
        a["neighbors"] = [b["id"] for b in regions if b is not a and a["geom"].buffer(0.01).intersection(b["geom"].buffer(0.01)).area > 0.004]

    ids = [r["id"] for r in regions]
    nbr = {r["id"]: r["neighbors"] for r in regions}
    def dist(a, b):
        seen, q = {a: 0}, deque([a])
        while q:
            x = q.popleft()
            for y in nbr[x]:
                if y not in seen:
                    seen[y] = seen[x] + 1; q.append(y)
        return seen.get(b, 99)
    by_name = {r["name"]: r["id"] for r in regions}
    cands = [by_name[n] for n in BASE_CANDIDATES]
    starts = {}
    for k in (2, 3, 4):
        # Furthest apart first; among equals, the bigger football cities (earlier in BASE_CANDIDATES).
        best = max(itertools.combinations(cands, k), key=lambda combo: (min(dist(a, b) for a, b in itertools.combinations(combo, 2)),
                                                                         -sum(cands.index(c) for c in combo),
                                                                         sum(dist(a, b) for a, b in itertools.combinations(combo, 2))))
        starts[str(k)] = list(best)
    out = {"source": "Natural Earth 1:50m (public domain); regions are nearest-city cells", "viewBox": [0, 0, W, H],
           "outline": path(land),
           "regions": [{"id": r["id"], "name": r["name"], "clubs": r["clubs"], "path": path(r["geom"]), "city": r["city"],
                        "label": r["label"], "neighbors": r["neighbors"]} for r in regions],
           "starts": starts}
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(regions)} regions, viewBox {W}x{H}, starts {starts}")
    for r in regions:
        print(f"  {r['id']} {r['name']:11} neighbours: {', '.join(r['neighbors'])}")


if __name__ == "__main__":
    main()
