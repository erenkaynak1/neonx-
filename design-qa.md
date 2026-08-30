# Design QA — NEON XI Raster Home Integration

## Comparison target

- Source visual truth: `../design-reference/NEON-XI-PREMIUM-HOME/index.html`
- Source foreground asset: `../design-reference/NEON-XI-PREMIUM-HOME/assets/neon-xi-menu-foreground.webp`
- Source background asset: `../design-reference/NEON-XI-PREMIUM-HOME/assets/home-city-v2.webp`
- Implementation: `http://127.0.0.1:4173/`
- State: initial NEON XI home menu, scroll position at the top.
- Reference screenshot: `qa/reference-560x876.png`
- Implementation screenshot: `qa/implementation-560x876.png`
- Side-by-side evidence: `qa/compare-560x876.png` (reference left, implementation right).
- Viewport: 560 × 876 CSS px.
- Source pixels: 560 × 876.
- Implementation pixels: 560 × 876.
- Device pixel ratio: 1.0; no density normalization was required.

## Findings

- P0: none.
- P1: none.
- P2: none.
- P3: the menu copy, typography, and icons are intentionally baked into the supplied foreground artwork. Future localization would require a replacement foreground asset or a separate later conversion to live text.

## Required fidelity surfaces

- Fonts and typography: the exact supplied foreground raster is rendered, so family, weight, hierarchy, line height, letter spacing, wrapping, and antialiasing match the source pixel-for-pixel at the normalized viewport.
- Spacing and layout rhythm: the supplied 941:1672 aspect ratio and hotspot geometry are preserved. The reference and implementation use the same 560 × 876 crop and top state with no material margin, padding, radius, or density drift.
- Colors and visual tokens: the foreground and city assets are byte-identical to the ZIP sources. The implementation adds only transparent semantic hit targets plus focus/pressed feedback and does not recolor the source artwork.
- Image quality and asset fidelity: both source images are copied without recompression. Foreground SHA-256 is `F3F652AD752EEC3BD6312B7C9E7507AA8808C71088C9ADBA273498E7155F6C29`; background SHA-256 is `6BA5593AF8C078506775ED35C187F19877EEB12194EA96EE8E9EFB16F81C12C8` in both source and repository copies.
- Copy and content: all visible menu copy and icons come from the exact source artwork. Invisible accessible names accurately describe each control. Side-game destinations intentionally use the repository's live routes (`football-xox/index.html` and `career-twin/index.html`) instead of the ZIP's stale filenames.
- Accessibility and states: every visual control has a semantic button or link, an accessible label, a visible keyboard focus state, practical touch geometry, pressed feedback, and reduced-motion support.

## Responsive evidence

- Landscape screenshot: `qa/implementation-landscape-844x390.png`.
- Landscape viewport: 844 × 390 CSS px at DPR 1.0.
- No horizontal overflow: document `scrollWidth` and `clientWidth` are both 844 px.
- The 406.4 × 722.1 px menu stage remains centered in a 418 px-wide scroller. Vertical scrolling is intentional because the selected source is portrait-first.
- The bottom “Tüm yan oyunları aç” target was reached and activated successfully in landscape, confirming that no persistent control is clipped or unreachable.

## Functional verification

- Settings opens and closes the existing settings overlay.
- Tek Oyunculu hides the boot shell and opens the existing draft screen.
- Bota Karşı opens the existing bot setup and returns to the redesigned home.
- Online opens the existing multiplayer choice screen and returns to the redesigned home.
- Turnuva Modu opens the existing tournament view and loads its iframe.
- Futbol XOX navigates to `side-games/football-xox/index.html`.
- “Tüm yan oyunları aç” navigates to `side-games/index.html`, including from the landscape layout.
- Root, core, integration script, both raster assets, and every linked side-game route returned HTTP 200 locally.
- Browser console errors checked after the interaction pass: none.

## Focused comparison evidence

A separate crop was not required. The implementation renders the exact byte-identical 941 × 1672 foreground asset, and the 1120 × 876 side-by-side comparison is readable enough to inspect typography, icons, borders, spacing, and image treatment together. The semantic controls are transparent overlays and do not replace or redraw any visible source detail.

## Comparison history

- Pass 1: reference and implementation were captured at the same 560 × 876 viewport and combined into `qa/compare-560x876.png`. No actionable P0/P1/P2 differences were found, so no visual-fix iteration was required.

## Implementation checklist

- Exact source foreground and background assets present.
- Current NEON XI control nodes reused, preserving the existing game handlers.
- Side-game routes mapped to the repository's current paths.
- Mobile portrait and mobile landscape behavior verified.
- Primary interactions and console state verified in the browser.

final result: passed
