# Design QA — Career Twin live mobile redesign

## Comparison target

- Source concept: user-supplied `IMG_8638.jpeg` (1170 × 2045 px).
- Implementation route: `/side-games/career-twin/?qa=career-twin`.
- Deterministic reveal state: target Viktor Gyökeres; picks Norbert Gyömbér and Eetu Vertainen.
- Browser viewport: 1363 × 936 CSS px at DPR 1; mobile app frame: 390 × 910 CSS px.
- Density normalization: both source and implementation were normalized to 390 px width. The source is a design-language reference, not a raster layer used by the game.

## Comparison evidence

- Full normalized comparison: `qa/career-twin-live-compare.jpg` (source left, implementation right).
- Results-detail comparison: `qa/career-twin-live-compare-detail.jpg` (source left, implementation right).
- Browser captures: `qa/career-twin-live-reveal-mobile.jpg` and `qa/career-twin-live-reveal-viewport.jpg`.
- Normalized inputs: `qa/career-twin-live-source-390.jpg` and `qa/career-twin-live-reveal-mobile-683.jpg`.

## Findings and fixes

- Pass 1 — P1, layout/content: the previous full-screen artwork baked a player name and controls into the background while live answers were layered on top. This caused the static Frey name, invisible values, and multiple overlapping result layers. Fixed by removing the approved-reference stylesheet from the route and rebuilding every score, player, metric, search, and result surface as live HTML/CSS. Only the text-free city/stadium atmosphere remains as a background asset.
- Pass 1 — P1, behavior: the result panel floated over the search area instead of participating in document flow. Fixed by rendering a dedicated result section after the three live player cards, with separate rows for both players and the target.
- Pass 2 — P2, typography/responsiveness: the title wrapped at the 390 px QA width. Fixed with a mobile type scale, single-line title rule, and cache-version bump.
- Final — P3, color/image treatment: the implementation intentionally darkens the city/stadium image more than the source so dynamic white and lime text keeps strong contrast. This preserves the concept while improving gameplay readability.
- P0: none. P1: none remaining. P2: none remaining.

## Required fidelity surfaces

- Typography: condensed display treatment, white/lime split title, compact tracked HUD labels, and readable body type preserve the source hierarchy without baking text into an image.
- Spacing and layout: the portrait composition, score strip, centered metric, seven-step progress, three-column comparison, and result section retain the source ordering. Long player names remain within independent card areas and no content overlaps.
- Colors and surfaces: black, acid-lime, restrained green glow, thin HUD borders, and translucent dark panels match the source concept. Buttons are real semantic controls with focus, hover, active, glow, and reduced-motion states.
- Image quality: the existing text-free city/stadium asset is used only as atmosphere. No screenshot, player photo, placeholder avatar, inline SVG, or rasterized UI control is used.
- Copy/content: player names, values, differences, scores, status, target, round, and result are all generated from the live game state. No static Frey copy remains.
- Responsiveness: verified at a 390 px mobile app width; `scrollWidth` stays within the app frame, the title remains on one line, and cards/result rows stay separated.
- Accessibility: semantic links, inputs, and buttons retain keyboard focus indicators; the search input has an accessible label; tap targets are at least 44 px; motion is disabled under `prefers-reduced-motion`.

## Functional verification

- Opened Career Twin and selected `TEK TELEFON`.
- Searched for and selected Norbert Gyömbér as Player 1.
- Confirmed the pass-device state and continued as Player 2.
- Searched for and selected Eetu Vertainen as Player 2.
- Confirmed the reveal state shows the target and both answers with separate values and differences: 189 cm / 0 cm, 189 cm target, 188 cm / 1 cm.
- Confirmed the correct winner and persistent `SONRAKİ PARAMETRE` control are visible without covering another section.
- Back navigation remains a semantic link; primary controls remain semantic buttons.
- Browser console showed no application errors during the tested core flow.

final result: passed
