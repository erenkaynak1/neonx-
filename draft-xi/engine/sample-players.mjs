// Draft XI v2 prototype: 44 sample players in four squads (design doc 12: small prototype first).
// Values are Claude's own first-pass judgement for testing the engine, NOT reviewed data and NOT copied from any game.
// Outfield attributes (1–99), in this order:
//   fin = Bitiricilik, lon = Uzaktan şut, hed = Hava topu, posn = Pozisyon alma, dri = Dribling, ft = İlk dokunuş,
//   sp = Kısa pas, lp = Uzun pas, cro = Orta, vis = Vizyon, tac = Top kapma, mar = Markaj, pac = Hız, str = Güç
// Goalkeepers also have gk = [ref, gpos, ghd, one] = Refleks, Pozisyon, Hava topları, Bire bir.
const KEYS = ['fin', 'lon', 'hed', 'posn', 'dri', 'ft', 'sp', 'lp', 'cro', 'vis', 'tac', 'mar', 'pac', 'str'];
const GK_KEYS = ['ref', 'gpos', 'ghd', 'one'];

// [id, name, positions, foot, weakFoot(1–5), height cm, nation, club, league, former clubs, attrs[14], gk[4]?]
const RAW = [
  // Squad A — 4-3-3
  ['alisson', 'Alisson', ['GK'], 'R', 2, 193, 'Brezilya', 'Liverpool', 'Premier League', ['Roma', 'Internacional'], [20, 25, 30, 20, 30, 70, 72, 74, 20, 60, 25, 25, 50, 70], [88, 89, 84, 88]],
  ['trent', 'Trent Alexander-Arnold', ['RB', 'CM'], 'R', 3, 180, 'İngiltere', 'Real Madrid', 'La Liga', ['Liverpool'], [62, 80, 55, 68, 74, 82, 86, 92, 93, 91, 70, 66, 76, 66]],
  ['vandijk', 'Virgil van Dijk', ['CB'], 'R', 3, 193, 'Hollanda', 'Liverpool', 'Premier League', ['Southampton', 'Celtic'], [50, 60, 91, 55, 60, 74, 80, 82, 50, 72, 89, 91, 78, 92]],
  ['saliba', 'William Saliba', ['CB'], 'R', 3, 192, 'Fransa', 'Arsenal', 'Premier League', ['Marseille', 'Saint-Étienne'], [35, 40, 84, 45, 66, 76, 80, 72, 40, 66, 88, 89, 84, 86]],
  ['theo', 'Theo Hernández', ['LB', 'LWB'], 'L', 2, 184, 'Fransa', 'Al Hilal', 'Saudi Pro League', ['Milan', 'Real Madrid'], [70, 72, 70, 70, 82, 78, 76, 74, 80, 72, 74, 72, 93, 82]],
  ['rodri', 'Rodri', ['DM', 'CM'], 'R', 3, 191, 'İspanya', 'Manchester City', 'Premier League', ['Atlético Madrid', 'Villarreal'], [68, 80, 78, 72, 74, 88, 93, 89, 60, 90, 87, 85, 64, 84]],
  ['odegaard', 'Martin Ødegaard', ['CM', 'AM'], 'L', 3, 178, 'Norveç', 'Arsenal', 'Premier League', ['Real Madrid', 'Real Sociedad'], [74, 82, 50, 78, 86, 89, 91, 87, 78, 93, 60, 58, 72, 60]],
  ['pedri', 'Pedri', ['CM', 'AM'], 'R', 4, 174, 'İspanya', 'Barcelona', 'La Liga', ['Las Palmas'], [70, 74, 45, 76, 89, 91, 92, 84, 70, 92, 66, 62, 74, 56]],
  ['saka', 'Bukayo Saka', ['RW', 'RM'], 'L', 3, 178, 'İngiltere', 'Arsenal', 'Premier League', [], [82, 78, 55, 84, 88, 86, 82, 74, 87, 84, 50, 48, 90, 66]],
  ['haaland', 'Erling Haaland', ['ST'], 'L', 3, 195, 'Norveç', 'Manchester City', 'Premier League', ['Borussia Dortmund', 'Red Bull Salzburg'], [95, 78, 88, 94, 76, 80, 70, 60, 55, 68, 40, 35, 90, 93]],
  ['vinicius', 'Vinícius Júnior', ['LW'], 'R', 3, 176, 'Brezilya', 'Real Madrid', 'La Liga', ['Flamengo'], [84, 74, 50, 82, 94, 86, 78, 70, 78, 80, 35, 30, 95, 66]],
  // Squad B — 4-4-2
  ['courtois', 'Thibaut Courtois', ['GK'], 'L', 2, 200, 'Belçika', 'Real Madrid', 'La Liga', ['Chelsea', 'Atlético Madrid'], [20, 20, 35, 20, 25, 66, 68, 70, 20, 58, 25, 25, 45, 72], [90, 88, 90, 89]],
  ['hakimi', 'Achraf Hakimi', ['RB', 'RWB'], 'R', 3, 181, 'Fas', 'Paris Saint-Germain', 'Ligue 1', ['Inter', 'Borussia Dortmund', 'Real Madrid'], [74, 72, 62, 74, 84, 82, 80, 74, 82, 78, 74, 72, 95, 74]],
  ['rudiger', 'Antonio Rüdiger', ['CB'], 'R', 2, 190, 'Almanya', 'Real Madrid', 'La Liga', ['Chelsea', 'Roma'], [45, 58, 86, 48, 58, 70, 74, 74, 45, 64, 87, 86, 84, 92]],
  ['bastoni', 'Alessandro Bastoni', ['CB'], 'L', 2, 190, 'İtalya', 'Inter', 'Serie A', ['Atalanta', 'Parma'], [45, 55, 83, 50, 70, 80, 84, 86, 66, 78, 86, 86, 74, 84]],
  ['grimaldo', 'Alejandro Grimaldo', ['LB', 'LWB', 'LM'], 'L', 2, 171, 'İspanya', 'Bayer Leverkusen', 'Bundesliga', ['Benfica', 'Barcelona'], [72, 82, 50, 74, 82, 84, 84, 84, 88, 84, 70, 68, 82, 58]],
  ['olise', 'Michael Olise', ['RM', 'RW', 'AM'], 'L', 3, 184, 'Fransa', 'Bayern Münih', 'Bundesliga', ['Crystal Palace'], [80, 82, 50, 80, 90, 88, 86, 82, 86, 90, 45, 42, 84, 62]],
  ['rice', 'Declan Rice', ['CM', 'DM'], 'R', 3, 188, 'İngiltere', 'Arsenal', 'Premier League', ['West Ham'], [70, 76, 74, 72, 80, 84, 86, 86, 74, 84, 86, 84, 78, 86]],
  ['bellingham', 'Jude Bellingham', ['CM', 'AM'], 'R', 3, 186, 'İngiltere', 'Real Madrid', 'La Liga', ['Borussia Dortmund', 'Birmingham City'], [84, 78, 76, 88, 87, 87, 84, 80, 70, 86, 74, 72, 80, 84]],
  ['musiala', 'Jamal Musiala', ['LM', 'AM', 'LW'], 'R', 4, 184, 'Almanya', 'Bayern Münih', 'Bundesliga', [], [82, 76, 55, 84, 93, 90, 84, 72, 66, 86, 50, 45, 82, 58]],
  ['kane', 'Harry Kane', ['ST'], 'R', 4, 188, 'İngiltere', 'Bayern Münih', 'Bundesliga', ['Tottenham'], [94, 90, 84, 92, 80, 88, 86, 84, 76, 90, 45, 40, 70, 84]],
  ['mbappe', 'Kylian Mbappé', ['ST', 'LW'], 'R', 4, 178, 'Fransa', 'Real Madrid', 'La Liga', ['Paris Saint-Germain', 'Monaco'], [93, 84, 66, 92, 92, 88, 80, 72, 76, 84, 35, 32, 97, 78]],
  // Squad C — 3-5-2
  ['donnarumma', 'Gianluigi Donnarumma', ['GK'], 'R', 2, 196, 'İtalya', 'Manchester City', 'Premier League', ['Paris Saint-Germain', 'Milan'], [20, 20, 30, 20, 25, 60, 62, 66, 20, 55, 25, 25, 50, 80], [89, 85, 82, 90]],
  ['gvardiol', 'Joško Gvardiol', ['CB', 'LB'], 'L', 3, 185, 'Hırvatistan', 'Manchester City', 'Premier League', ['RB Leipzig', 'Dinamo Zagreb'], [55, 62, 80, 55, 76, 80, 82, 78, 66, 74, 86, 85, 84, 86]],
  ['marquinhos', 'Marquinhos', ['CB'], 'R', 3, 183, 'Brezilya', 'Paris Saint-Germain', 'Ligue 1', ['Roma', 'Corinthians'], [45, 50, 84, 50, 66, 78, 82, 78, 45, 72, 87, 89, 78, 80]],
  ['konate', 'Ibrahima Konaté', ['CB'], 'R', 2, 194, 'Fransa', 'Real Madrid', 'La Liga', ['Liverpool', 'RB Leipzig'], [40, 40, 86, 45, 58, 68, 72, 66, 35, 58, 86, 84, 86, 92]],
  ['frimpong', 'Jeremie Frimpong', ['RWB', 'RB', 'RM'], 'R', 3, 171, 'Hollanda', 'Liverpool', 'Premier League', ['Bayer Leverkusen', 'Celtic'], [74, 66, 50, 78, 86, 80, 78, 68, 80, 74, 66, 64, 95, 60]],
  ['dimarco', 'Federico Dimarco', ['LWB', 'LB'], 'L', 2, 175, 'İtalya', 'Inter', 'Serie A', ['Hellas Verona'], [70, 84, 55, 72, 76, 80, 80, 86, 90, 82, 70, 68, 80, 66]],
  ['kimmich', 'Joshua Kimmich', ['DM', 'CM', 'RB'], 'R', 4, 177, 'Almanya', 'Bayern Münih', 'Bundesliga', ['RB Leipzig'], [66, 80, 60, 70, 76, 86, 91, 92, 88, 92, 82, 80, 70, 70]],
  ['valverde', 'Federico Valverde', ['CM', 'RM', 'DM'], 'R', 3, 182, 'Uruguay', 'Real Madrid', 'La Liga', ['Peñarol'], [76, 88, 70, 76, 80, 82, 84, 86, 78, 82, 80, 76, 88, 84]],
  ['barella', 'Nicolò Barella', ['CM'], 'R', 3, 172, 'İtalya', 'Inter', 'Serie A', ['Cagliari'], [74, 78, 60, 78, 84, 84, 86, 82, 78, 86, 80, 74, 80, 70]],
  ['lautaro', 'Lautaro Martínez', ['ST'], 'R', 3, 174, 'Arjantin', 'Inter', 'Serie A', ['Racing Club'], [90, 80, 80, 90, 82, 84, 76, 66, 60, 76, 50, 45, 82, 82]],
  ['isak', 'Alexander Isak', ['ST'], 'R', 3, 192, 'İsveç', 'Liverpool', 'Premier League', ['Newcastle United', 'Real Sociedad', 'Borussia Dortmund'], [88, 80, 78, 86, 86, 86, 76, 66, 62, 76, 40, 38, 88, 74]],
  // Squad D — 4-2-3-1 (Süper Lig)
  ['ederson', 'Ederson', ['GK'], 'L', 3, 188, 'Brezilya', 'Fenerbahçe', 'Süper Lig', ['Manchester City', 'Benfica'], [20, 25, 30, 20, 30, 80, 82, 88, 20, 70, 25, 25, 55, 70], [84, 83, 80, 84]],
  ['semedo', 'Nélson Semedo', ['RB'], 'R', 3, 177, 'Portekiz', 'Fenerbahçe', 'Süper Lig', ['Wolverhampton', 'Barcelona', 'Benfica'], [55, 58, 55, 62, 76, 74, 74, 66, 72, 68, 72, 70, 84, 66]],
  ['skriniar', 'Milan Škriniar', ['CB'], 'R', 2, 187, 'Slovakya', 'Fenerbahçe', 'Süper Lig', ['Paris Saint-Germain', 'Inter', 'Sampdoria'], [40, 45, 84, 45, 55, 70, 74, 70, 40, 62, 86, 87, 72, 86]],
  ['sanchez', 'Davinson Sánchez', ['CB'], 'R', 2, 187, 'Kolombiya', 'Galatasaray', 'Süper Lig', ['Tottenham', 'Ajax'], [40, 40, 82, 42, 55, 66, 70, 66, 35, 58, 82, 80, 82, 88]],
  ['eren', 'Eren Elmalı', ['LB'], 'R', 3, 179, 'Türkiye', 'Galatasaray', 'Süper Lig', ['Trabzonspor'], [52, 55, 62, 58, 68, 70, 70, 66, 72, 64, 72, 70, 82, 70]],
  ['torreira', 'Lucas Torreira', ['DM', 'CM'], 'R', 3, 166, 'Uruguay', 'Galatasaray', 'Süper Lig', ['Arsenal', 'Sampdoria', 'Fiorentina'], [58, 66, 50, 64, 74, 80, 84, 78, 60, 78, 85, 82, 72, 70]],
  ['kante', "N'Golo Kanté", ['DM', 'CM'], 'R', 3, 168, 'Fransa', 'Fenerbahçe', 'Süper Lig', ['Al-Ittihad', 'Chelsea', 'Leicester City'], [62, 66, 55, 72, 76, 80, 80, 74, 62, 76, 88, 84, 78, 74]],
  ['kerem', 'Kerem Aktürkoğlu', ['LW', 'RW'], 'R', 3, 173, 'Türkiye', 'Fenerbahçe', 'Süper Lig', ['Benfica', 'Galatasaray'], [80, 76, 55, 82, 84, 80, 76, 70, 76, 78, 45, 40, 86, 60]],
  ['sara', 'Gabriel Sara', ['AM', 'CM'], 'L', 3, 180, 'Brezilya', 'Galatasaray', 'Süper Lig', ['Norwich City', 'São Paulo'], [72, 80, 60, 76, 80, 82, 84, 84, 82, 86, 66, 62, 74, 68]],
  ['barisalper', 'Barış Alper Yılmaz', ['RW', 'ST'], 'R', 3, 186, 'Türkiye', 'Galatasaray', 'Süper Lig', ['Ankara Keçiörengücü'], [74, 70, 74, 76, 80, 74, 70, 64, 72, 68, 60, 55, 90, 86]],
  ['osimhen', 'Victor Osimhen', ['ST'], 'R', 3, 185, 'Nijerya', 'Galatasaray', 'Süper Lig', ['Napoli', 'Lille'], [90, 74, 90, 90, 80, 80, 70, 60, 55, 70, 45, 40, 91, 86]],
];

