/* NEON XI — avatar pool.
   16 original, flat neon footballer portraits drawn as inline SVG (no image files, no real players).
   window.NEON_AVATARS.html(id) returns the markup; pick(uid) gives a stable default so nobody shows bare
   initials before choosing one. Pure presentation: no Firebase access here. */
(() => {
  'use strict';
  if (window.NEON_AVATARS) return;
  const SKIN = ['#f1c9a5', '#d9a47a', '#b07a52', '#7a4e32', '#5a3826'];
  const HAIR = { black: '#15171a', brown: '#4a2d1a', blond: '#d8b25a', red: '#a3431f', white: '#e7e9ec', blue: '#00d4ff', hood: '#3a454f' };
  const KIT = {
    lime: ['#baff18', '#6f9a0c'], cyan: ['#00eaff', '#0a8fa0'], orange: ['#ff8a3d', '#b4521a'], white: ['#f3f6f8', '#9aa7b2'],
    violet: ['#a77bff', '#5b3ab8'], gold: ['#ffd23f', '#a98410'], red: ['#ff5a6e', '#a52436'], black: ['#2a3138', '#11161a']
  };
  // name, skin, hair style, hair colour, kit, number, extras, cyber detail
  const LIST = [
    ['Volt', 1, 'quiff', 'black', 'lime', 9, '', 'visor'],
    ['Kaptan', 2, 'buzz', 'black', 'cyan', 4, 'band', 'lines'],
    ['Maestro', 0, 'long', 'brown', 'white', 10, 'headband', 'eye'],
    ['Duvar', 3, 'bald', 'black', 'orange', 5, 'beard', 'lines'],
    ['Kanat', 4, 'afro', 'black', 'gold', 7, '', 'headset'],
    ['Kaleci', 1, 'cap', 'black', 'violet', 1, 'gloves', 'visor'],
    ['Sihirbaz', 0, 'bun', 'blond', 'red', 8, '', 'eye'],
    ['Tank', 2, 'mohawk', 'black', 'black', 6, '', 'mask'],
    ['Roket', 3, 'twists', 'black', 'lime', 11, '', 'shades'],
    ['Profesör', 0, 'side', 'white', 'cyan', 3, 'beard', 'eye'],
    ['Glitch', 1, 'curly', 'red', 'orange', 14, '', 'visor'],
    ['Neon', 2, 'mohawk', 'blue', 'violet', 99, '', 'lines'],
    ['Libero', 4, 'buzz', 'black', 'white', 2, 'beard', 'headset'],
    ['Usta', 1, 'side', 'brown', 'gold', 23, 'headband', 'shades'],
    ['Çaylak', 0, 'curly', 'blond', 'lime', 17, '', 'headset'],
    ['Gölge', 3, 'hood', 'hood', 'violet', 0, '', 'mask'],
    ['Admin', 0, 'curly', 'brown', 'lime', 1, 'beard', 'eye']
  ];
  const ids = LIST.map((_, i) => 'a' + String(i + 1).padStart(2, '0'));

  function hairPaths(style, c) {
    switch (style) {
      case 'buzz': return `<path d="M21 28c0-9 5-13.5 11-13.5S43 19 43 28c-2-4.5-6-6.5-11-6.5S23 23.5 21 28z" fill="${c}"/>`;
      case 'quiff': return `<path d="M20.5 29c-1-10 4-16 12-16.5 7-.5 11.5 3 12 9-1 1.5-2 3-2.5 7-2-6-6.5-8.5-11-8.5-5.5 0-8.5 3-10.5 9z" fill="${c}"/><path d="M30 13c4-3.5 11-2.5 13 2-4-1.5-8-.8-11 1.5z" fill="${c}"/>`;
      case 'side': return `<path d="M20.5 30c-1.5-10 3.5-16 11.5-16 7 0 12 4.5 12 12l-.5 3c-1-5-4-7-8-7.5-4-.5-8 1-11 3.5-1.5 1.5-3 3-4 5z" fill="${c}"/><path d="M24 18c3-2 7-2.5 11-1" stroke="rgba(255,255,255,.18)" stroke-width="1.2" fill="none"/>`;
      case 'long': return `<path d="M19.5 40c-2-14 1-26 12.5-26.5C44 13 46.5 25 44.5 40c-1-5-1.5-9-2-12-2.5-4-6-6-10.5-6s-8 2-10.5 6c-.5 3-1 7-2 12z" fill="${c}"/>`;
      case 'afro': return `<g fill="${c}"><circle cx="32" cy="18" r="9"/><circle cx="23" cy="21" r="6.5"/><circle cx="41" cy="21" r="6.5"/><circle cx="20.5" cy="27" r="4.5"/><circle cx="43.5" cy="27" r="4.5"/><circle cx="27" cy="14.5" r="5"/><circle cx="37" cy="14.5" r="5"/></g>`;
      case 'curly': return `<g fill="${c}"><circle cx="24" cy="21" r="4.4"/><circle cx="29" cy="17.5" r="4.6"/><circle cx="35" cy="17.5" r="4.6"/><circle cx="40" cy="21" r="4.4"/><circle cx="21.8" cy="26" r="3.4"/><circle cx="42.2" cy="26" r="3.4"/><circle cx="32" cy="21" r="5"/></g>`;
      case 'bun': return `<circle cx="32" cy="11.5" r="4.6" fill="${c}"/><path d="M21 29c0-9.5 5-14.5 11-14.5S43 19.5 43 29c-2.5-5-6.5-7.5-11-7.5S23.5 24 21 29z" fill="${c}"/>`;
      case 'mohawk': return `<path d="M28.5 25c-.5-6 .5-11 3.5-14 3 3 4 8 3.5 14-1.2-1-2.3-1.4-3.5-1.4s-2.3.4-3.5 1.4z" fill="${c}"/><path d="M21.5 28c.5-3 1.5-5 3-6.5M42.5 28c-.5-3-1.5-5-3-6.5" stroke="${c}" stroke-opacity=".45" stroke-width="1.6" fill="none"/>`;
      case 'twists': return `<g fill="${c}">${[22, 26, 30, 34, 38, 42].map((x, i) => `<rect x="${x - 1.8}" y="${13 + Math.abs(2.5 - i) * 1.4}" width="3.6" height="${10 - Math.abs(2.5 - i)}" rx="1.8"/>`).join('')}<path d="M21 28c0-8 5-11.5 11-11.5S43 20 43 28c-2.5-4-6.5-6-11-6s-8.5 2-11 6z"/></g>`;
      case 'cap': return `<path d="M20.5 27c0-8.5 5-13 11.5-13s11.5 4.5 11.5 13z" fill="${c}"/><path d="M19 27h26.5c2 0 4 .8 5 2H19z" fill="${c}"/><circle cx="32" cy="14.6" r="1.4" fill="rgba(255,255,255,.35)"/>`;
      case 'hood': return `<path d="M17 44c-1-17 4-30 15-30s16 13 15 30c-2-4-3.5-6-5-7.5 0-8-4-13.5-10-13.5s-10 5.5-10 13.5C20.5 38 19 40 17 44z" fill="${c}"/><path d="M22 36.5c0-8 4-13.5 10-13.5s10 5.5 10 13.5" stroke="#a77bff" stroke-width="1.3" fill="none" opacity=".8"/>`;
      default: return '';
    }
  }

  function cyberPart(kind, k1, skin) {
    switch (kind) {
      case 'visor': return `<path d="M20.5 27.2h23l-1.5 5.2H22z" fill="${k1}" opacity=".85"/><path d="M20.5 27.2h23l-1.5 5.2H22z" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".5"/><path d="M23 29h18" stroke="#fff" stroke-opacity=".7" stroke-width=".7"/>`;
      case 'shades': return `<path d="M21.5 27.5h9l-1 3.8h-6.5zM33.5 27.5h9l-1.5 3.8h-6.5z" fill="#0b0f12" stroke="${k1}" stroke-width=".9"/><path d="M30.5 28.3h3" stroke="${k1}" stroke-width=".9"/><path d="M23 28.6h3M35 28.6h3" stroke="${k1}" stroke-opacity=".8" stroke-width=".7"/>`;
      case 'eye': return `<circle cx="36.2" cy="30" r="3.4" fill="#0b0f12" stroke="${k1}" stroke-width="1.1"/><circle cx="36.2" cy="30" r="1.3" fill="${k1}"/><path d="M39.6 30h3.6M36.2 33.4v3.2l2.2 1.6" stroke="${k1}" stroke-width=".8" fill="none" opacity=".85"/>`;
      case 'mask': return `<path d="M24 33.5c2.5-.8 5-1.2 8-1.2s5.5.4 8 1.2l-1 5.8c-2 1.6-4.4 2.4-7 2.4s-5-.8-7-2.4z" fill="#1a2026" stroke="${k1}" stroke-width=".9"/><path d="M28 35.5v3M30.6 35.2v4M33.4 35.2v4M36 35.5v3" stroke="${k1}" stroke-opacity=".8" stroke-width=".8"/>`;
      case 'lines': return `<path d="M39.5 33.5h2.5l1.5-2M39 36h3.5" stroke="${k1}" stroke-width=".9" fill="none" stroke-linecap="round"/><circle cx="43.5" cy="31.5" r=".8" fill="${k1}"/><path d="M24.5 22.5l2-2h3" stroke="${k1}" stroke-width=".8" fill="none" opacity=".8"/>`;
      case 'headset': return `<path d="M20.2 28.5c-.5-8 4.5-13.6 11.8-13.6s12.3 5.6 11.8 13.6" stroke="#1a2026" stroke-width="2.2" fill="none"/><rect x="18.5" y="27" width="4.5" height="7" rx="2" fill="#1a2026" stroke="${k1}" stroke-width=".8"/><path d="M21 34.5c0 3 2.5 4.2 6 4.2" stroke="${k1}" stroke-width=".9" fill="none"/><circle cx="27.4" cy="38.7" r="1" fill="${k1}"/>`;
      default: return '';
    }
  }

  // Hex colour helpers for shading (lighter/darker variants of skin, hair and kit colours).
  const mix = (hex, to, t) => { const n = parseInt(hex.slice(1), 16), m = parseInt(to.slice(1), 16); const c = [16, 8, 0].map(sh => Math.round(((n >> sh) & 255) * (1 - t) + ((m >> sh) & 255) * t)); return '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''); };
  const lite = (h, t) => mix(h, '#ffffff', t), deep = (h, t) => mix(h, '#000000', t);

  // full: profile hero + picker. small: chips and lists (36–48 px) — no bokeh/floor, bolder frame.
  function svg(id, small) {
    const i = Math.max(0, ids.indexOf(id));
    const [, s, hair, hc, kit, num, extra, cyber] = LIST[i];
    const skin = SKIN[s], hairC = HAIR[hc], [k1, k2] = KIT[kit], u = 'n' + i + (small ? 's' : 'f');
    const rim = kit === 'cyan' ? '#baff18' : '#00eaff';
    const numFill = ['white', 'lime', 'gold', 'cyan'].includes(kit) ? '#0b1005' : '#f3f6f8';
    const hood = hair === 'hood', glowHair = hc === 'blue';
    const frame = 'M19 3H45L61 19V45L45 61H19L3 45V19Z';
    const G = `filter="url(#${u}g)"`;
    const beardPath = 'M22.5 31c.5 6 4 10.5 9.5 10.5S41 37 41.5 31c-1.5 2.5-3.5 3.6-5.5 3.8-1.2-1-2.5-1.4-4-1.4s-2.8.4-4 1.4c-2-.2-4-1.3-5.5-3.8z';
    const beard = extra === 'beard' ? `<path d="${beardPath}" fill="${hairC}"/><path d="${beardPath}" fill="url(#${u}hl)"/>` : '';
    const band = extra === 'headband' ? `<path d="M21 24.5c3-2.4 6.8-3.5 11-3.5s8 1.1 11 3.5v2.6c-3-2.2-6.8-3.2-11-3.2s-8 1-11 3.2z" fill="${k1}"/><path d="M21.5 25c3-2.1 6.6-3.1 10.5-3.1s7.5 1 10.5 3.1" stroke="#fff" stroke-opacity=".5" stroke-width=".5" fill="none"/>` : '';
    const armband = extra === 'band' ? `<path d="M12.3 54.6l6.2-2.5 1.5 3.7-6.2 2.5z" fill="${KIT.gold[0]}"/><path d="M12.3 54.6l6.2-2.5" stroke="#fff" stroke-opacity=".6" stroke-width=".5"/>` : '';
    const gloves = extra === 'gloves' ? `<g ${G}><circle cx="13.5" cy="58" r="4" fill="${KIT.lime[0]}"/><circle cx="50.5" cy="58" r="4" fill="${KIT.lime[0]}"/></g>` : '';
    const eye = (cx, ix) => `<ellipse cx="${cx}" cy="30.2" rx="1.95" ry="1.35" fill="#f4f1ec"/><circle cx="${ix}" cy="30.3" r="1.05" fill="#2a1c12"/><circle cx="${ix + .35}" cy="29.9" r=".38" fill="#fff"/><path d="M${cx - 2.1} 29.4c1.3-.9 2.9-.9 4.2 0" stroke="#1a1410" stroke-width=".75" fill="none" stroke-linecap="round"/>`;
    const covered = cyber === 'visor' || cyber === 'shades';
    const eyes = (covered ? '' : eye(27.8, 28.1)) + (covered || cyber === 'eye' ? '' : eye(36.2, 35.9));
    const mouth = cyber === 'mask' ? '' : `<path d="M29.6 36.1c1.5 1 3.3 1 4.8 0" stroke="${deep(skin, .45)}" stroke-width="1" stroke-linecap="round" fill="none"/><path d="M30.6 37.3c.9.3 1.9.3 2.8 0" stroke="${lite(skin, .25)}" stroke-width=".5" stroke-linecap="round" fill="none"/>`;
    const bokeh = small ? '' : `<g filter="url(#${u}b)" opacity=".55"><circle cx="9" cy="14" r="3" fill="${k1}"/><circle cx="55" cy="11" r="2.2" fill="${rim}"/><circle cx="52" cy="27" r="1.6" fill="${k1}"/><circle cx="12" cy="31" r="1.4" fill="${rim}"/><circle cx="58" cy="40" r="2.6" fill="${k1}" opacity=".6"/></g>`;
    const floor = small ? '' : `<g stroke="${k1}" stroke-opacity=".22" stroke-width=".4">${[-30, -16, -6, 0, 6, 16, 30].map(dx => `<path d="M32 40L${32 + dx * 2.4} 64"/>`).join('')}${[44, 48, 53, 59].map(y => `<path d="M0 ${y}H64"/>`).join('')}</g>`;
    const hairLayer = hood ? '' : (glowHair ? `<g ${G}>${hairPaths(hair, hairC)}</g>` : hairPaths(hair, hairC)) + hairPaths(hair, `url(#${u}hl)`);
    return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
<defs>
<radialGradient id="${u}bg" cx="50%" cy="34%" r="72%"><stop offset="0" stop-color="${k1}" stop-opacity=".42"/><stop offset=".45" stop-color="${deep(k2, .78)}"/><stop offset="1" stop-color="#03050a"/></radialGradient>
<linearGradient id="${u}sk" x1=".15" y1=".05" x2=".85" y2="1"><stop offset="0" stop-color="${lite(skin, .14)}"/><stop offset=".6" stop-color="${skin}"/><stop offset="1" stop-color="${deep(skin, .22)}"/></linearGradient>
<linearGradient id="${u}nk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${deep(skin, .3)}"/><stop offset=".55" stop-color="${deep(skin, .08)}"/></linearGradient>
<linearGradient id="${u}kt" x1=".2" y1="0" x2=".8" y2="1"><stop offset="0" stop-color="${lite(k1, .12)}"/><stop offset=".55" stop-color="${k1}"/><stop offset="1" stop-color="${k2}"/></linearGradient>
<linearGradient id="${u}hl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".32"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="${u}rm" x1="0" y1="0" x2="1" y2="0"><stop offset=".62" stop-color="${rim}" stop-opacity="0"/><stop offset="1" stop-color="${rim}" stop-opacity=".3"/></linearGradient>
<filter id="${u}g" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${small ? .7 : 1}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="${u}b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6"/></filter>
<clipPath id="${u}c"><path d="${frame}"/></clipPath>
</defs>
<g clip-path="url(#${u}c)">
<rect width="64" height="64" fill="url(#${u}bg)"/>${floor}${bokeh}
<g${small ? ' transform="translate(32 40) scale(1.22) translate(-32 -40)"' : ''}>
${hood ? hairPaths('hood', hairC) + hairPaths('hood', `url(#${u}hl)`) : ''}
<path d="M8 66c1.5-12 10-18.5 24-18.5S54.5 54 56 66z" fill="url(#${u}kt)"/>
<path d="M14 66c1-6 3-9.5 6-11.5M50 66c-1-6-3-9.5-6-11.5" stroke="#000" stroke-opacity=".18" stroke-width="2.4" fill="none"/>
<path d="M11.5 59c3-5.5 7.5-8.6 13.5-10M52.5 59c-3-5.5-7.5-8.6-13.5-10" stroke="${lite(k1, .45)}" stroke-width=".9" fill="none" ${G}/>
<path d="M26.3 47.6 32 54.2l5.7-6.6" fill="${deep(k2, .2)}"/><path d="M26.3 47.6 32 54.2l5.7-6.6" stroke="${lite(k1, .5)}" stroke-width=".8" fill="none" ${G}/>
<text x="32" y="59.6" font-family="Arial Black,Arial,sans-serif" font-size="7.2" font-weight="900" font-style="italic" fill="${numFill}" text-anchor="middle" stroke="${deep(k2, .3)}" stroke-width=".35" paint-order="stroke">${num}</text>
${armband}${gloves}
<rect x="27.6" y="37" width="8.8" height="11.5" rx="3.6" fill="url(#${u}nk)"/>
<circle cx="21.3" cy="30.6" r="2.6" fill="${skin}"/><circle cx="21.6" cy="30.8" r="1.2" fill="${deep(skin, .2)}"/>
<circle cx="42.7" cy="30.6" r="2.6" fill="${skin}"/><circle cx="42.4" cy="30.8" r="1.2" fill="${deep(skin, .2)}"/>
<ellipse cx="32" cy="29" rx="10.8" ry="12.4" fill="url(#${u}sk)"/>
<path d="M22.4 33c1.5 5.5 5 8.4 9.6 8.4s8.1-2.9 9.6-8.4c-1.6 3.6-5 5.6-9.6 5.6s-8-2-9.6-5.6z" fill="#000" opacity=".1"/>
<ellipse cx="32" cy="29" rx="10.8" ry="12.4" fill="url(#${u}rm)"/>
<path d="M31.4 30.6c-.6 2.2-.8 3.4.1 3.9.6.3 1.4.2 2-.1" stroke="${deep(skin, .32)}" stroke-width=".7" fill="none" stroke-linecap="round"/>
${beard}${eyes}
<path d="M25.2 27.1c1.5-1.2 3.4-1.5 5-.8M38.8 27.1c-1.5-1.2-3.4-1.5-5-.8" stroke="${deep(hairC, .1)}" stroke-width="1.25" stroke-linecap="round" fill="none"/>
${mouth}${hairLayer}${band}
<path d="M50 54.5c2.6 2.4 4.2 6 4.8 10" stroke="${rim}" stroke-width=".8" fill="none" stroke-linecap="round" opacity=".8" ${G}/>
<g ${G}>${cyberPart(cyber, k1, skin)}</g>
</g>
</g>
<path d="${frame}" fill="none" stroke="${k1}" stroke-width="${small ? 2.6 : 1.7}" ${G}/>
<path d="${frame}" fill="none" stroke="${lite(k1, .55)}" stroke-width=".5" opacity=".9"/>
${small ? '' : '<path d="M19 3H29M35 61H45M3 19V27M61 37V45" stroke="#fff" stroke-opacity=".85" stroke-width="1.7" stroke-linecap="round"/>'}
</svg>`;
  }

  function hash(text) { let h = 2166136261; for (const ch of String(text || '')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  const pick = uid => ids[hash(uid) % ids.length];
  const valid = id => ids.includes(id);
  const resolve = (id, uid) => (valid(id) ? id : pick(uid || 'neon'));
  // Served as an <img> data URI: page stylesheets that restyle inline icons (svg path{fill:...}) cannot
  // repaint the avatar, and its gradient ids never collide with other copies on the page.
  const cache = new Map();
  const html = (id, size) => {
    const key = valid(id) ? id : ids[0], small = size === 'small', ck = key + (small ? 's' : '');
    if (!cache.has(ck)) cache.set(ck, key === 'a17' ? './assets/avatars/admin.jpg?v=20261114-admin1' : 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(key, small)));
    return `<img class="nx-avatar-img" src="${cache.get(ck)}" alt="${LIST[ids.indexOf(key)][0]} avatarı" draggable="false" decoding="async">`;
  };
  window.NEON_AVATARS = Object.freeze({ ids, names: Object.fromEntries(ids.map((id, i) => [id, LIST[i][0]])), html, pick, valid, resolve });
})();
