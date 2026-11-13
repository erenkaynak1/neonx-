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
    ['Gölge', 3, 'hood', 'hood', 'violet', 0, '', 'mask']
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

  // Every rendered copy gets its own gradient/clip ids: duplicate ids on one page (the same avatar in the
  // lobby, the chip and the picker) made browsers resolve them to a hidden copy and drop the fills.
  let serial = 0;
  function svg(id) {
    const i = Math.max(0, ids.indexOf(id));
    const [name, s, hair, hc, kit, num, extra, cyber] = LIST[i];
    const skin = SKIN[s], hairC = HAIR[hc], [k1, k2] = KIT[kit], uid = 'nxa' + i + '_' + (++serial).toString(36);
    const rim = kit === 'cyan' ? '#baff18' : '#00eaff';
    const dark = kit === 'white' || kit === 'lime' || kit === 'gold' || kit === 'cyan' ? '#0b1005' : '#f3f6f8';
    const beard = extra === 'beard' ? `<path d="M22.5 31c.5 6 4 10.5 9.5 10.5S41 37 41.5 31c-1.5 2.5-3.5 3.6-5.5 3.8-1.2-1-2.5-1.4-4-1.4s-2.8.4-4 1.4c-2-.2-4-1.3-5.5-3.8z" fill="${hairC}" opacity=".92"/>` : '';
    const band = extra === 'headband' ? `<path d="M21 24.5c3-2.4 6.8-3.5 11-3.5s8 1.1 11 3.5v2.6c-3-2.2-6.8-3.2-11-3.2s-8 1-11 3.2z" fill="${k1}"/>` : '';
    const armband = extra === 'band' ? `<path d="M12.5 54.5l6-2.4 1.4 3.6-6 2.4z" fill="${KIT.gold[0]}"/><text x="16.2" y="56.4" font-size="3" font-weight="900" fill="#0b1005" text-anchor="middle" transform="rotate(-22 16.2 56)">C</text>` : '';
    const gloves = extra === 'gloves' ? `<circle cx="13" cy="58" r="4.2" fill="${KIT.lime[0]}"/><circle cx="51" cy="58" r="4.2" fill="${KIT.lime[0]}"/>` : '';
    const hood = hair === 'hood';
    const glowHair = hc === 'blue';
    // Chamfered octagon frame (cyber HUD) instead of a plain circle.
    const frame = 'M18 1.5H46L62.5 18V46L46 62.5H18L1.5 46V18Z';
    const eyes = cyber === 'visor' || cyber === 'shades' ? '' : `<g fill="#14181c"><ellipse cx="27.8" cy="30" rx="1.35" ry="1.6"/>${cyber === 'eye' ? '' : '<ellipse cx="36.2" cy="30" rx="1.35" ry="1.6"/>'}</g>`;
    const mouth = cyber === 'mask' ? '' : '<path d="M29.8 36.3c1.4.8 3 .8 4.4 0" stroke="#5a2f22" stroke-width="1.1" stroke-linecap="round" fill="none" opacity=".7"/>';
    return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${name} avatarı">
<defs><radialGradient id="${uid}b" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="${k1}" stop-opacity=".32"/><stop offset=".5" stop-color="#0d1217"/><stop offset="1" stop-color="#040607"/></radialGradient>
<linearGradient id="${uid}k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${k1}"/><stop offset="1" stop-color="${k2}"/></linearGradient>
<linearGradient id="${uid}r" x1="0" y1="0" x2="1" y2="0"><stop offset=".55" stop-color="${rim}" stop-opacity="0"/><stop offset="1" stop-color="${rim}" stop-opacity=".26"/></linearGradient>
<filter id="${uid}g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.1" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<clipPath id="${uid}c"><path d="${frame}"/></clipPath></defs>
<g clip-path="url(#${uid}c)"><rect width="64" height="64" fill="url(#${uid}b)"/>
<g stroke="${k1}" stroke-opacity=".13" stroke-width=".5">${[8, 16, 24, 32, 40, 48, 56].map(x => `<path d="M${x} 0V64M0 ${x}H64"/>`).join('')}</g>
<g fill="${k1}" fill-opacity=".09">${[0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57, 60, 63].map(y => `<rect y="${y}" width="64" height=".8"/>`).join('')}</g>
<path d="M3 40h7l3-3h6M45 12h6l3 3h7" stroke="${rim}" stroke-opacity=".45" stroke-width=".7" fill="none"/>
${hood ? hairPaths('hood', hairC) : ''}
<path d="M8 66c1.5-12 10-18.5 24-18.5S54.5 54 56 66z" fill="url(#${uid}k)"/>
<path d="M14 60l6-4h5M50 60l-6-4h-5" stroke="#fff" stroke-opacity=".35" stroke-width=".8" fill="none"/>
<path d="M26.5 47.6 32 54l5.5-6.4c-1.7-.5-3.6-.7-5.5-.7s-3.8.2-5.5.7z" fill="${k2}"/><path d="M26.5 47.6 32 54l5.5-6.4" stroke="${k1}" stroke-width=".9" fill="none" filter="url(#${uid}g)"/>
<text x="32" y="62.5" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-size="9.5" font-weight="900" font-style="italic" fill="${dark}" text-anchor="middle" opacity=".9">${num}</text>
${armband}${gloves}
<rect x="27.6" y="37" width="8.8" height="11.5" rx="3.6" fill="${skin}"/><path d="M27.6 42.5c2.8 1.6 6 1.6 8.8 0V40h-8.8z" fill="#000" opacity=".14"/>
<circle cx="21.3" cy="30.6" r="2.6" fill="${skin}"/><circle cx="42.7" cy="30.6" r="2.6" fill="${skin}"/>
<ellipse cx="32" cy="29" rx="10.8" ry="12.4" fill="${skin}"/><ellipse cx="32" cy="29" rx="10.8" ry="12.4" fill="url(#${uid}r)"/>
<path d="M42.3 22.5c1.2 3.5 1.2 8 0 11.5" stroke="${rim}" stroke-width=".9" fill="none" opacity=".75" filter="url(#${uid}g)"/>
${beard}${eyes}
<path d="M25.4 26.6c1.4-.9 3-1.1 4.4-.6M38.6 26.6c-1.4-.9-3-1.1-4.4-.6" stroke="#14181c" stroke-width="1.15" stroke-linecap="round" fill="none" opacity=".75"/>
${mouth}
${hood ? '' : (glowHair ? `<g filter="url(#${uid}g)">${hairPaths(hair, hairC)}</g>` : hairPaths(hair, hairC))}${band}
<g filter="url(#${uid}g)">${cyberPart(cyber, k1, skin)}</g>
</g><path d="${frame}" fill="none" stroke="${k1}" stroke-opacity=".9" stroke-width="1.4" filter="url(#${uid}g)"/>
<path d="M18 1.5H30M34 62.5H46M1.5 18V26M62.5 38V46" stroke="#fff" stroke-opacity=".7" stroke-width="1.4"/></svg>`;
  }

  function hash(text) { let h = 2166136261; for (const ch of String(text || '')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  const pick = uid => ids[hash(uid) % ids.length];
  const valid = id => ids.includes(id);
  const resolve = (id, uid) => (valid(id) ? id : pick(uid || 'neon'));
  // Served as an <img> data URI: page stylesheets that restyle inline icons (svg path{fill:...}) cannot
  // repaint the avatar, and its gradient ids never collide with other copies on the page.
  const cache = new Map();
  const html = id => {
    const key = valid(id) ? id : ids[0];
    if (!cache.has(key)) cache.set(key, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(key)));
    return `<img class="nx-avatar-img" src="${cache.get(key)}" alt="${LIST[ids.indexOf(key)][0]} avatarı" draggable="false" decoding="async">`;
  };
  window.NEON_AVATARS = Object.freeze({ ids, names: Object.fromEntries(ids.map((id, i) => [id, LIST[i][0]])), html, pick, valid, resolve });
})();