export const PLAYERS = RAW.map(([id, name, positions, foot, weakFoot, height, nation, club, league, former, a, g]) => {
  const attrs = Object.fromEntries(KEYS.map((k, i) => [k, a[i]]));
  if (g) GK_KEYS.forEach((k, i) => { attrs[k] = g[i]; });
  return { id, name, positions, foot, weakFoot, height, nation, club, league, former, attrs };
});

export const BY_ID = Object.fromEntries(PLAYERS.map(p => [p.id, p]));

// Squads for the lab: formation + slotId → player id
export const SQUADS = {
  A: { name: 'Takım A', formation: '4-3-3', slots: { GK: 'alisson', RB: 'trent', RCB: 'saliba', LCB: 'vandijk', LB: 'theo', DM: 'rodri', LCM: 'pedri', RCM: 'odegaard', RW: 'saka', ST: 'haaland', LW: 'vinicius' } },
  B: { name: 'Takım B', formation: '4-4-2', slots: { GK: 'courtois', RB: 'hakimi', RCB: 'rudiger', LCB: 'bastoni', LB: 'grimaldo', RM: 'olise', LCM: 'rice', RCM: 'bellingham', LM: 'musiala', LS: 'mbappe', RS: 'kane' } },
  C: { name: 'Takım C', formation: '3-5-2', slots: { GK: 'donnarumma', LCB: 'gvardiol', CB: 'marquinhos', RCB: 'konate', RWB: 'frimpong', LWB: 'dimarco', DM: 'kimmich', RCM: 'valverde', LCM: 'barella', LS: 'lautaro', RS: 'isak' } },
  D: { name: 'Takım D', formation: '4-2-3-1', slots: { GK: 'ederson', RB: 'semedo', RCB: 'skriniar', LCB: 'sanchez', LB: 'eren', LDM: 'torreira', RDM: 'kante', LW: 'kerem', AM: 'sara', RW: 'barisalper', ST: 'osimhen' } },
};
