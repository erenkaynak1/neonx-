// Builds worker/hakem-worker.js (paste into Cloudflare) from worker/hakem-worker.src.js, embedding the topic list
// and the judge prompt/schema/request builder from side-games/acik-artirma. Run: node scripts/build_hakem_worker.mjs
// `--check` exits non-zero when the committed worker is out of date (used by CI).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KONULAR } from '../side-games/acik-artirma/konular.mjs';
import { HAKEM_TALIMATI, HAKEM_SEMASI, hakemIstegi } from '../side-games/acik-artirma/hakem.mjs';
import { HAKEMLER } from '../side-games/acik-artirma/hakemler.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'worker/hakem-worker.src.js'), 'utf8');
const konular = KONULAR.filter((k) => !k.taslak).map((k) => ({ id: k.id, baslik: k.baslik, yon: k.yon, maddeler: k.maddeler.map((m) => ({ id: m.id, ad: m.ad, kunye: m.kunye })) }));
const out = src
  .replace('/*KONULAR*/', JSON.stringify(konular))
  .replace('/*TALIMAT*/', JSON.stringify(HAKEM_TALIMATI))
  .replace('/*SEMA*/', JSON.stringify(HAKEM_SEMASI))
  .replace('/*ISTEK*/', hakemIstegi.toString())
  .replace('/*STILLER*/', JSON.stringify(Object.fromEntries(HAKEMLER.map((h) => [h.id, h.stil]))))
  .replace('// Bu dosya şablondur;', '// ÜRETİLMİŞ DOSYA — elle düzenleme. Şablon: worker/hakem-worker.src.js;');
const dest = path.join(root, 'worker/hakem-worker.js');
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : '';
  if (cur !== out) { console.error('worker/hakem-worker.js güncel değil: node scripts/build_hakem_worker.mjs'); process.exit(1); }
  console.log('hakem worker güncel ✓');
} else {
  fs.writeFileSync(dest, out);
  console.log(`worker/hakem-worker.js yazıldı (${(out.length / 1024).toFixed(1)} KB, ${konular.length} konu)`);
}
