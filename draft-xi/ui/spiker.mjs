// Draft XI — plain match commentary from the engine's event log (Turkish).
// This is the factual layer: every line says what happened and, at key moments, why. The richer commentator
// (jokes, observations, memes; design doc 9.1 / 16.15) builds on top of this later.

const SHOT = { in: 'ceza sahasından', out: 'uzaktan', head: 'kafayla', one: 'karşı karşıya', pen: 'penaltıdan', fk: 'frikikten' };

/**
 * Commentary line for one event, or null when the event is too small to narrate.
 * @param {object} e  engine event
 * @param {(id: string) => string} nm  player id → display name
 * @param {string[]} teams  team names [home, away]
 * @returns {{kind: string, text: string} | null}  kind: goal | chance | card-y | card-r | info | build
 */
export function spikerLine(e, nm, teams) {
  const who = e.p ? nm(e.p) : '';
  const team = e.team != null ? teams[e.team] : '';
  switch (e.type) {
    case 'goal':
      return { kind: 'goal', text: `GOL! ${who} ${SHOT[e.shotType] || ''} ağları sarstı${e.assist && e.assist !== e.p ? `, asist ${nm(e.assist)}` : ''}. ${team} sevinçli!` };
    case 'save': return { kind: 'chance', text: `${who} kurtarıyor${e.by ? `, ${nm(e.by)} gol sevinci yaşayamadı` : ''}${e.kind === 'penalty' ? '. PENALTI KURTARIŞI!' : '.'}` };
    case 'post': return { kind: 'chance', text: `Direk! ${who} çok yaklaştı.` };
    case 'miss': return { kind: 'chance', text: `${who} vurdu, top dışarıda.` };
    case 'block': return { kind: 'info', text: `${who} araya girip şutu blokluyor.` };
    case 'shot': return null; // the outcome line (goal/save/miss/post/block) follows
    case 'through': return { kind: 'chance', text: `${who} ara pasını attı, ${nm(e.to)} kaleciyle karşı karşıya!` };
    case 'cross': return { kind: 'build', text: `${who} ortayı yaptı, ${e.to ? nm(e.to) + ' topun altında' : 'ceza sahası karışık'}.` };
    case 'cross_bad': return { kind: 'build', text: `${who} ortaladı ama savunma uzaklaştırdı.` };
    case 'corner': return { kind: 'info', text: `${team} korner kullanacak.` };
    case 'foul':
      return { kind: e.card === 'red' ? 'card-r' : e.card === 'yellow' ? 'card-y' : 'build',
        text: `${who} faul yaptı, ${nm(e.on)} yerde${e.card === 'yellow' ? '. Sarı kart!' : e.card === 'red' ? '. KIRMIZI KART, oyundan atıldı!' : '.'}` };
    case 'offside': return { kind: 'info', text: `Ofsayt bayrağı kalktı, ${who} erken çıktı.` };
    case 'dribble': return { kind: 'build', text: e.past ? `${who}, ${nm(e.past)} karşısında çalımla sıyrıldı.` : `${who} çalımla sıyrıldı.` };
    case 'tackle': return { kind: 'build', text: `${who} topu kaptı.` };
    case 'intercept': return { kind: 'build', text: `${who} pası okudu, top artık ${team} takımında.` };
    case 'press_win': return { kind: 'build', text: `Pres işe yaradı: ${who} topu rakip yarı alanda kazandı.` };
    case 'aerial': return { kind: 'build', text: `${who} hava topunda üstün geldi.` };
    case 'keeper_rush': return { kind: 'info', text: `${who} kalesinden çıkıp topu kaptı.` };
    case 'reshape': return { kind: 'card-r', text: `${team} 10 kişi kaldı; ${who} boşalan bölgeye kaydı.` };
    case 'half_time': return { kind: 'info', text: 'İlk yarı sona erdi.' };
    case 'full_time': return { kind: 'info', text: 'Maç sona erdi.' };
    case 'possession':
      if (e.how === 'kickoff') return { kind: 'info', text: `${team} santrayı yaptı.` };
      return null;
    default: return null;
  }
}

/** Match minute shown on the scoreboard for an engine time in deciseconds. */
export const dakika = (t) => `${Math.min(90, Math.floor(t / 600) + 1)}'`;
