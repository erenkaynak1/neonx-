import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.NEON_BASE_URL || 'http://127.0.0.1:4173/';
const OUT_DIR = process.env.NEON_BOT_OUT || 'artifacts/neon-bot-lab';
const TIMEOUT = Number(process.env.NEON_BOT_TIMEOUT || 45000);
const runToken = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.slice(-10);

await fs.mkdir(OUT_DIR, { recursive: true });

const report = {
  runToken,
  baseUrl: BASE_URL,
  startedAt: new Date().toISOString(),
  scenarios: [],
  bots: [],
  observations: [],
};

const safeName = value => String(value || 'artifact').replace(/[^a-zA-Z0-9_-]+/g, '_');

async function screenshot(page, name) {
  try {
    await page.screenshot({ path: path.join(OUT_DIR, `${safeName(name)}.png`), fullPage: true });
  } catch {}
}

async function runScenario(name, fn, pages = []) {
  const started = Date.now();
  try {
    const detail = await fn();
    report.scenarios.push({ name, status: 'PASS', durationMs: Date.now() - started, detail: detail || null });
    console.log(`PASS  ${name}`);
    return detail;
  } catch (error) {
    report.scenarios.push({ name, status: 'FAIL', durationMs: Date.now() - started, error: String(error?.stack || error) });
    console.error(`FAIL  ${name}\n${error?.stack || error}`);
    await Promise.all(pages.map((page, i) => screenshot(page, `FAIL-${name}-${i + 1}`)));
    throw error;
  }
}

async function waitForHome(page) {
  await page.waitForSelector('#bootHome.nx-approved-home-v1 .nx-approved-canvas', { timeout: TIMEOUT });
}

async function makeBot(browser, label) {
  const username = `nxbot${runToken}${label}`.slice(0, 20);
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: 'tr-TR',
  });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  const page = await context.newPage();
  page.setDefaultTimeout(TIMEOUT);
  const bot = { label, username, context, page, uid: '', pageErrors: [], consoleErrors: [] };

  page.on('pageerror', error => bot.pageErrors.push(String(error?.stack || error)));
  page.on('console', msg => {
    if (msg.type() === 'error') bot.consoleErrors.push(msg.text());
  });

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
  await waitForHome(page);
  return bot;
}

async function guestSignIn(bot) {
  const { page, username } = bot;
  await page.locator('#bootHome.nx-approved-home-v1 .h-friends').click();
  const activeView = page.locator('.nx-social-shade.open .nx-social-view.active');
  const guest = activeView.locator('[data-act="guest-login"]');
  await guest.waitFor({ state: 'visible', timeout: TIMEOUT });
  await guest.click();

  const input = activeView.locator('#nxUsername');
  await input.waitFor({ state: 'visible', timeout: TIMEOUT });
  await input.fill(username);
  await activeView.locator('[data-act="claim"]').click();

  await page.waitForFunction(expected => document.body.textContent.includes(`@${expected}`), username, { timeout: TIMEOUT });
  bot.uid = await page.evaluate(() => window.NEON_IDENTITY?.uid || '');
  if (!bot.uid) {
    await page.waitForFunction(() => Boolean(window.NEON_IDENTITY?.uid), null, { timeout: 10000 });
    bot.uid = await page.evaluate(() => window.NEON_IDENTITY?.uid || '');
  }
  assert.ok(bot.uid, `${username}: guest UID oluşmadı`);

  const close = page.locator('.nx-social-shade.open .nx-social-close');
  if (await close.isVisible().catch(() => false)) await close.click();
  await page.locator('.nx-social-shade.open').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  return { username, uid: bot.uid };
}

async function openDrawer(bot, tab = 'friends') {
  const { page } = bot;
  const openLayer = page.locator('#bootHome.nx-approved-home-v1 .nx-social-drawer-layer.open');
  if (!(await openLayer.isVisible().catch(() => false))) {
    await page.locator('#bootHome.nx-approved-home-v1 .h-friends').click();
    await openLayer.waitFor({ state: 'visible', timeout: TIMEOUT });
  }
  if (tab === 'invites') {
    await page.locator('[data-nx-drawer-tab="invites"]').click();
  } else {
    await page.locator('[data-nx-drawer-tab="friends"]').click();
  }
  return openLayer;
}

async function closeDrawer(bot) {
  const { page } = bot;
  const close = page.locator('.nx-social-drawer-layer.open .nx-drawer-close');
  if (await close.isVisible().catch(() => false)) await close.click();
}

