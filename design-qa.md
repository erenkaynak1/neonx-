# Design QA — Career Twin mobile menu and live game

## Menu comparison target — 2026-08-31

- Source: user-supplied `00e85a68-b4eb-481e-a272-97f2b892c443.png` (940 × 1672 px).
- Implementation route: `/side-games/career-twin/`.
- Browser viewport: 1363 × 936 CSS px at DPR 1; centered mobile app frame: 560 × 936 CSS px.
- Source-to-build alignment: top link 2%, hero 21%, mode panel 35%, instruction panel 70%, and bottom navigation 90% of the app height.
- The source is used as a layout and styling reference only. All visible menu type, frames, buttons, icons, and navigation are live HTML/CSS/SVG.

## Menu QA findings and fixes

- Pass 1 — P1, fidelity: replaced the generic card stack with the reference's five-layer portrait composition, condensed white/lime title, clipped HUD frames, three equal mode rows, instruction card, and three-item bottom navigation.
- Pass 1 — P1, implementation: mode controls remain semantic buttons and continue to call the existing local/create/join flows. No screenshot or rasterized button is used.
- Pass 2 — P2, content fit: the instruction paragraph exceeded the clipped panel at the QA width. Reduced its width-relative type scale and line height; final measured text bottom is 29 px above the panel bottom.
- Pass 2 — P2, assets: replaced improvised glyphs with a dedicated stroke SVG symbol set for the gamepad, phone, home, users, ball, trophy, information, settings, and chevron icons.
- Final — P3, background detail: the isolated source city plate was not supplied, so the existing text-free NEON XI cyberpunk city asset is reused with the source's dark green blur treatment. Building geometry is not pixel-identical, but no duplicate UI or baked text appears behind the live interface.
- P0: none. P1: none remaining. P2: none remaining.

## Menu functional verification

- Confirmed the menu loads after the Transfermarkt master pool and reports seven rounds.
- Confirmed `ONLINE · ODA KUR` opens the existing name/create-room screen.
- Confirmed `TEK TELEFON` starts a local game and exposes the live player search control.
- Confirmed the three mode controls measure equally and the instruction copy remains inside its panel.
- Confirmed no application console errors; only the cloud-browser extension emitted unrelated internal metadata errors.

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

## Football XOX unified mobile menu — 2026-08-31

- Inputs: user-supplied current XOX screen `1784492b-c562-4ae5-b410-2e15628ed034.png` and the approved Career Twin menu target `00e85a68-b4eb-481e-a272-97f2b892c443.png`.
- Implementation route: `/side-games/football-xox/`.
- Browser viewport: 1363 × 936 CSS px at DPR 1; centered mobile app frame: 560 × 936 CSS px.
- Reused fidelity system: identical city background asset and blur treatment, white/lime condensed title, clipped HUD frames, equal mode rows, instruction card, SVG icon geometry, and three-item bottom navigation.
- Live implementation: all visible type, frames, controls, icons, and navigation are real HTML/CSS/SVG; no screenshot or raster UI overlay is used.

### XOX findings and fixes

- Pass 1 — P1, consistency: replaced the previous teal rounded-card menu with the approved Career Twin portrait composition and the same normalized vertical anchors: hero 21%, modes 35%, instructions 70%, navigation 90%.
- Pass 1 — P1, function preservation: retained the existing `startLocal`, create-room, and join-room handlers; only the menu shell changed.
- Pass 2 — P2, icon rendering: external SVG-symbol references were not painted reliably by the preview browser. Inlined the same approved path geometry so the gamepad, phone, home, users, chevrons, football, trophy, information, and settings icons render consistently.
- Pass 2 — P2, copy fit: replaced the generic online service card with XOX-specific rules. Final measurement: instruction copy `scrollHeight` 158 px equals `clientHeight` 158 px, with no clipping or horizontal overflow.
- P0: none. P1: none remaining. P2: none remaining.

### XOX functional verification

- Confirmed `ONLINE · ODA KUR` opens the existing player-name/create-room screen.
- Confirmed `ONLINE · KODLA KATIL` opens the four-digit code and player-name fields.
- Confirmed `TEK TELEFON` starts the live 3 × 3 board with nine cells.
- Confirmed selecting an empty cell opens the footballer picker and displays the active row/column condition pair.
- Confirmed zero horizontal overflow and no application console errors on the tested flows.

final result: passed
