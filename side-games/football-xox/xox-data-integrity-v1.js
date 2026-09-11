(() => {
  'use strict';

  const nativeFetch = window.fetch.bind(window);
  const PLAYER_FILE_RE = /(?:^|\/)xox-players\.json(?:[?#]|$)/;
  const SUPPLEMENT_URL = '../data/master/xox-club-supplement.json?v=20260911-transfer-supplement-v1';

  const COUNTRY_CODES = {
    'Türkiye':'tr','Arjantin':'ar','Brezilya':'br','Fransa':'fr','İspanya':'es','Almanya':'de','İtalya':'it',
    'İngiltere':'gb-eng','Portekiz':'pt','Hollanda':'nl','Belçika':'be','Hırvatistan':'hr','Sırbistan':'rs',
    'Kolombiya':'co','Fas':'ma','Cezayir':'dz','Mısır':'eg','Nijerya':'ng','Senegal':'sn','Fildişi Sahili':'ci',
    'Japonya':'jp','Norveç':'no','İsveç':'se','Uruguay':'uy','Romanya':'ro','Bosna Hersek':'ba','Gana':'gh',
    'Kamerun':'cm','Polonya':'pl','Güney Kore':'kr','Danimarka':'dk','İsviçre':'ch','Avusturya':'at','Meksika':'mx',
    'ABD':'us','Çekya':'cz','Ukrayna':'ua','Gürcistan':'ge','Yunanistan':'gr','Slovakya':'sk','Slovenya':'si','Galler':'gb-wls'
  };

  const supplementPromise = nativeFetch(SUPPLEMENT_URL, {cache:'no-store'})
    .then(response => response.ok ? response.json() : null)
    .catch(error => {
      console.warn('[NEON XI XOX] club supplement unavailable', error);
      return null;
    });

  function mergeSupplement(players, supplement) {
    if (!Array.isArray(players) || !supplement?.players) return {players, enriched:0, clubLinks:0};
    let enriched = 0;
    let clubLinks = 0;
    for (const player of players) {
      const extra = supplement.players[String(player?.id)];
      if (!Array.isArray(extra) || !extra.length) continue;
      const before = new Set(Array.isArray(player.clubs) ? player.clubs : []);
      const merged = new Set(before);
      extra.forEach(club => club && merged.add(club));
      const added = merged.size - before.size;
      if (added > 0) {
        player.clubs = [...merged].sort((a,b)=>String(a).localeCompare(String(b),'tr'));
        enriched += 1;
        clubLinks += added;
      }
    }
    return {players, enriched, clubLinks};
  }

  window.fetch = async function xoxIntegrityFetch(input, init) {
    const url = typeof input === 'string' ? input : String(input?.url || '');
    const response = await nativeFetch(input, init);
    if (!PLAYER_FILE_RE.test(url) || !response.ok) return response;
    try {
      const players = await response.clone().json();
      const supplement = await supplementPromise;
      const merged = mergeSupplement(players, supplement);
      window.NX_XOX_DATA_INTEGRITY = Object.freeze({
        supplementVersion: supplement?.version || null,
        supplementPlayers: Number(supplement?.player_count || 0),
        enrichedPlayers: merged.enriched,
        addedClubLinks: merged.clubLinks
      });
      const headers = new Headers(response.headers);
      headers.set('content-type','application/json; charset=utf-8');
      headers.delete('content-length');
      return new Response(JSON.stringify(merged.players), {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch (error) {
      console.warn('[NEON XI XOX] player supplement merge failed', error);
      return response;
    }
  };

  function flagImage(country, cls='nx-xox-flag') {
    const code = COUNTRY_CODES[country];
    if (!code) return null;
    const img = document.createElement('img');
    img.className = cls;
    img.src = `https://flagcdn.com/${code}.svg`;
    img.alt = '';
    img.setAttribute('aria-hidden','true');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.onerror = () => img.remove();
    return img;
  }

  function directText(node) {
    return [...(node?.childNodes || [])]
      .filter(child => child.nodeType === Node.TEXT_NODE)
      .map(child => child.textContent || '')
      .join('')
      .trim();
  }

  function decorateHead(head) {
    if (head.dataset.nxFlagged === '1') return;
    const small = head.querySelector('small');
    if (!small || small.textContent.trim() !== 'MİLLİYET') return;
    const holder = small.parentElement;
    const country = directText(holder);
    const flag = flagImage(country, 'nx-xox-flag nx-xox-flag-head');
    if (!flag) return;
    small.insertAdjacentElement('afterend', flag);
    head.dataset.nxFlagged = '1';
  }

  function decorateResult(span) {
    if (span.dataset.nxFlagged === '1') return;
    const country = span.textContent.trim();
    const flag = flagImage(country, 'nx-xox-flag nx-xox-flag-result');
    if (!flag) return;
    span.prepend(flag);
    span.dataset.nxFlagged = '1';
  }

  function decorateCondition(node) {
    if (node.dataset.nxFlagged === '1') return;
    const text = node.textContent.trim();
    const parts = text.split(/\s+\+\s+/);
    if (parts.length !== 2 || !parts.some(part => COUNTRY_CODES[part])) return;
    node.textContent = '';
    parts.forEach((part, index) => {
      const wrap = document.createElement('span');
      wrap.className = 'nx-xox-condition-part';
      const flag = flagImage(part, 'nx-xox-flag nx-xox-flag-condition');
      if (flag) wrap.appendChild(flag);
      wrap.appendChild(document.createTextNode(part));
      node.appendChild(wrap);
      if (index === 0) {
        const plus = document.createElement('span');
        plus.className = 'nx-xox-condition-plus';
        plus.textContent = '+';
        node.appendChild(plus);
      }
    });
    node.dataset.nxFlagged = '1';
  }

  function decorate(root=document) {
    root.querySelectorAll?.('.head').forEach(decorateHead);
    root.querySelectorAll?.('.result span').forEach(decorateResult);
    root.querySelectorAll?.('.condition').forEach(decorateCondition);
  }

  function installStyle() {
    if (document.getElementById('nx-xox-data-integrity-style')) return;
    const style = document.createElement('style');
    style.id = 'nx-xox-data-integrity-style';
    style.textContent = `
      .nx-xox-flag{object-fit:cover;box-shadow:0 0 0 1px rgba(255,255,255,.18),0 2px 7px rgba(0,0,0,.34)}
      .nx-xox-flag-head{display:block;width:24px;height:17px;margin:2px auto 4px;border-radius:2px}
      .nx-xox-flag-result{display:inline-block!important;width:21px;height:15px;margin:0 7px 0 0!important;border-radius:2px;vertical-align:-3px}
      .nx-xox-flag-condition{width:20px;height:14px;margin-right:6px;border-radius:2px;vertical-align:-2px}
      .condition[data-nx-flagged="1"]{display:flex;align-items:center;flex-wrap:wrap;gap:6px}
      .nx-xox-condition-part{display:inline-flex;align-items:center;white-space:nowrap}
      .nx-xox-condition-plus{color:#65ff23;font-weight:900}
    `;
    document.head.appendChild(style);
  }

  function startDecorator() {
    installStyle();
    decorate();
    const observer = new MutationObserver(records => {
      for (const record of records) {
        record.addedNodes.forEach(node => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          if (node.matches?.('.head')) decorateHead(node);
          if (node.matches?.('.result span')) decorateResult(node);
          if (node.matches?.('.condition')) decorateCondition(node);
          decorate(node);
        });
      }
    });
    observer.observe(document.documentElement, {subtree:true, childList:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startDecorator, {once:true});
  else startDecorator();
})();