async function addFriend(sender, receiver) {
  await openDrawer(sender, 'friends');
  const input = sender.page.locator('.nx-social-drawer-layer.open [data-nx-find]');
  await input.fill(receiver.username);
  await sender.page.locator('.nx-social-drawer-layer.open [data-nx-find-btn]').click();
  const result = sender.page.locator('.nx-social-drawer-layer.open .nx-drawer-find-card');
  await result.waitFor({ state: 'visible', timeout: TIMEOUT });
  assert.ok((await result.textContent()).includes(`@${receiver.username}`), 'Arkadaş araması yanlış kullanıcı döndürdü');
  await result.locator('button').click();

  await openDrawer(receiver, 'invites');
  const accept = receiver.page.locator('.nx-social-drawer-layer.open [data-nx-friend-accept]');
  await accept.waitFor({ state: 'visible', timeout: TIMEOUT });
  await accept.click();

  await openDrawer(sender, 'friends');
  await sender.page.waitForFunction(name => [...document.querySelectorAll('.nx-drawer-friend-row')].some(x => x.textContent.includes(`@${name}`)), receiver.username, { timeout: TIMEOUT });
  await openDrawer(receiver, 'friends');
  await receiver.page.waitForFunction(name => [...document.querySelectorAll('.nx-drawer-friend-row')].some(x => x.textContent.includes(`@${name}`)), sender.username, { timeout: TIMEOUT });
}

async function makeParty(leader, member) {
  await openDrawer(leader, 'friends');
  const row = leader.page.locator('.nx-drawer-friend-row').filter({ hasText: `@${member.username}` }).first();
  await row.waitFor({ state: 'visible', timeout: TIMEOUT });
  await row.locator('[data-nx-friend-more]').click();
  await row.locator('[data-nx-party-invite]').click();

  await openDrawer(member, 'invites');
  const accept = member.page.locator('.nx-social-drawer-layer.open [data-nx-party-accept]');
  await accept.waitFor({ state: 'visible', timeout: TIMEOUT });
  assert.equal(await accept.isEnabled(), true, 'Parti daveti kabul butonu devre dışı');
  await accept.click();

  await openDrawer(leader, 'friends');
  await leader.page.locator('.nx-social-drawer-layer.open .nx-drawer-party').waitFor({ state: 'visible', timeout: TIMEOUT });
  await openDrawer(member, 'friends');
  await member.page.locator('.nx-social-drawer-layer.open .nx-drawer-party').waitFor({ state: 'visible', timeout: TIMEOUT });

  const leaderParty = await leader.page.locator('.nx-social-drawer-layer.open .nx-drawer-party').textContent();
  const memberParty = await member.page.locator('.nx-social-drawer-layer.open .nx-drawer-party').textContent();
  for (const name of [leader.username, member.username]) {
    assert.ok(leaderParty.includes(`@${name}`), `Lider parti görünümünde ${name} yok`);
    assert.ok(memberParty.includes(`@${name}`), `Üye parti görünümünde ${name} yok`);
  }
}

async function leaveParty(bot) {
  await openDrawer(bot, 'friends');
  const leave = bot.page.locator('.nx-social-drawer-layer.open [data-nx-party-leave]');
  if (!(await leave.isVisible().catch(() => false))) return;
  await leave.click();
  await bot.page.locator('.nx-social-drawer-layer.open .nx-drawer-party').waitFor({ state: 'hidden', timeout: TIMEOUT }).catch(() => {});
}

async function removeFriend(bot, other) {
  await openDrawer(bot, 'friends');
  const row = bot.page.locator('.nx-drawer-friend-row').filter({ hasText: `@${other.username}` }).first();
  if (!(await row.isVisible().catch(() => false))) return;
  await row.locator('[data-nx-friend-more]').click();
  await row.locator('[data-nx-friend-remove-prompt]').click();
  const confirm = row.locator('[data-nx-confirm-remove]');
  await confirm.waitFor({ state: 'visible', timeout: 5000 });
  await confirm.click();
}

async function openPlay(bot) {
  await closeDrawer(bot);
  const { page } = bot;
  await page.locator('#bootHome.nx-approved-home-v1 .h-social').click();
  const shade = page.locator('.nx-social-shade.open');
  await shade.waitFor({ state: 'visible', timeout: TIMEOUT });
  const mode = shade.locator('.nx-social-view.active #nxMode');
  await mode.waitFor({ state: 'visible', timeout: TIMEOUT });
  await mode.selectOption('draft');
}

