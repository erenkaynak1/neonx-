'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const root = require('node:path').resolve(__dirname, '..');
const css = fs.readFileSync(root + '/draft-readability-v1.css', 'utf8');
const entry = fs.readFileSync(root + '/index.html', 'utf8');
assert(css.includes('NEON XI DRAFT TYPOGRAPHY V2'), 'Latest readability overrides missing');
assert(entry.includes("draft-readability-v1.css?v='+VERSION"), 'Draft readability stylesheet not loaded');
assert(entry.includes("const VERSION='20260928-draft-legibility-v1'"), 'Draft style cache not refreshed');
for (const [name, selector, declaration] of [
 ['main stat numbers', '.selectedDetail .mainStats .statMini b', 'font-size: 19px !important'],
 ['main stat labels', '.selectedDetail .mainStats .statMini span', 'font-size: 10.5px !important'],
 ['detail values', '.selectedDetail .detailGrid > * :is(b, strong)', 'font-size: 15px !important'],
 ['detail rows', '.selectedDetail .detailGrid > *', 'font-size: 12px !important'],
 ['nav headings', '.nxDraftMobileNav button span', 'font-size: 12px !important'],
 ['nav counts', '.nxDraftMobileNav button b', 'font-size: 11px !important'],
]) {
 const blocks = css.split('body.nx-draft-active ' + selector + ' {').slice(1).map(part => part.split('}')[0]);
 assert(blocks.length > 0, name + ': selector missing');
 assert(blocks.some(block => block.includes(declaration)), name + ': expected size missing');
}
assert(css.includes('font-variant-numeric: tabular-nums'), 'Numeric alignment missing');
assert(css.includes('body.nx-draft-active .nxDraftMobileNav button.active span'), 'Selected nav contrast missing');
assert(css.includes('@media (max-width: 360px)'), 'Narrow mobile fallback missing');
assert(!css.includes('text-shadow: 0 0 20px'), 'Excessive glow reduces legibility');
console.log('PASS Draft XI stat numbers, names, tabs, narrow mobile fallback and cache version.');
