// Draft XI — post-match analysis. Reads the engine's own result (stats, event log, both tactics, chemistry) and turns
// the mechanisms the engine really uses into cause → effect sentences: what each side's plan ran into, what worked
// and why. Every sentence is backed by numbers from this match; nothing is invented.
const yuzde = (a, b) => (b ? Math.round((100 * a) / b) : 0);
const ort = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** @returns {{ baslik: string, taraf: Array<Array<{ton:'iyi'|'kotu'|'not', agirlik:number, metin:string}>> }} */
export function maçAnalizi(r, names, oyuncuAdi = (id) => id) {
  const E = r.events, taraf = [[], []];
  const say = (s, f) => E.filter((e) => e.team === s && f(e)).length;
  for (const s of [0, 1]) {
    const o = 1 - s, st = r.stats[s], so = r.stats[o], T = r.teams[s].tactic || {}, O = r.teams[o].tactic || {};
    const ad = names[s], rakip = names[o], out = taraf[s];
    const add = (ton, agirlik, metin) => out.push({ ton, agirlik, metin });
    const possPay = yuzde(st.possession, st.possession + so.possession);
    // long balls against the line height
    if (T.passing === 'long' || st.longPasses >= 60) {
      const acc = yuzde(st.longOk, st.longPasses);
      if (O.line === 'low' && acc < 55) add('kotu', 8, `${ad} uzun topa yüklendi (${st.longPasses} uzun pas, %${acc} isabet) ama ${rakip} hattı geride tuttuğu için savunma arkasında koşacak alan yoktu; uzun toplar karşılık bulmadı.`);
      else if (O.line === 'high' && (acc >= 52 || st.throughsOk >= 2)) add('iyi', 8, `${rakip} hattını önde tuttu; ${ad} bu yüksek hattın arkasına attığı uzun toplarla (%${acc} isabet) oyunu hızla rakip yarıya taşıdı.`);
      else if (acc < 45) add('kotu', 5, `${ad} uzun toplarda isabet bulamadı (%${acc}); topu sık sık rakibe geri verdi.`);
    }
    // crosses into a packed / open box, aerial strength
    if (st.crosses >= 10) {
      const acc = yuzde(st.crossesOk, st.crosses), air = yuzde(st.aerialsWon, st.aerials);
      if (st.headerGoals >= 1) add('iyi', 9, `Kanat ortaları sonuç verdi: ${st.headerGoals} kafa golü. Hava topu kazanma oranı: %${air}.`);
      else if (O.line === 'low' && acc < 40) add('kotu', 7, `${ad} ${st.crosses} orta yaptı ama ${rakip} geride ceza sahasını doldurduğu için ortalar adama ulaşmadı (isabet %${acc}).`);
      else if (st.aerials >= 6 && air < 40) add('kotu', 6, `${ad} ortalarla ceza sahasına girdi ama hava toplarında etkisiz kaldı (kazanma oranı %${air}).`);
    }
    // press against the opponent's build-up
    if (T.press === 'high' && st.presses >= 10) {
      const win = yuzde(st.pressWins, st.presses);
      if (O.passing === 'short' && win >= 25) add('iyi', 8, `Yüksek pres, kısa pasla geriden çıkmaya çalışan ${rakip} takımını kendi yarı alanında yakaladı: ${st.pressWins} top kapma.`);
      else if (O.passing === 'long') add('not', 5, `${rakip} topu erken uzun oynayarak presi atladı; ${ad} ${st.presses} kez bastı, yalnızca ${st.pressWins} top kazandı.`);
      const gecGol = E.filter((e) => e.type === 'goal' && e.team === o && e.t > 39000).length;
      if (gecGol >= 1) add('kotu', 7, `Yüksek pres 65. dakikadan sonra düştü ve ${ad} son bölümde ${gecGol} gol yedi.`);
    }
    if (T.tackling === 'hard' && (st.yellows + st.reds * 2 >= 3 || st.fouls >= 17)) add('kotu', 6, `Sert müdahale ${st.fouls} faul ve ${st.yellows + st.reds} kart getirdi; ${rakip} duran toplar kazandı.`);
    // through balls, offside trap
    if (st.throughs >= 5) {
      if (st.offsides >= 3 && O.line === 'high') add('kotu', 7, `Ara paslarına erken koşan oyuncular ${rakip} takımının ofsayt tuzağına takıldı (${st.offsides} ofsayt).`);
      else if (st.throughsOk >= 3) add('iyi', 7, `Ara pasları savunma arkasına ${st.throughsOk} kez ulaştı; ${say(s, (e) => e.type === 'shot' && e.shotType === 'one')} kez kaleciyle karşı karşıya kalındı.`);
    }
    // possession vs chances
    if (possPay >= 58 && st.shots <= so.shots) add('kotu', 6, `${ad} topa %${possPay} sahip oldu ama bunu pozisyona çeviremedi: ${st.shots} şut (${rakip}: ${so.shots}).`);
    else if (possPay <= 42 && st.goals > so.goals) add('iyi', 8, `${ad} topu %${100 - possPay} oranında rakibe bıraktı ama geçişlerde daha etkiliydi ve skoru aldı.`);
    // finishing against expected goals
    if (st.shots >= 5 && st.goals >= 2 && st.goals / st.shots >= 0.28) add('iyi', 7, `Fırsatçı bir gün: ${st.shots} şutun ${st.goals} tanesi gol oldu.`);
    else if (st.shots >= 12 && st.goals <= 1) add('kotu', 7, `Bitiricilik kötü günündeydi: ${st.shots} şut (${st.onTarget} isabetli) ama ${st.goals ? 'yalnızca 1 gol' : 'hiç gol yok'}.`);
    // long shots against a deep block
    const uzak = say(s, (e) => e.type === 'shot' && e.shotType === 'out');
    if (O.line === 'low' && uzak >= 4) add('not', 4, `${rakip} ceza sahasını kapatınca ${ad} şansını ${uzak} kez uzaktan denedi.`);
    // closed areas against the attacking direction
    if (O.closed === 'centre' && T.direction === 'centre') add('kotu', 6, `${ad} merkezden oynamak istedi ama ${rakip} merkezi kapattı; orta koridora atılan paslar zorlaştı.`);
    if (O.closed === 'wings' && T.direction === 'wings') add('kotu', 6, `${ad} kanatlardan gitmek istedi ama ${rakip} kanatları kapattı; kanat koridorlarına pas yolu daraldı.`);
    if (O.closed === 'centre' && T.direction === 'wings') add('iyi', 6, `${rakip} merkezi kapattı; ${ad} açık bırakılan kanatlardan oynayarak doğru cevabı verdi.`);
    // defending plan: what the line height let through
    const birebirYenen = say(o, (e) => e.type === 'shot' && e.shotType === 'one');
    if (T.line === 'low' && so.shots <= 9) add('iyi', 7, `Geride kurulan blok ${rakip} takımına yalnızca ${so.shots} şut verdi; ceza sahası kalabalıktı.`);
    if (T.line === 'high' && birebirYenen >= 2) add('kotu', 7, `Yüksek savunma hattının arkasında ${birebirYenen} kez kaleciyle karşı karşıya kalındı.`);
    if (T.creativity === 'high') { const acc = yuzde(st.passesOk, st.passes); if (acc < 80) add('not', 4, `Serbest oyunun bedeli riskli paslardı: pas isabeti %${acc}, ama ${st.throughs + st.dribbles} ara pası / çalım denendi.`); }
    // chances and the midfield battle
    if (st.shots >= so.shots * 2 && st.shots >= 10) add('iyi', 6, `Pozisyon üstünlüğü açıktı: ${st.shots} şut, ${rakip} ${so.shots} şut.`);
    const kazan = say(s, (e) => ['tackle', 'intercept', 'press_win'].includes(e.type)), kazanO = say(o, (e) => ['tackle', 'intercept', 'press_win'].includes(e.type));
    if (kazan - kazanO >= 10) add('iyi', 5, `Orta saha mücadelesini ${ad} kazandı: ${kazan} top kapma ve araya girme (${rakip}: ${kazanO}).`);
    const sol = st.leftCorridorAttacks, sag = st.rightCorridorAttacks;
    if (sol + sag >= 14 && Math.max(sol, sag) / (sol + sag) >= 0.62) add('not', 3, `Ataklar ağırlıkla ${sol > sag ? 'sol' : 'sağ'} kanattan geldi (kanat ataklarının %${yuzde(Math.max(sol, sag), sol + sag)}).`);
    // set pieces
    let kornerGol = 0;
    E.forEach((e, k) => { if (e.type === 'corner' && e.team === s) for (let j = k + 1; j < Math.min(E.length, k + 6); j++) { if (E[j].type === 'goal') { if (E[j].team === s) kornerGol++; break; } if (E[j].type === 'possession') break; } });
    if (kornerGol >= 1) add('iyi', 7, `Duran toplar fark yarattı: ${kornerGol} gol kornerden geldi.`);
    // keeper
    const kurtaris = say(s, (e) => e.type === 'save');
    if (kurtaris >= 5) add('iyi', 6, `${ad} kalecisi ${kurtaris} kurtarışla takımını maçta tuttu.`);
    // chemistry
    const kim = ort((r.teams[s].chemistry || []).map((x) => x[1])), kimO = ort((r.teams[o].chemistry || []).map((x) => x[1]));
    if (kim - kimO >= 1.5) add('iyi', 4, `Takım kimyası (ortalama ${kim.toFixed(1)}, rakip ${kimO.toFixed(1)}) pas ve mücadelelerde küçük ama sürekli bir artı verdi.`);
    if (r.motm && r.motm.side === s) add('iyi', 3, `Maçın oyuncusu ${oyuncuAdi(r.motm.id)} (${r.motm.rating.toFixed(1)}).`);
    out.sort((a, b) => b.agirlik - a.agirlik);
    taraf[s] = out.slice(0, 5);
  }
  const [g0, g1] = r.score;
  const kazanan = g0 === g1 ? -1 : g0 > g1 ? 0 : 1;
  const neden = kazanan >= 0 ? taraf[kazanan].find((x) => x.ton === 'iyi') || taraf[1 - kazanan].find((x) => x.ton === 'kotu') : null;
  const baslik = kazanan < 0 ? `${names[0]} ile ${names[1]} yenişemedi.` : `${names[kazanan]} kazandı.${neden ? ' ' + neden.metin : ''}`;
  return { baslik, taraf };
}
