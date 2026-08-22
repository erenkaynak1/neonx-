from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
index_path = root / "index.html"
parts_dir = root / "side-games" / ".parts"
game_path = root / "side-games" / "futbol-imposter.html"

# Assemble the latest Futbol Imposter build from UTF-8-safe parts.
parts = sorted(parts_dir.glob("part*.txt"))
if parts:
    game = "".join(p.read_text(encoding="utf-8") for p in parts)
    game_path.parent.mkdir(parents=True, exist_ok=True)
    game_path.write_text(game, encoding="utf-8")

text = index_path.read_text(encoding="utf-8")

if 'id="sideGamesBtn"' not in text:
    pattern = re.compile(r'(?P<online><button id="onlineModeBtn"[\s\S]*?</button>)')
    match = pattern.search(text)
    if not match:
        raise SystemExit("onlineModeBtn block not found; index.html left untouched")

    side_button = '''\n\n        <button id="sideGamesBtn" class="neonHomeBtn neonPrimaryMode" type="button" onclick="window.location.href='side-games/index.html'">\n          <span>\n            <strong>YAN OYUNLAR</strong>\n            <span class="neonHomeSub">Futbol Imposter ve yeni NEON XI mini oyunlarını aç.</span>\n          </span>\n          <span class="neonHomeIcon" aria-hidden="true">◇</span>\n        </button>'''
    text = text[:match.end()] + side_button + text[match.end():]
    index_path.write_text(text, encoding="utf-8")

print("Side Games integration ready")
