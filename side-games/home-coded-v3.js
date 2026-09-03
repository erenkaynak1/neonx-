(() => {
  "use strict";

  const HOME_CLASS = "nx-coded-home-v3";
  const STYLE_ID = "nx-coded-home-v3-style";
  const VERSION = "20260903-coded-home-v3-trace1";

  const I = {
    users: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8.5" cy="8" r="3.2"/><path d="M2.5 20v-1.2a5.7 5.7 0 0 1 5.7-5.7h.6a5.7 5.7 0 0 1 5.7 5.7V20"/><circle cx="17.2" cy="9" r="2.5"/><path d="M15 14.1h1.8a4.7 4.7 0 0 1 4.7 4.7V20"/></svg>',
    gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.1"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.2 15a1.7 1.7 0 0 0-.6-1A1.7 1.7 0 0 0 2.5 13.6H2v-4h.5A1.7 1.7 0 0 0 4.2 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 8.6 4.2a1.7 1.7 0 0 0 1-.6A1.7 1.7 0 0 0 10 2.5V2h4v.5A1.7 1.7 0 0 0 15 4.2a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 8.6a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4h.9v4h-.9a1.7 1.7 0 0 0-1.7 1Z"/></svg>',
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    bot: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="7" width="16" height="13" rx="3"/><path d="M9 3h6M12 3v4M8 13h.01M16 13h.01M8 17h8"/></svg>',
    globe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 13v5M8 21h8M9 18h6"/></svg>',
    xox: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3v18M3 9h18M5 5l4 4M9 5 5 9"/><circle cx="16.8" cy="6.7" r="3"/><path d="M15 15l4 4M19 15l-4 4"/><circle cx="6.7" cy="16.8" r="3"/></svg>',
    twin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5.4a4 4 0 1 0 0 7.2M14.5 5.4a4 4 0 1 1 0 7.2M8.5 13A6 6 0 0 0 4 19M15.5 13a6 6 0 0 1 4.5 6M12 3v18"/></svg>',
    mask: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h12a2 2 0 0 1 2 2v7a7 7 0 0 1-7 7h-1a8 8 0 0 1-8-8V6a2 2 0 0 1 2-2Z"/><path d="M8 9h3M13 9h3M8 13c2 1.4 6 1.4 8 0"/></svg>',
    wordle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18"/></svg>',
    book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5a4 4 0 0 1 4-2h4v17H8a4 4 0 0 0-4 2V5ZM20 5a4 4 0 0 0-4-2h-4v17h4a4 4 0 0 1 4 2V5Z"/></svg>',
    chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 1 1-4.1-7.3A8.5 8.5 0 0 1 21 11.5Z"/><path d="m8 20-5 1 1-5M12 7v5M12 16h.01"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>'
  };

  const css = `
  #bootScreen:has(#bootHome.${HOME_CLASS}.active){background:#010403!important}
  #bootScreen:has(#bootHome.${HOME_CLASS}.active) .bootGlow,
  #bootScreen:has(#bootHome.${HOME_CLASS}.active) .bootBrand{display:none!important}
  #bootScreen:has(#bootHome.${HOME_CLASS}.active) .bootPanel{width:100vw!important;max-width:none!important;height:100dvh!important;min-height:100dvh!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
  #bootHome.${HOME_CLASS}.active{position:relative!important;display:block!important;width:100%!important;height:100dvh!important;overflow:auto!important;background:#010403!important;color:#f6f7f5!important;isolation:isolate}
  #bootHome.${HOME_CLASS} *{box-sizing:border-box}
  #bootHome.${HOME_CLASS} .nx3-legacy{position:fixed!important;left:-99999px!important;top:0!important;width:1px!important;height:1px!important;overflow:hidden!important;visibility:hidden!important;pointer-events:none!important}
  #bootHome.${HOME_CLASS} .nx3-wrap{position:relative;width:100%;min-height:100%;display:flex;justify-content:center;background:#010403;overflow:hidden}
  #bootHome.${HOME_CLASS} .nx3-wrap::before{content:"";position:fixed;inset:-36px;background:linear-gradient(180deg,rgba(0,0,0,.62),rgba(0,7,5,.51) 38%,rgba(0,4,3,.70)),url("./side-games/assets/premium-home/home-city-v2.webp") center/cover no-repeat;filter:blur(14px) saturate(.47) brightness(.55);transform:scale(1.08);pointer-events:none}
  #bootHome.${HOME_CLASS} .nx3-wrap::after{content:"";position:fixed;inset:0;background:radial-gradient(ellipse at 50% 34%,rgba(117,255,28,.09),transparent 32%),linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.32) 72%,rgba(0,0,0,.54));pointer-events:none}
  #bootHome.${HOME_CLASS} .nx3-canvas{position:relative;z-index:2;width:min(100vw,941px);aspect-ratio:941/1672;flex:0 0 auto;container-type:inline-size;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:rgba(0,4,3,.34);overflow:hidden}
  #bootHome.${HOME_CLASS} button,#bootHome.${HOME_CLASS} a{font:inherit;-webkit-tap-highlight-color:transparent}
  #bootHome.${HOME_CLASS} .nx3-btn{border:0;padding:0;margin:0;background:none;color:inherit;text-decoration:none;cursor:pointer}
  #bootHome.${HOME_CLASS} .nx3-led{border:1px solid rgba(177,255,35,.62);background:linear-gradient(180deg,rgba(4,14,10,.94),rgba(1,8,6,.96));box-shadow:inset 0 0 16px rgba(142,255,37,.045),0 0 9px rgba(126,255,34,.055)}
  #bootHome.${HOME_CLASS} svg{fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round}

  #bootHome.${HOME_CLASS} .nx3-social{position:absolute;left:3.72%;top:3.59%;width:14.56%;height:4.31%;border-radius:1.5cqw;display:flex;align-items:center;justify-content:center;gap:.75cqw;color:#f4f5f3;font-size:1.72cqw;font-weight:800;letter-spacing:.025em;z-index:9}
  #bootHome.${HOME_CLASS} .nx3-social svg{width:3.1cqw;height:3.1cqw;color:#aaff2c;filter:drop-shadow(0 0 .55cqw rgba(160,255,42,.56))}
  #bootHome.${HOME_CLASS} .nx3-settings{position:absolute;left:85.86%;top:3.59%;width:9.46%;height:4.31%;border-radius:1.45cqw;display:grid;place-items:center;color:#baff29;z-index:9}
  #bootHome.${HOME_CLASS} .nx3-settings svg{width:4.2cqw;height:4.2cqw;filter:drop-shadow(0 0 .5cqw rgba(171,255,38,.50))}
  #bootHome.${HOME_CLASS} .nx3-logo{position:absolute;left:23.8%;top:5.04%;width:52.5%;height:auto;filter:drop-shadow(0 0 1.05cqw rgba(88,255,46,.45));pointer-events:none}
  #bootHome.${HOME_CLASS} .nx3-sub{position:absolute;left:50%;top:11.67%;transform:translateX(-50%);white-space:nowrap;color:#f4f4f2;font-size:1.68cqw;font-weight:520;letter-spacing:.42em;text-transform:uppercase}
  #bootHome.${HOME_CLASS} .nx3-sub::before,#bootHome.${HOME_CLASS} .nx3-sub::after{content:"";position:absolute;top:50%;width:5.7cqw;height:1px;background:#aaff26;box-shadow:0 0 .5cqw rgba(170,255,38,.42)}
  #bootHome.${HOME_CLASS} .nx3-sub::before{right:calc(100% + 2.2cqw)}#bootHome.${HOME_CLASS} .nx3-sub::after{left:calc(100% + 2.2cqw)}

  #bootHome.${HOME_CLASS} .nx3-shell{position:absolute;left:4.36%;top:14.47%;width:89.91%;height:74.16%;border:1px solid rgba(183,255,44,.62);border-radius:2.0cqw;background:linear-gradient(180deg,rgba(3,11,8,.93),rgba(1,8,6,.95));box-shadow:0 0 0 1px rgba(164,255,41,.03),inset 0 0 3.4cqw rgba(91,255,87,.022),0 1.7cqw 4cqw rgba(0,0,0,.28);overflow:hidden}
  #bootHome.${HOME_CLASS} .nx3-shell::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(118deg,transparent 0 47%,rgba(150,255,44,.022) 49%,transparent 51%)}
  #bootHome.${HOME_CLASS} .nx3-kicker{position:absolute;left:4.35%;top:2.42%;display:flex;align-items:center;gap:1.12cqw;color:#b6ff33;font-size:1.72cqw;font-weight:900;letter-spacing:.075em;z-index:5}
  #bootHome.${HOME_CLASS} .nx3-kicker::before{content:"";width:.72cqw;height:.72cqw;border-radius:50%;background:#aaff28;box-shadow:0 0 .7cqw rgba(170,255,40,.62)}

  #bootHome.${HOME_CLASS} .nx3-hero{position:absolute;left:2.9%;top:5.3%;width:94.3%;height:25.8%;overflow:hidden;border-radius:.8cqw;background:linear-gradient(90deg,rgba(0,6,4,.96) 0%,rgba(0,6,4,.81) 28%,rgba(0,6,4,.14) 62%,rgba(0,6,4,.06));z-index:2}
  #bootHome.${HOME_CLASS} .nx3-hero::before{content:"";position:absolute;right:-4%;top:-5%;width:69%;height:105%;border-radius:50%;background:radial-gradient(ellipse at 50% 90%,rgba(110,255,37,.18),transparent 56%),repeating-radial-gradient(ellipse at 50% 92%,rgba(228,240,223,.40) 0 1px,transparent 2px 14px);opacity:.52;filter:blur(.4px)}
  #bootHome.${HOME_CLASS} .nx3-pitch{position:absolute;right:1.0%;bottom:8%;width:57%;height:60%;transform:perspective(42cqw) rotateX(61deg) rotateZ(-7deg);transform-origin:center bottom;border:1px solid rgba(171,255,57,.66);background:linear-gradient(90deg,transparent 49.5%,rgba(171,255,57,.38) 49.7% 50.3%,transparent 50.5%),linear-gradient(0deg,transparent 49.3%,rgba(171,255,57,.30) 49.5% 50.5%,transparent 50.7%),repeating-linear-gradient(90deg,transparent 0 12.7%,rgba(171,255,57,.10) 13% 13.35%),repeating-linear-gradient(0deg,transparent 0 18%,rgba(171,255,57,.09) 18.2% 18.55%),linear-gradient(135deg,rgba(33,112,24,.28),rgba(7,40,12,.20));box-shadow:0 0 2.6cqw rgba(121,255,46,.24),inset 0 0 2.2cqw rgba(110,255,42,.15)}
  #bootHome.${HOME_CLASS} .nx3-pitch::before{content:"";position:absolute;left:50%;top:50%;width:20%;aspect-ratio:1;border:1px solid rgba(171,255,57,.38);border-radius:50%;transform:translate(-50%,-50%)}
  #bootHome.${HOME_CLASS} .nx3-hero-copy{position:absolute;left:3.0%;top:8.0%;width:42%;z-index:4}
  #bootHome.${HOME_CLASS} .nx3-hero-copy h1{margin:0;color:#f5f5f3;font-family:"Arial Narrow","Roboto Condensed",Impact,sans-serif;font-size:7.8cqw;line-height:.95;letter-spacing:-.035em;text-shadow:0 .35cqw 1.4cqw rgba(0,0,0,.83);white-space:nowrap}
  #bootHome.${HOME_CLASS} .nx3-hero-copy p{margin:2.7cqw 0 0;color:#f0f1ee;font-size:2.25cqw;line-height:1.42;text-shadow:0 .25cqw .85cqw #000}
  #bootHome.${HOME_CLASS} .nx3-start{position:absolute;left:3.7%;top:21.0%;width:29.0%;height:5.0%;border-radius:1.05cqw;display:flex;align-items:center;justify-content:center;gap:2.0cqw;color:#baff31;font-size:2.14cqw;font-weight:900;letter-spacing:.06em;z-index:5}
  #bootHome.${HOME_CLASS} .nx3-start svg{width:2.3cqw;height:2.3cqw;stroke-width:2.2}

  #bootHome.${HOME_CLASS} .nx3-mode{position:absolute;top:28.35%;height:26.35%;border-radius:1.65cqw;color:#f5f6f3;text-align:center;display:flex;flex-direction:column;align-items:center;padding:2.1cqw .7cqw 1.0cqw;z-index:5}
  #bootHome.${HOME_CLASS} .nx3-mode[data-act="single"]{left:3.00%;width:30.05%}#bootHome.${HOME_CLASS} .nx3-mode[data-act="bot"]{left:34.86%;width:30.15%}#bootHome.${HOME_CLASS} .nx3-mode[data-act="online"]{left:66.88%;width:30.12%}
  #bootHome.${HOME_CLASS} .nx3-hex{width:10.2cqw;height:10.2cqw;clip-path:polygon(50% 0,92% 24%,92% 76%,50% 100%,8% 76%,8% 24%);background:linear-gradient(145deg,rgba(158,255,42,.22),rgba(2,9,6,.92));display:grid;place-items:center;position:relative;filter:drop-shadow(0 0 .85cqw rgba(152,255,44,.30));margin-bottom:1.65cqw}
  #bootHome.${HOME_CLASS} .nx3-hex::before{content:"";position:absolute;inset:1px;clip-path:inherit;background:#06100c;z-index:-1}
  #bootHome.${HOME_CLASS} .nx3-hex svg{width:5.5cqw;height:5.5cqw;color:#b6ff3a;stroke-width:1.65;filter:drop-shadow(0 0 .5cqw rgba(182,255,58,.48))}
  #bootHome.${HOME_CLASS} .nx3-mode strong{font-family:"Arial Narrow","Roboto Condensed",Impact,sans-serif;font-size:3.32cqw;line-height:1.02;letter-spacing:.005em;text-transform:uppercase;text-shadow:0 .3cqw .8cqw #000}
  #bootHome.${HOME_CLASS} .nx3-mode small{margin-top:1.4cqw;color:#b9ff34;font-size:1.72cqw;line-height:1.33;letter-spacing:.075em;text-transform:uppercase}
  #bootHome.${HOME_CLASS} .nx3-mode .go{position:absolute;left:4%;right:4%;bottom:1.3%;height:4.1cqw;border-top:1px solid rgba(167,255,40,.20);display:grid;place-items:center;color:#b6ff35}
  #bootHome.${HOME_CLASS} .nx3-mode .go svg{width:2.0cqw;height:2.0cqw;stroke-width:2.4}

  #bootHome.${HOME_CLASS} .nx3-tournament{position:absolute;left:2.82%;top:56.45%;width:94.45%;height:9.45%;border-radius:1.35cqw;display:grid;grid-template-columns:19% 1fr 12%;align-items:center;padding:0 1.2cqw;color:#b6ff35;z-index:5;background:linear-gradient(90deg,rgba(6,27,14,.86),rgba(2,10,7,.96))}
  #bootHome.${HOME_CLASS} .nx3-tournament::before{content:"";position:absolute;inset:.55cqw;border:1px solid rgba(174,255,41,.18);border-radius:.9cqw;pointer-events:none}
  #bootHome.${HOME_CLASS} .nx3-trophy{display:grid;place-items:center}.nx3-trophy svg{width:8.5cqw!important;height:8.5cqw!important;filter:drop-shadow(0 0 .8cqw rgba(181,255,51,.36))}
  #bootHome.${HOME_CLASS} .nx3-tournament strong{display:block;font-family:"Arial Narrow","Roboto Condensed",Impact,sans-serif;font-size:4.25cqw;line-height:1;letter-spacing:.06em;white-space:nowrap}
  #bootHome.${HOME_CLASS} .nx3-tournament small{display:block;margin-top:1.0cqw;color:#f6f7f5;font-size:1.75cqw;letter-spacing:.20em;white-space:nowrap}
  #bootHome.${HOME_CLASS} .nx3-tournament .arr{height:100%;display:grid;place-items:center;border-left:1px solid rgba(174,255,41,.18);transform:skewX(-18deg)}.nx3-tournament .arr svg{width:4.6cqw!important;height:4.6cqw!important;stroke-width:2.35;transform:skewX(18deg)}

  #bootHome.${HOME_CLASS} .nx3-side-title{position:absolute;left:3.2%;right:3.2%;top:67.15%;height:3.1%;display:flex;align-items:center;justify-content:center;gap:2.1cqw;color:#baff32;font-size:1.88cqw;font-weight:780;letter-spacing:.18em;z-index:5}
  #bootHome.${HOME_CLASS} .nx3-side-title::before,#bootHome.${HOME_CLASS} .nx3-side-title::after{content:"";height:1px;flex:1;background:linear-gradient(90deg,transparent,rgba(183,255,45,.72))}.nx3-side-title::after{background:linear-gradient(90deg,rgba(183,255,45,.72),transparent)!important}
  #bootHome.${HOME_CLASS} .nx3-game{position:absolute;top:70.00%;height:22.05%;border-radius:1.55cqw;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:2.0cqw .5cqw 1.0cqw;text-align:center;z-index:5;--accent:#b8ff32;border:1px solid color-mix(in srgb,var(--accent) 62%,transparent);background:linear-gradient(180deg,rgba(3,13,10,.95),rgba(1,8,7,.98));box-shadow:inset 0 0 2.5cqw color-mix(in srgb,var(--accent) 4%,transparent),0 0 1.2cqw color-mix(in srgb,var(--accent) 6%,transparent)}
  #bootHome.${HOME_CLASS} .nx3-game:nth-of-type(1){left:2.1%;width:22.5%}#bootHome.${HOME_CLASS} .nx3-game:nth-of-type(2){left:25.9%;width:22.5%;--accent:#29e8ff}#bootHome.${HOME_CLASS} .nx3-game:nth-of-type(3){left:49.6%;width:22.6%;--accent:#ef70ea}#bootHome.${HOME_CLASS} .nx3-game:nth-of-type(4){left:73.3%;width:24.2%;--accent:#32e9c3}
  #bootHome.${HOME_CLASS} .nx3-game-icon{height:10.8cqw;display:grid;place-items:center;color:var(--accent);filter:drop-shadow(0 0 .85cqw color-mix(in srgb,var(--accent) 42%,transparent))}.nx3-game-icon svg{width:8.7cqw!important;height:8.7cqw!important;stroke-width:1.3}
  #bootHome.${HOME_CLASS} .nx3-game-name{margin-top:.9cqw;color:#f7f7f5;font-family:"Arial Narrow","Roboto Condensed",Impact,sans-serif;font-size:2.35cqw;line-height:1.08;font-weight:850;white-space:nowrap;text-transform:uppercase}
  #bootHome.${HOME_CLASS} .nx3-game .go{position:absolute;left:4%;right:4%;bottom:1.4%;height:3.4cqw;border-top:1px solid color-mix(in srgb,var(--accent) 20%,transparent);display:grid;place-items:center;color:var(--accent)}.nx3-game .go svg{width:1.8cqw!important;height:1.8cqw!important;stroke-width:2.2}
  #bootHome.${HOME_CLASS} .nx3-all{position:absolute;left:2.3%;top:93.15%;width:95.4%;height:5.45%;border-radius:1.05cqw;display:grid;grid-template-columns:1fr 7.3cqw;align-items:center;color:#b9ff31;font-size:2.65cqw;font-weight:900;letter-spacing:.10em;text-transform:uppercase;z-index:5}.nx3-all svg{width:3.4cqw!important;height:3.4cqw!important;stroke-width:2.25}

  #bootHome.${HOME_CLASS} .nx3-footer{position:absolute;left:4.36%;top:89.10%;width:89.91%;height:8.63%;border:1px solid rgba(177,255,38,.58);border-radius:2.0cqw;background:rgba(2,10,7,.94);box-shadow:inset 0 0 2.5cqw rgba(100,255,65,.025),0 1.5cqw 3cqw rgba(0,0,0,.24);display:grid;grid-template-columns:repeat(4,1fr);overflow:hidden;z-index:5}
  #bootHome.${HOME_CLASS} .nx3-foot{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.1cqw;color:#f5f5f3;font-size:1.75cqw;letter-spacing:.045em;text-transform:uppercase;white-space:nowrap}.nx3-foot:not(:last-child)::after{content:"";position:absolute;right:0;top:19%;bottom:19%;width:1px;background:rgba(177,255,39,.37)}.nx3-foot svg{width:5.0cqw!important;height:5.0cqw!important;color:#b7ff32;stroke-width:1.6;filter:drop-shadow(0 0 .55cqw rgba(183,255,50,.30))}

  #bootHome.${HOME_CLASS} .nx3-status{position:fixed;z-index:100;left:50%;bottom:max(12px,env(safe-area-inset-bottom));transform:translateX(-50%);width:min(calc(100% - 32px),430px);padding:0;color:#f7f7f5;font-size:12px;font-weight:750;text-align:center;pointer-events:none}.nx3-status:not(:empty){padding:10px 12px;border:1px solid rgba(168,255,44,.35);border-radius:10px;background:rgba(2,9,7,.96)}
  #bootHome.${HOME_CLASS} .nx3-btn:active{filter:brightness(1.16);transform:translateY(1px)}
  @media(min-width:942px){#bootHome.${HOME_CLASS} .nx3-canvas{margin:0 auto}}
  `;

  function addStyle(){
    document.getElementById(STYLE_ID)?.remove();
    const style=document.createElement("style");
    style.id=STYLE_ID;
    style.textContent=css;
    document.head.appendChild(style);
  }
  function normalize(v){return String(v||"").toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/ı/g,"i").replace(/ş/g,"s").replace(/ğ/g,"g").replace(/ü/g,"u").replace(/ö/g,"o").replace(/ç/g,"c")}
  function controlText(n){return normalize([n?.textContent,n?.getAttribute?.("aria-label"),n?.getAttribute?.("title"),n?.getAttribute?.("data-action")].filter(Boolean).join(" "))}
  function findAction(root,needles,exclude=[]){const set=new Set(exclude.filter(Boolean));return [...root.querySelectorAll("button,a,[role='button']")].find(n=>!set.has(n)&&needles.some(x=>controlText(n).includes(x)))||null}
  function message(status,text){status.textContent=text;setTimeout(()=>{if(status.textContent===text)status.textContent=""},2300)}
  function clickTarget(target,status,label){if(target?.isConnected){target.click();return true}message(status,`${label} şu anda açılamıyor.`);return false}
  function openSocial(tab,status){let n=0;const tryOpen=()=>{if(window.NEON_SOCIAL&&typeof window.NEON_SOCIAL.open==="function"){window.NEON_SOCIAL.open(tab);return true}const fallback=document.querySelector(`[data-neon-social="${tab}"]`);if(fallback){fallback.click();return true}return false};if(tryOpen())return;const timer=setInterval(()=>{n++;if(tryOpen()||n>80){clearInterval(timer);if(n>80)message(status,"Sosyal ekran yüklenemedi.")}},50)}

  function initialize(){
    const home=document.getElementById("bootHome");
    if(!home||home.dataset.nxCodedHome===VERSION)return;
    const single=document.getElementById("singleModeBtn");
    const bot=document.getElementById("botModeBtn");
    const online=document.getElementById("onlineModeBtn");
    const tournament=home.querySelector(".neonHomeQuickRow button");
    const settings=home.querySelector("[data-open-neon-settings]");
    if(!single||!bot||!online||!tournament||!settings){console.error("NEON XI v3: legacy controls missing");return}
    const exclude=[single,bot,online,tournament,settings];
    const how=findAction(home,["nasil oynanir","how to play"],exclude);
    const feedback=findAction(home,["sikayet","oneri","feedback"],[...exclude,how]);

    const legacy=document.createElement("div");legacy.className="nx3-legacy";legacy.setAttribute("aria-hidden","true");while(home.firstChild)legacy.appendChild(home.firstChild);
    const wrap=document.createElement("div");wrap.className="nx3-wrap";
    const canvas=document.createElement("main");canvas.className="nx3-canvas";canvas.setAttribute("aria-label","NEON XI ana menüsü");
    const status=document.createElement("div");status.className="nx3-status";status.setAttribute("role","status");status.setAttribute("aria-live","polite");

    canvas.innerHTML=`
      <button class="nx3-btn nx3-led nx3-social" type="button" data-act="social">${I.users}<span>SOSYAL</span></button>
      <button class="nx3-btn nx3-led nx3-settings" type="button" data-act="settings" aria-label="Ayarlar">${I.gear}</button>
      <img class="nx3-logo" src="./assets/neon-xi-logo-outline.png?v=${VERSION}" alt="NEON XI">
      <div class="nx3-sub">FUTBOL YÖNETİMİ</div>

      <section class="nx3-shell">
        <div class="nx3-kicker">ANA OYUN</div>
        <div class="nx3-hero"><div class="nx3-pitch" aria-hidden="true"></div><div class="nx3-hero-copy"><h1>DRAFT XI</h1><p>Hayalindeki kadroyu kur,<br>zafer için sahaya sür.</p></div></div>
        <button class="nx3-btn nx3-led nx3-start" type="button" data-act="single">HEMEN BAŞLA ${I.arrow}</button>

        <button class="nx3-btn nx3-led nx3-mode" type="button" data-act="single"><span class="nx3-hex">${I.user}</span><strong>TEK<br>OYUNCULU</strong><small>KARİYER MODU</small><span class="go">${I.arrow}</span></button>
        <button class="nx3-btn nx3-led nx3-mode" type="button" data-act="bot"><span class="nx3-hex">${I.bot}</span><strong>BOTA<br>KARŞI</strong><small>ÇEVRİMİÇİ VEYA<br>ÇEVRİMDIŞI</small><span class="go">${I.arrow}</span></button>
        <button class="nx3-btn nx3-led nx3-mode" type="button" data-act="online"><span class="nx3-hex">${I.globe}</span><strong>ONLINE</strong><small>RAKİP ARA ·<br>ARKADAŞ DAVET ET</small><span class="go">${I.arrow}</span></button>

        <button class="nx3-btn nx3-led nx3-tournament" type="button" data-act="tournament"><span class="nx3-trophy">${I.trophy}</span><span><strong>TURNUVA MODU</strong><small>4 TAKIM&nbsp;&nbsp;•&nbsp;&nbsp;8 TAKIM</small></span><span class="arr">${I.arrow}</span></button>

        <div class="nx3-side-title">YAN OYUNLAR</div>
        <a class="nx3-btn nx3-game" href="./side-games/football-xox/index.html"><span class="nx3-game-icon">${I.xox}</span><span class="nx3-game-name">FUTBOL XOX</span><span class="go">${I.arrow}</span></a>
        <a class="nx3-btn nx3-game" href="./side-games/career-twin/index.html"><span class="nx3-game-icon">${I.twin}</span><span class="nx3-game-name">KARİYER İKİZİ</span><span class="go">${I.arrow}</span></a>
        <a class="nx3-btn nx3-game" href="./side-games/futbol-imposter.html"><span class="nx3-game-icon">${I.mask}</span><span class="nx3-game-name">FUTBOL IMPOSTER</span><span class="go">${I.arrow}</span></a>
        <a class="nx3-btn nx3-game" href="./side-games/football-wordle/index.html"><span class="nx3-game-icon">${I.wordle}</span><span class="nx3-game-name">FOOTBALL WORDLE</span><span class="go">${I.arrow}</span></a>
        <a class="nx3-btn nx3-led nx3-all" href="./side-games/index.html"><span>TÜM YAN OYUNLAR</span>${I.arrow}</a>
      </section>

      <nav class="nx3-footer" aria-label="Alt menü">
        <button class="nx3-btn nx3-foot" type="button" data-act="friends">${I.users}<span>ARKADAŞLAR</span></button>
        <button class="nx3-btn nx3-foot" type="button" data-act="how">${I.book}<span>NASIL OYNANIR</span></button>
        <button class="nx3-btn nx3-foot" type="button" data-act="settings">${I.gear}<span>AYARLAR</span></button>
        <button class="nx3-btn nx3-foot" type="button" data-act="feedback">${I.chat}<span>ŞİKAYET & ÖNERİ</span></button>
      </nav>`;

    canvas.addEventListener("click",e=>{
      const el=e.target.closest("[data-act]");if(!el)return;
      const a=el.dataset.act;
      if(a==="social")openSocial("play",status);
      else if(a==="friends")openSocial("friends",status);
      else if(a==="settings")clickTarget(settings,status,"Ayarlar");
      else if(a==="single")clickTarget(single,status,"Tek Oyunculu");
      else if(a==="bot")clickTarget(bot,status,"Bota Karşı");
      else if(a==="online")clickTarget(online,status,"Online");
      else if(a==="tournament")clickTarget(tournament,status,"Turnuva");
      else if(a==="how")clickTarget(how,status,"Nasıl Oynanır");
      else if(a==="feedback")clickTarget(feedback,status,"Şikayet ve Öneri");
    });

    wrap.appendChild(canvas);home.append(legacy,wrap,status);
    home.classList.remove("nx-raster-home-v2","nx-raster-home-v3","nx-coded-home-v1","nx-coded-home-v2");
    home.classList.add(HOME_CLASS);home.dataset.nxCodedHome=VERSION;
  }

  addStyle();
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});else initialize();
})();
