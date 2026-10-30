#!/usr/bin/env node
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MASTER_PATH = resolve(ROOT, 'side-games/data/master/transfermarkt-players.json');
const MASTER_META_PATH = resolve(ROOT, 'side-games/data/master/transfermarkt-meta.json');
const DATA_DIR = resolve(ROOT, 'side-games/en11/data');
const CORRECTIONS_PATH = resolve(DATA_DIR, 'corrections.json');
const POSITIONS = ['Goalkeeper', 'Defender', 'Midfield', 'Attack'];
const FILES = {
  Goalkeeper: 'players-goalkeeper.json',
  Defender: 'players-defender.json',
  Midfield: 'players-midfield.json',
  Attack: 'players-attack.json',
};
const FIELDS = {
  id: 'id',
  name: 'name',
  position: 'position',
  subPosition: 'sub_position',
  nation: 'nationality',
  recognition: 'recognition_score',
  birthDate: 'birth_date',
  heightCm: 'height_cm',
  clubCount: 'club_count',
  careerGoals: 'career_goals',
  careerAssists: 'career_assists',
  careerAppearances: 'career_appearances',
  internationalCaps: 'international_caps',
  internationalGoals: 'international_goals',
  peakValue: 'peak_market_value_eur',
  sourceSlug: 'slug',
};
const METRIC_FIELDS = {
  internationalGoals: 'internationalGoals',
  internationalCaps: 'internationalCaps',
  careerGoals: 'careerGoals',
  careerAssists: 'careerAssists',
  careerAppearances: 'careerAppearances',
  clubCount: 'clubCount',
  heightCm: 'heightCm',
  age: 'birthDate',
  peakValue: 'peakValue',
};
const CORRECTABLE_FIELDS = new Set([
  'birthDate', 'heightCm', 'clubCount', 'careerGoals', 'careerAssists',
  'careerAppearances', 'internationalCaps', 'internationalGoals', 'peakValue',
]);

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function applyVerifiedCorrections(players, document) {
  const byId = new Map(players.map((player) => [Number(player.id), player]));
  const corrections = Array.isArray(document?.corrections) ? document.corrections : [];
  for (const correction of corrections) {
    const player = byId.get(Number(correction.player_id));
    if (!player) throw new Error(`Correction references unknown player id ${correction.player_id}`);
    if (!/^https:\/\//i.test(String(correction.source_url || ''))) {
      throw new Error(`Correction for ${player.name} must include an HTTPS source_url`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(correction.verified_at || ''))) {
      throw new Error(`Correction for ${player.name} must include verified_at as YYYY-MM-DD`);
    }
    const values = correction.values;
    if (!values || typeof values !== 'object' || Array.isArray(values) || !Object.keys(values).length) {
      throw new Error(`Correction for ${player.name} has no values`);
    }
    for (const [field, value] of Object.entries(values)) {
      if (!CORRECTABLE_FIELDS.has(field)) throw new Error(`Unsupported corrected field: ${field}`);
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        throw new Error(`Correction for ${player.name}.${field} must be a non-negative number`);
      }
      player[field] = value;
    }
    player.verifiedCorrection = {
      verifiedAt: correction.verified_at,
      sourceUrl: correction.source_url,
    };
  }
  return corrections.length;
}

const [master, masterMeta, corrections] = await Promise.all([
  readJson(MASTER_PATH),
  readJson(MASTER_META_PATH),
  readJson(CORRECTIONS_PATH).catch((error) => {
    if (error.code === 'ENOENT') return { schema_version: 1, corrections: [] };
    throw error;
  }),
]);

const pools = Object.fromEntries(POSITIONS.map((position) => [position, []]));
for (const sourcePlayer of master) {
  if (sourcePlayer?.id == null) continue;
  if (!POSITIONS.includes(sourcePlayer.position) || !sourcePlayer.name) continue;
  const player = Object.fromEntries(Object.entries(FIELDS).map(([target, source]) => [target, sourcePlayer[source] ?? null]));
  pools[player.position].push(player);
}

const allPlayers = POSITIONS.flatMap((position) => pools[position]);
const seen = new Set();
for (const player of allPlayers) {
  const id = Number(player.id);
  if (!Number.isSafeInteger(id) || seen.has(id)) throw new Error(`Invalid or duplicate player id ${player.id}`);
  seen.add(id);
}
const verifiedCorrectionCount = applyVerifiedCorrections(allPlayers, corrections);
await mkdir(DATA_DIR, { recursive: true });
await unlink(resolve(DATA_DIR, 'players.json')).catch((error) => {
  if (error.code !== 'ENOENT') throw error;
});

const positionCounts = {};
const metricCoverage = {};
for (const position of POSITIONS) {
  pools[position].sort((a, b) =>
    (Number(b.recognition) || 0) - (Number(a.recognition) || 0) ||
    String(a.name).localeCompare(String(b.name), 'tr'),
  );
  positionCounts[position] = pools[position].length;
  metricCoverage[position] = Object.fromEntries(
    Object.entries(METRIC_FIELDS).map(([metric, field]) => [
      metric,
      pools[position].filter((player) =>
        field === 'birthDate'
          ? typeof player.birthDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(player.birthDate)
          : typeof player[field] === 'number' && Number.isFinite(player[field]),
      ).length,
    ]),
  );
  await writeFile(resolve(DATA_DIR, FILES[position]), `${JSON.stringify(pools[position])}\n`, 'utf8');
}

const metadata = {
  schema_version: 2,
  generated_at: new Date().toISOString(),
  provider: masterMeta.provider || 'dcaribou/transfermarkt-datasets',
  provider_revision: masterMeta.provider_revision || null,
  source_snapshot_at: masterMeta.generated_at || null,
  source_cutoff: masterMeta.dataset_last_appearance || null,
  latest_season: masterMeta.latest_season || null,
  player_count: allPlayers.length,
  position_counts: positionCounts,
  metric_coverage: metricCoverage,
  selection_policy: 'Every source player with a supported on-field position and a name is included. Missing stats remain unavailable.',
  files: FILES,
  corrections_file: 'side-games/en11/data/corrections.json',
  verified_corrections: verifiedCorrectionCount,
  disabled_metrics: {
    trophies: 'The source does not provide a verified trophy table.',
    debutAge: 'The source does not provide the first senior national-team appearance date.',
  },
};
await writeFile(resolve(DATA_DIR, 'meta.json'), `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
console.log(`Built ${allPlayers.length.toLocaleString('en-US')} EN 11 players across ${POSITIONS.length} position files.`);
