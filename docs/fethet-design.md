# Conquest game ("Saha Fethi", working title) — design foundations

An original football trivia-conquest game for NEON XI. It borrows the genre's mechanics (answer questions to win
territory) but not any existing game's name, map or art.

## Decisions so far

| Topic | Decision |
|---|---|
| Players | 2–4, flexible; empty seats can be filled by bots |
| Match length | Medium, 8–12 minutes |
| Question types | Estimate (numeric), career path (favourite), intersection, football knowledge (stadiums, league titles) |
| Tie-break | Every multiple-choice question carries an open-ended **follow-up** (`followUp`). When both sides answer right, the closest answer to the follow-up wins. |
| Map | Proposed: Turkey, ~20 city regions; start corners by player count (2: west/east, 3: west/north-centre/south-east, 4: four corners). Awaiting confirmation. |
| City flavour | Attacking a city can draw a question about that city's club (questions carry `clubs` / `city` tags). |
| Club badges | Our own representative crests (shield + club colours + initials). No real logos — they are trademarks. |

## Question bank

`scripts/build_fethet_questions.py` → `side-games/fethet/data/questions.json` (pre-built, auditable).

- **estimate**: caps, international goals, whole-career league apps/goals, Süper Lig apps, World Cup squads, birth
  year, height, league titles. Only well-known players or real Süper Lig careers; whole-career fields only.
- **career**: a first-team path with at least two well-known clubs; three same-position look-alikes as wrong
  options. Follow-up: career league apps (or caps).
- **intersection**: one player who played for both clubs, three who played for only one.
- **stadium**: single-club stadiums only (no San Siro / Olimpico). Follow-up: capacity, only when our figure and
  Wikidata agree within 5%.
- **league**: "most titles" with the count as follow-up.

## Correctness rules

- League title counts live in `side-games/fethet/data/facts-curated.json`, each with its checks. The latest
  season's champion is computed from complete openfootball match results (public domain) and compared with
  Wikidata's season records. Wikidata alone is not trusted for counts (it had Galatasaray at 22, Bayern split in two).
- A league whose latest champion is not confirmed is marked `pending` and gets no title questions until updated
  (currently: Süper Lig and Scotland, 2025-26).
- Contested counts are scoped in the question text (e.g. "Süper Lig (1959'dan beri)").

## Next steps

1. Confirm the map; draw regions, neighbours and start corners.
2. Game flow prototype with bots (land grab with estimates → battles → follow-up tie-breaks).
3. Online: reuse matchmaking, parties, forfeits, leaderboards and avatars.
