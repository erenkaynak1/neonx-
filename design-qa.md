# Layered NEON XI home — 2026-09-16

final result: passed

## Evidence and state

- Source truth: `side-games/assets/premium-home/neon-xi-foreground-v4.png` and `neon-xi-background-v4.png` in the same directory, both 853 × 1844. The exact supplied foreground and selected background were copied unchanged.
- Browser-rendered implementation and simultaneous source comparison: `docs/home-layer-comparison.jpg` (1363 × 936 capture).
- Reproducible comparison: `scripts/home-visual-check.html`; the right iframe runs the real index.html, not a mocked menu.
- Mobile viewport: 390 × 844 CSS pixels; actual SVG bounds measured in browser: 390 × 843.09375. Source normalized to 390 × 843.095 CSS pixels. The comparison screenshot displays both sides at the same scale.
- Desktop: inspected the real menu at 1363 × 936; artwork width 520, height 1124.125, with vertical scrolling. No horizontal artwork crop.
- State: logged out, home idle, no open panel. Source intentionally retains its original green Home button; implementation uses the approved unlit navigation as explicitly requested.

## Findings

No actionable P0/P1/P2 visual differences found in the side-by-side comparison.

- Typography/content: supplied raster lettering retained; no reflow or alternate font substituted. Live username constrained to the profile capsule rather than a 360px opaque strip. Long-name truncation remains a small follow-up refinement; full name is exposed through the accessible label.
- Spacing/layout: all layers and hotspots share a single 853 × 1844 viewBox. Profile hit area reduced from 460px to 205px. Quiz card and all-games outlines aligned with the actual source bounds.
- Colors: exact source imagery preserved; only the requested unlit nav is overlaid from the existing approved idle asset. Interaction outlines are transparent until press or keyboard focus.
- Image fidelity: foreground retains RGBA; background is opaque RGB. Full-view comparison shows no layout drift or incorrect cropping. The original cutout has slight edge artifacts; no additional raster processing was applied.
- Copy: original Turkish labels and both background signs retained. Existing game destinations preserved.
- Separate focused-region capture not needed: the two 390px-wide full-height views are presented at 1:1 CSS scale with labels, card boundaries, and navigation readable in the same evidence image.

## Interaction checks

Browser verified: Hemen Başla opens draft; Bota Karşı opens difficulty selection; Online opens multiplayer chooser; Arkadaşlar opens social login drawer; Ayarlar opens settings; Futbol XOX card navigates to its game. No login, invite, matchmaking search, or remote-account mutation performed.

Static checks: all 16 hotspot rectangles lie within the shared viewBox without overlapping; scaling math checked at widths 320, 360, 390, 430, 520; both asset dimensions, foreground RGBA, and game paths checked by `scripts/test_home_hotspots.cjs`.

Console inspection found only a Chrome-extension metadata reporting error, not an application script error. Other side-game journeys and authenticated username states were not exhaustively exercised.

## Comparison history

First simultaneous mobile comparison passed. Expected difference: Home has no baked-in green light, matching the earlier request. No P0/P1/P2 post-comparison repair loop required.

## Implementation checklist

- [x] Exact foreground and selected background connected.
- [x] Source-coordinate SVG click regions and press/focus outlines retained.
- [x] Shared-layer mobile alignment inspected in browser.
- [x] Primary navigation checked and regression tests run.
- [ ] GitHub upload/publication not performed in this turn.
