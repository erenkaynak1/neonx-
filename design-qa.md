# Design QA — Career Twin approved mobile screen

## Comparison target

- Source visual truth: `side-games/career-twin/assets/career-twin-approved.png`.
- Source dimensions: 941 × 1672 RGB PNG.
- Implementation route: `/side-games/career-twin/?qa=career-twin`.
- Captured state: `TEK TELEFON`, first pick, round 1, deterministic Michael Frey QA target.
- Browser viewport: 1363 × 936 CSS px at DPR 1.
- App stage: 941 × 1672 CSS px, preserving the source's exact 941:1672 ratio.
- Density normalization: 1 source pixel = 1 CSS pixel on the QA stage.

## Full-view comparison evidence

- Header, title, scores, and metric: `qa/career-twin-compare-top.png` (source left, browser implementation right).
- Score, metric, progress, and player arena: `qa/career-twin-compare-middle.png` (source left, browser implementation right).
- Player arena and complete search panel: `qa/career-twin-compare-bottom.png` (source left, browser implementation right).
- Browser captures: `qa/career-twin-browser-final.jpg`, `qa/career-twin-browser-middle.jpg`, and `qa/career-twin-browser-bottom-crop.jpg`.
- Source comparison slices: `qa/career-twin-source-top.png`, `qa/career-twin-source-middle.png`, and `qa/career-twin-source-bottom.png`.
- Normalized RMSE: top 0.0219, middle 0.0259, lower 0.0247; residual difference is browser JPEG compression.
- The lower capture uses `capture=bottom` only in QA mode to expose the portrait screen's lower region in the fixed browser viewport; production URLs are unaffected.

## Findings

- P0: none.
- P1: none.
- P2: none.
- P3: the browser evidence is JPEG-compressed by the capture surface. The committed source asset remains the original PNG without recompression.

## Required fidelity surfaces

- Typography: the approved title, labels, helper copy, and initial player name are rendered directly from the supplied artwork, retaining the exact family, weight, tracking, wrapping, and antialiasing.
- Spacing and layout rhythm: the 941 × 1672 portrait canvas, panel geometry, margins, gaps, radii, and search-area placement are preserved. Transparent DOM controls are aligned over the artwork's slots.
- Colors and visual tokens: the black, acid-lime, green glow, gray text, honeycomb, stadium, and city treatments come directly from the approved asset. Dynamic overlays use the same lime token (`#baff18`).
- Image quality and asset fidelity: the repository copy is the original 941 × 1672 PNG. No generated emoji, pseudo-icon approximation, or CSS recreation replaces the approved visual.
- Copy and content: the approved initial screen is exact, including `NEON XI · SIDE GAME`, `KARİYER İKİZİ`, `Tek telefon · sırayla seçim`, `OYUNCU 1`, `OYUNCU 2`, `BEKLİYOR`, `PARAMETRE`, `BOY`, `HEDEF`, `Michael Frey`, `FUTBOLCU ARA`, and the search helper copy. Live text appears only after the player interacts.
- Responsive behavior: below 941 px the stage scales to the mobile viewport width while preserving the exact aspect ratio; it never stretches or rearranges the approved composition.

## Functional verification

- Opened the Career Twin menu and activated `TEK TELEFON`.
- Confirmed the approved game screen appears with the deterministic QA target.
- Entered `Messi` in the transparent search field; matching live player results appeared.
- Selected Lionel Messi; the pick locked and the `DEVAM · OYUNCU 2` pass state appeared.
- Back navigation remains a semantic link aligned over the approved back control.
- Reduced-motion behavior is preserved.
- Browser console: no application errors. Chrome-extension metadata warnings were unrelated to the page.

## Comparison history

- Pass 1 — P1: the previous version recreated the screen with generic CSS shapes, emoji-like symbols, a different background, and mismatched type. Fixed by using the supplied approved artwork as the exact visual source and overlaying the existing interactive DOM.
- Pass 2 — P2: the live round-zero progress DOM briefly overlaid the artwork's baked seven-pip progress row. Fixed by letting the approved progress artwork remain visible for the initial state and reserving the live progress overlay for later rounds.
- Final pass: top, middle, and lower browser captures were compared against source slices at 1:1 density. No remaining actionable P0/P1/P2 mismatch was found.

final result: passed
