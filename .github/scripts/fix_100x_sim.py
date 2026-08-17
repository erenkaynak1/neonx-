from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

old = """  function validState(){\n    try{return Boolean(window.KADRO_MATCH_PRESENTATION&&window.KADRO_ENGINE_TESTS?.runFast&&window.state?.teams?.A&&window.state?.teams?.B);}catch(_){return Boolean(window.KADRO_ENGINE_TESTS?.runFast);}\n  }"""
new = """  function validState(){\n    /* state is script-scoped in the main game, so window.state is not a reliable readiness signal.\n       The fast-sim API is the authoritative contract; runFast() rebuilds the current squads itself. */\n    try{\n      const live=window.KADRO_MATCH_PRESENTATION;\n      const fast=window.KADRO_ENGINE_TESTS?.runFast;\n      return Boolean(live&&typeof fast==='function');\n    }catch(_){return false;}\n  }"""

if old in s:
    s = s.replace(old, new, 1)
elif new not in s:
    raise SystemExit('100x validState target not found')

s = s.replace(
    "if(!validState()){alert('Hızlı simülasyon motoru henüz hazır değil. Önce iki kadroyu ve taktikleri tamamla.');return;}",
    "if(!validState()){alert('Hızlı simülasyon motoru yüklenemedi. Sayfayı yenileyip maç öncesi ekrana tekrar gel.');return;}",
    1,
)
s = s.replace("window.NEON_XI_SIM_LAB={version:'1.0.0'", "window.NEON_XI_SIM_LAB={version:'1.0.1'", 1)

marker = '<!-- NEON XI HOTFIX: 100X SIM READY-GUARD v1.0.1 · 2026-08-17 -->\n'
anchor = '<!-- NEON XI PATCH: ENGINE-EVENT-SYNC + 100X SIM LAB 2026-08-17 -->\n'
if marker not in s and anchor in s:
    s = s.replace(anchor, anchor + marker, 1)

if 'window.state?.teams?.A' in s:
    raise SystemExit('stale window.state readiness check remains')
if "window.NEON_XI_SIM_LAB={version:'1.0.1'" not in s:
    raise SystemExit('sim lab version marker missing')

p.write_text(s, encoding='utf-8')
print('100x sim hotfix applied successfully')