async function startDraftMatch(botA, botB) {
  await Promise.all([openPlay(botA), openPlay(botB)]);
  const matchA = botA.page.locator('.nx-social-shade.open .nx-social-view.active [data-act="match"]');
  const matchB = botB.page.locator('.nx-social-shade.open .nx-social-view.active [data-act="match"]');
  await Promise.all([matchA.waitFor({ state: 'visible' }), matchB.waitFor({ state: 'visible' })]);
  await Promise.all([matchA.click(), matchB.click()]);

  const hasMatch = url => {
    try { return Boolean(new URL(url).searchParams.get('nxMatch')); } catch { return false; }
  };
  await Promise.all([
    botA.page.waitForURL(hasMatch, { timeout: TIMEOUT }),
    botB.page.waitForURL(hasMatch, { timeout: TIMEOUT }),
  ]);

  const a = new URL(botA.page.url());
  const b = new URL(botB.page.url());
  const infoA = Object.fromEntries(['nxMatch','nxCode','nxRole','nxOpponent','nxUid','nxAuto'].map(k => [k, a.searchParams.get(k)]));
  const infoB = Object.fromEntries(['nxMatch','nxCode','nxRole','nxOpponent','nxUid','nxAuto'].map(k => [k, b.searchParams.get(k)]));

  assert.ok(infoA.nxMatch && infoB.nxMatch, 'Match ID üretilmedi');
  assert.equal(infoA.nxMatch, infoB.nxMatch, 'Botlar farklı maç ID aldı');
  assert.equal(infoA.nxCode, infoB.nxCode, 'Botlar farklı oda kodu aldı');
  assert.notEqual(infoA.nxRole, infoB.nxRole, 'İki bot aynı role atandı');
  assert.deepEqual(new Set([infoA.nxRole, infoB.nxRole]), new Set(['host', 'guest']), 'Host/guest rolleri hatalı');
  assert.equal(infoA.nxOpponent, botB.uid, 'Bot A rakip UID yanlış');
  assert.equal(infoB.nxOpponent, botA.uid, 'Bot B rakip UID yanlış');
  assert.equal(infoA.nxAuto, '1');
  assert.equal(infoB.nxAuto, '1');

  await Promise.all([
    botA.page.waitForSelector('#draftScreen', { state: 'attached', timeout: TIMEOUT }).catch(() => null),
    botB.page.waitForSelector('#draftScreen', { state: 'attached', timeout: TIMEOUT }).catch(() => null),
  ]);

  return { botA: infoA, botB: infoB };
}

async function writeReport() {
  report.finishedAt = new Date().toISOString();
  const passed = report.scenarios.filter(x => x.status === 'PASS').length;
  const failed = report.scenarios.filter(x => x.status === 'FAIL').length;
  report.summary = { total: report.scenarios.length, passed, failed };
  await fs.writeFile(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  const lines = [
    '# NEON XI Bot Lab',
    '',
    `- Run: \`${report.runToken}\``,
    `- Base URL: ${report.baseUrl}`,
    `- Sonuç: **${passed} başarılı / ${failed} hatalı / ${report.scenarios.length} toplam**`,
    '',
    '## Senaryolar',
    ...report.scenarios.map(x => `- ${x.status === 'PASS' ? '✅' : '❌'} **${x.name}** — ${x.durationMs} ms${x.error ? `\n  - ${x.error.split('\n')[0]}` : ''}`),
    '',
    '## Botlar',
    ...report.bots.map(x => `- ${x.label}: @${x.username} — UID ${x.uid || 'yok'} — page errors ${x.pageErrors.length} — console errors ${x.consoleErrors.length}`),
    '',
    '## Notlar',
    ...(report.observations.length ? report.observations.map(x => `- ${x}`) : ['- Ek gözlem yok.']),
  ];
  await fs.writeFile(path.join(OUT_DIR, 'report.md'), lines.join('\n'));
}

const browser = await chromium.launch({ headless: true });
let botA;
let botB;
let fatal = null;

try {
  botA = await makeBot(browser, 'a');
  botB = await makeBot(browser, 'b');

  await runScenario('İki bağımsız misafir hesabı oluşturma', async () => {
    const [a, b] = await Promise.all([guestSignIn(botA), guestSignIn(botB)]);
    assert.notEqual(a.uid, b.uid, 'İki bot aynı Firebase UID aldı');
    return { a, b };
  }, [botA.page, botB.page]);

  await runScenario('Arkadaş arama + istek + kabul', async () => {
    await addFriend(botA, botB);
  }, [botA.page, botB.page]);

  await runScenario('Parti daveti + iki tarafta aynı parti görünümü', async () => {
    await makeParty(botA, botB);
  }, [botA.page, botB.page]);

  await runScenario('Partiden güvenli ayrılma', async () => {
    await leaveParty(botB);
    await leaveParty(botA);
  }, [botA.page, botB.page]);

  await runScenario('Gerçek iki oturumla Draft matchmaking handshake', async () => {
    return await startDraftMatch(botA, botB);
  }, [botA.page, botB.page]);

  report.observations.push('Bot Lab v1 gerçek Chromium bağlamları ve Firebase misafir oturumları kullanır; iki bot aynı tarayıcı storage/auth durumunu paylaşmaz.');
  report.observations.push('v1 Draft seçimlerini henüz otomatik tamamlamaz; ilk aşama sosyal, parti, matchmaking ve Draft odasına giriş sözleşmesini doğrular.');
} catch (error) {
  fatal = error;
} finally {
  for (const bot of [botA, botB].filter(Boolean)) {
    report.bots.push({
      label: bot.label,
      username: bot.username,
      uid: bot.uid,
      pageErrors: bot.pageErrors,
      consoleErrors: bot.consoleErrors.slice(-30),
      finalUrl: bot.page.url(),
    });
    await screenshot(bot.page, `final-${bot.label}`);
    try { await bot.context.tracing.stop({ path: path.join(OUT_DIR, `trace-${bot.label}.zip`) }); } catch {}
    try { await bot.context.close(); } catch {}
  }
  await browser.close();
  await writeReport();
}

if (fatal) process.exitCode = 1;
