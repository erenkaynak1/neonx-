# Usage: python3 scripts/build_logo_svg.py assets/ui/logo-neon-xi.svg
#        python3 scripts/build_logo_svg.py assets/ui/logo-neon-xi-mask.svg --mask   (needs: pip install shapely)
"""Builds a clean vector NEON XI wordmark matching the proportions of assets/neon-xi-logo-outline.png
(1024x225 canvas, measured letter boxes), rendered as neon tubes with SVG filters."""
import sys
from shapely.geometry import Polygon, box, Point
from shapely.ops import unary_union
from shapely import affinity

T, B, W = 49, 176, 34          # cap top, baseline, stroke width (measured)

def N(x0, x1):
    left = box(x0, T, x0 + W, B)
    right = box(x1 - W, T, x1, B)
    diag = Polygon([(x0, T), (x0 + W + 6, T), (x1, B), (x1 - W - 6, B)])
    return unary_union([left, right, diag])

def E(x0, x1):
    stem = box(x0, T, x0 + W, B)
    top = box(x0, T, x1, T + 31)
    mid = box(x0, 97, x1 - 6, 126)
    bot = box(x0, B - 32, x1, B)
    return unary_union([stem, top, mid, bot])

def O(cx, cy, rx, ry, t):
    outer = affinity.scale(Point(cx, cy).buffer(1, 256), rx, ry)
    inner = affinity.scale(Point(cx, cy).buffer(1, 256), rx - t, ry - t)
    return outer.difference(inner)

def X():
    t, b = 39, 180
    a = Polygon([(684, t), (744, t), (890, b), (830, b)])      # top-left -> bottom-right
    c = Polygon([(830, t), (890, t), (744, b), (684, b)])      # top-right -> bottom-left
    tail = Polygon([(862, 170), (890, b), (922, 211)])          # the signature spike
    return unary_union([a, c, tail])

def I():
    return box(918, 39, 958, 180)

letters = [N(89, 217), E(236, 342), O(422.5, 112, 69.5, 66, 33), N(507, 635), X(), I()]

def ring_d(coords):
    pts = list(coords)
    return "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts[:-1]) + "Z"

def poly_d(geom):
    polys = [geom] if geom.geom_type == "Polygon" else list(geom.geoms)
    d = []
    for p in polys:
        d.append(ring_d(p.exterior.coords))
        for hole in p.interiors:
            d.append(ring_d(hole.coords))
    return "".join(d)

d = "".join(poly_d(g) for g in letters)

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 225" role="img" aria-label="NEON XI">
<title>NEON XI</title>
<defs>
  <filter id="halo" x="-10%" y="-40%" width="120%" height="180%"><feGaussianBlur stdDeviation="11"/></filter>
  <filter id="bloom" x="-10%" y="-40%" width="120%" height="180%"><feGaussianBlur stdDeviation="3.2"/></filter>
  <linearGradient id="tube" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#7dff2e"/><stop offset=".55" stop-color="#9dff1f"/><stop offset="1" stop-color="#5dff3c"/>
  </linearGradient>
  <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#1c4a14" stop-opacity=".55"/><stop offset="1" stop-color="#06180a" stop-opacity=".35"/>
  </linearGradient>
  <path id="g" d="{d}" fill-rule="evenodd"/>
</defs>
<use href="#g" fill="url(#body)"/>
<use href="#g" fill="none" stroke="#58ff1f" stroke-width="16" stroke-linejoin="round" opacity=".42" filter="url(#halo)"/>
<use href="#g" fill="none" stroke="url(#tube)" stroke-width="7.5" stroke-linejoin="round" filter="url(#bloom)" opacity=".9"/>
<use href="#g" fill="none" stroke="url(#tube)" stroke-width="5.5" stroke-linejoin="round"/>
<use href="#g" fill="none" stroke="#f3ffd2" stroke-width="1.8" stroke-linejoin="round"/>
</svg>
'''
# --mask: white tube lines only (no halo, no body fill) for CSS mask-image shine sweeps.
mask_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 225">
<path d="{d}" fill="none" stroke="#fff" stroke-width="7" stroke-linejoin="round"/>
</svg>
'''
open(sys.argv[1], "w").write(mask_svg if "--mask" in sys.argv[2:] else svg)
print("bytes", len(svg))
