# NEON XI — roadmap (agreed with the owner)

1. **Draft XI cleanup and fixes** — `neon-xi-core.html` (1.7 MB, ~17,500 lines) plus ~20 override patch files
   loaded by `index.html` (fix / refresh / guard / v2 files). Merge the patches into the core, delete the
   overridden (dead) code, then fix Draft XI's inconsistencies from the owner's list. A daily reminder runs until
   this is done.
2. **Player data infrastructure, free sources only** (no budget before launch):
   - one player record with source, date and confidence per field;
   - Wikidata (clubs, birth, national team) and English + Turkish Wikipedia infoboxes (career totals) as the
     main sources, refreshed weekly;
   - automated quality tests (e.g. international goals ≤ caps, plausible ages and seasons, hand-checked
     reference players); records that fail go to a report, not into the games;
   - an in-game "bu veri yanlış" report button feeding a corrections file;
   - API-Football free plan as a validation source only: the free plan allows seasons 2022–2024 (2022-23 to
     2024-25), not 2025-26 or the current 2026-27. Use the 100 requests/day to fill those three seasons for the
     best-known ~2,000 players (20 players per request, ~2 requests per club) and cross-check Wikipedia totals.
     The key is stored as a network secret on the cloud environment (host `v3.football.api-sports.io`, header
     `x-apisports-key`); it is never in the repo. A paid plan would unlock current seasons later.
