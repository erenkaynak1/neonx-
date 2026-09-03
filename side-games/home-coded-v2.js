(() => {
  "use strict";

  const HOME_CLASS = "nx-coded-home-v2";
  const STYLE_ID = "nx-coded-home-v2-style";
  const VERSION = "20260903-coded-home-v2";

  const I = {
    users: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.2 15a1.7 1.7 0 0 0-.6-1A1.7 1.7 0 0 0 2.5 13.6H2v-4h.5A1.7 1.7 0 0 0 4.2 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 8.6 4.2a1.7 1.7 0 0 0 1-.6A1.7 1.7 0 0 0 10 2.5V2h4v.5A1.7 1.7 0 0 0 15 4.2a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 8.6a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4h.9v4h-.9a1.7 1.7 0 0 0-1.7 1Z"/></svg>',
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    bot: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="7" width="16" height="13" rx="3"/><path d="M9 3h6M12 3v4M8 13h.01M16 13h.01M8 17h8"/></svg>',
    globe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 13v5M8 21h8M9 18h6"/></svg>',
    xox: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3v18M16 3v18M3 8h18M3 16h18M5 5l2 2M7 5 5 7M11 11l2 2M13 11l-2 2"/><circle cx="19" cy="5" r="2.2"/><circle cx="5" cy="19" r="2.2"/><circle cx="19" cy="19" r="2.2"/></svg>',
    twin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.4 5.5a4 4 0 1 0 0 6M14.6 5.5a4 4 0 1 1 0 6M8.5 12.5A6.5 6.5 0 0 0 4 18.7M15.5 12.5a6.5 6.5 0 0 1 4.5 6.2M12 4v16"/></svg>',
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
    #bootHome.${HOME_CLASS}.active{position:relative!important;display:block!important;width:100%!important;height:100dvh!important;overflow:hidden!important;background:#010403!important;color:#f7f8f6!important;isolation:isolate}
    #bootHome.${HOME_CLASS} *{box-sizing:border-box}
    #bootHome.${HOME_CLASS} .nx-legacy-home{position:fixed!important;left:-99999px!important;top:0!important;width:1px!important;height:1px!important;overflow:hidden!important;visibility:hidden!important;pointer-events:none!important}
    #bootHome.${HOME_CLASS} .nx-code-bg{position:fixed;inset:-34px;z-index:0;pointer-events:none;overflow:hidden;background:#010403}
    #bootHome.${HOME_CLASS} .nx-code-bg::before{content:"";position:absolute;inset:-26px;background:linear-gradient(180deg,rgba(0,0,0,.60),rgba(0,8,5,.52) 40%,rgba(0,5,3,.78)),url("./side-games/assets/premium-home/home-city-v2.webp") center 15%/cover no-repeat;filter:blur(14px) saturate(.42) brightness(.48);transform:scale(1.11)}
    #bootHome.${HOME_CLASS} .nx-code-bg::after{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 50% 31%,rgba(139,255,36,.09),transparent 30%),radial-gradient(ellipse at 50% 67%,rgba(78,255,84,.08),transparent 38%),linear-gradient(180deg,rgba(0,0,0,.10),rgba(0,0,0,.54) 92%)}
    #bootHome.${HOME_CLASS} .nx-code-scroll{position:relative;z-index:2;width:100%;height:100%;overflow:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding:0 0 max(12px,env(safe-area-inset-bottom))}
    #bootHome.${HOME_CLASS} .nx-code-scroll::-webkit-scrollbar{display:none}
    #bootHome.${HOME_CLASS} .nx-code-app{width:min(100%,430px);min-height:100%;margin:0 auto;padding:14px 14px 10px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    #bootHome.${HOME_CLASS} button,#bootHome.${HOME_CLASS} a{font:inherit}
    #bootHome.${HOME_CLASS} .nx-btn{border:0;background:none;color:inherit;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent;text-decoration:none}
    #bootHome.${HOME_CLASS} .nx-top{position:relative;height:172px;display:flex;justify-content:center;align-items:flex-start}
    #bootHome.${HOME_CLASS} .nx-social,#bootHome.${HOME_CLASS} .nx-settings{position:absolute;top:5px;height:48px;border:1px solid rgba(174,255,37,.54);background:rgba(1,8,6,.82);box-shadow:inset 0 0 18px rgba(123,255,25,.045),0 0 12px rgba(123,255,25,.05);color:#f7f8f5;display:flex;align-items:center;justify-content:center;gap:8px;font-size:12px;font-weight:850;letter-spacing:.055em}
    #bootHome.${HOME_CLASS} .nx-social{left:6px;width:116px;border-radius:10px 16px 10px 16px}
    #bootHome.${HOME_CLASS} .nx-settings{right:6px;width:49px;border-radius:13px}
    #bootHome.${HOME_CLASS} .nx-social svg,#bootHome.${HOME_CLASS} .nx-settings svg{width:22px;height:22px;fill:none;stroke:#b5ff38;stroke-width:1.75;filter:drop-shadow(0 0 6px rgba(181,255,56,.46))}
    #bootHome.${HOME_CLASS} .nx-logo{position:absolute;top:32px;left:50%;transform:translateX(-50%);width:72%;max-width:304px;filter:drop-shadow(0 0 8px rgba(110,255,41,.34));pointer-events:none}
    #bootHome.${HOME_CLASS} .nx-subtitle{position:absolute;top:132px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:12px;font-weight:560;letter-spacing:.44em;color:#f5f6f4;text-transform:uppercase}
    #bootHome.${HOME_CLASS} .nx-subtitle::before,#bootHome.${HOME_CLASS} .nx-subtitle::after{content:"";position:absolute;top:50%;width:50px;height:1px;background:#a6ff2a;box-shadow:0 0 5px rgba(166,255,42,.45)}
    #bootHome.${HOME_CLASS} .nx-subtitle::before{right:calc(100% + 14px)}
    #bootHome.${HOME_CLASS} .nx-subtitle::after{left:calc(100% + 14px)}
    #bootHome.${HOME_CLASS} .nx-shell{position:relative;border:1px solid rgba(171,255,40,.53);border-radius:14px;background:linear-gradient(180deg,rgba(4,12,9,.93),rgba(1,7,5,.94));box-shadow:0 0 0 1px rgba(171,255,40,.03),inset 0 0 34px rgba(52,255,90,.025),0 18px 44px rgba(0,0,0,.25);overflow:hidden}
    #bootHome.${HOME_CLASS} .nx-shell::before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(118deg,transparent 0 47%,rgba(146,255,43,.025) 49%,transparent 51%)}
    #bootHome.${HOME_CLASS} .nx-main{padding:15px 14px 13px}
    #bootHome.${HOME_CLASS} .nx-kicker{display:flex;align-items:center;gap:9px;color:#b6ff39;font-size:11px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;margin-bottom:10px}
    #bootHome.${HOME_CLASS} .nx-kicker::before{content:"";width:14px;height:2px;background:#aaff24;box-shadow:0 0 8px rgba(170,255,36,.55)}
    #bootHome.${HOME_CLASS} .nx-hero{position:relative;height:226px;overflow:hidden;border-radius:8px;margin:0 -1px 9px;background:linear-gradient(180deg,rgba(0,6,4,.14),rgba(0,5,3,.60));border-bottom:1px solid rgba(165,255,35,.16)}
    #bootHome.${HOME_CLASS} .nx-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,5,3,.90) 0%,rgba(0,5,3,.72) 38%,rgba(0,5,3,.08) 66%,rgba(0,5,3,.10));z-index:2;pointer-events:none}
    #bootHome.${HOME_CLASS} .nx-hero-copy{position:relative;z-index:5;width:62%;padding:4px 7px 0 5px}
    #bootHome.${HOME_CLASS} .nx-hero h1{margin:0;color:#f5f5f3;font-family:"Arial Narrow","Roboto Condensed",Impact,sans-serif;font-size:47px;line-height:.98;letter-spacing:-.02em;text-shadow:0 3px 13px rgba(0,0,0,.76)}
    #bootHome.${HOME_CLASS} .nx-hero p{margin:14px 0 0;color:#ebeeeb;font-size:14px;line-height:1.42;max-width:205px;text-shadow:0 2px 9px #000}
    #bootHome.${HOME_CLASS} .nx-start{display:none}
    #bootHome.${HOME_CLASS} .nx-stadium{position:absolute;z-index:1;right:-4%;top:0;width:72%;height:100%;perspective:540px;opacity:.68;filter:blur(.6px) saturate(.55)}
    #bootHome.${HOME_CLASS} .nx-stadium::before{content:"";position:absolute;inset:0 -8% 34% -4%;border-radius:50%;background:radial-gradient(ellipse at 50% 100%,rgba(125,255,55,.11),transparent 57%),repeating-radial-gradient(ellipse at 50% 97%,rgba(226,239,223,.34) 0 1px,transparent 2px 14px);opacity:.40}
    #bootHome.${HOME_CLASS} .nx-stadium::after{content:"";position:absolute;left:5%;right:3%;bottom:14%;height:52%;border:1px solid rgba(162,255,64,.42);background:linear-gradient(90deg,transparent 49.5%,rgba(159,255,56,.26) 50%,transparent 50.5%),linear-gradient(0deg,transparent 49%,rgba(159,255,56,.20) 49.5% 50.5%,transparent 51%),repeating-linear-gradient(90deg,transparent 0 13%,rgba(159,255,56,.06) 13.3% 13.6%),repeating-linear-gradient(0deg,transparent 0 18%,rgba(159,255,56,.055) 18.3% 18.6%),rgba(23,93,23,.12);box-shadow:0 0 18px rgba(113,255,41,.15),inset 0 0 14px rgba(113,255,41,.08);transform:rotateX(62deg) rotateZ(-7deg);transform-origin:center bottom}
    #bootHome.${HOME_CLASS} .nx-modes{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;position:relative;z-index:5}
    #bootHome.${HOME_CLASS} .nx-mode{min-height:184px;border:1px solid rgba(171,255,37,.47);border-radius:12px;background:linear-gradient(180deg,rgba(6,17,13,.96),rgba(2,9,7,.98));display:flex;flex-direction:column;align-items:center;text-align:center;padding:12px 6px 9px;box-shadow:inset 0 0 18px rgba(127,255,30,.025)}
    #bootHome.${HOME_CLASS} .nx-mode-icon{width:57px;height:57px;margin:0 auto 10px;clip-path:polygon(50% 0,92% 24%,92% 76%,50% 100%,8% 76%,8% 24%);background:linear-gradient(145deg,rgba(156,255,37,.16),rgba(1,8,6,.90));position:relative;display:grid;place-items:center;filter:drop-shadow(0 0 6px rgba(148,255,37,.18))}
    #bootHome.${HOME_CLASS} .nx-mode-icon::before{content:"";position:absolute;inset:2px;clip-path:inherit;background:#06100c;z-index:-1}
    #bootHome.${HOME_CLASS} .nx-mode-icon svg{width:34px;height:34px;fill:none;stroke:#b8ff3e;stroke-width:1.75;filter:drop-shadow(0 0 4px rgba(182,255,58,.40))}
    #bootHome.${HOME_CLASS} .nx-mode-title{font-family:"Arial Narrow","Roboto Condensed",Impact,sans-serif;font-size:17px;line-height:1.02;font-weight:900;color:#f4f5f3;text-transform:uppercase;min-height:35px;display:flex;align-items:center;justify-content:center}
    #bootHome.${HOME_CLASS} .nx-mode-sub{font-size:9px;line-height:1.34;letter-spacing:.065em;text-transform:uppercase;color:#b6ff39;margin-top:6px;min-height:28px}
    #bootHome.${HOME_CLASS} .nx-mode-arrow{margin-top:auto;width:100%;height:22px;border-top:1px solid rgba(163,255,41,.13);display:grid;place-items:center}
    #bootHome.${HOME_CLASS} .nx-mode-arrow svg{width:14px;height:14px;fill:none;stroke:#adff2d;stroke-width:2}
    #bootHome.${HOME_CLASS} .nx-tournament{margin-top:9px;height:64px;border:1px solid rgba(171,255,31,.53);border-radius:10px;background:linear-gradient(90deg,rgba(8,26,14,.84),rgba(2,9,7,.96));display:grid;grid-template-columns:64px 1fr 34px;align-items:center;padding:0 6px 0 2px}
    #bootHome.${HOME_CLASS} .nx-trophy{display:grid;place-items:center}
    #bootHome.${HOME_CLASS} .nx-trophy svg{width:42px;height:42px;fill:none;stroke:#b4ff35;stroke-width:1.7;filter:drop-shadow(0 0 5px rgba(180,255,53,.34))}
    #bootHome.${HOME_CLASS} .nx-tournament strong{display:block;color:#b4ff35;font-family:"Arial Narrow","Roboto Condensed",Impact,sans-serif;font-size:22px;line-height:1;letter-spacing:.06em}
    #bootHome.${HOME_CLASS} .nx-tournament small{display:block;margin-top:6px;color:#f6f7f6;font-size:10px;letter-spacing:.18em}
    #bootHome.${HOME_CLASS} .nx-tournament .nx-arrow svg{width:24px;height:24px;fill:none;stroke:#b4ff35;stroke-width:2.2}
    #bootHome.${HOME_CLASS} .nx-side{margin-top:12px;padding:10px 9px 9px;border-color:rgba(156,255,49,.36)}
    #bootHome.${HOME_CLASS} .nx-section-title{display:flex;align-items:center;gap:11px;justify-content:center;color:#b6ff38;font-size:11px;font-weight:850;letter-spacing:.18em;text-transform:uppercase;margin:-2px 0 10px}
    #bootHome.${HOME_CLASS} .nx-section-title::before,#bootHome.${HOME_CLASS} .nx-section-title::after{content:"";height:1px;flex:1;background:linear-gradient(90deg,transparent,rgba(178,255,53,.46))}
    #bootHome.${HOME_CLASS} .nx-section-title::after{background:linear-gradient(90deg,rgba(178,255,53,.46),transparent)}
    #bootHome.${HOME_CLASS} .nx-games{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
    #bootHome.${HOME_CLASS} .nx-game{--accent:#aaff27;min-height:145px;border:1px solid rgba(170,255,39,.56);border-radius:11px;background:linear-gradient(180deg,rgba(4,14,12,.96),rgba(2,8,8,.99));display:flex;flex-direction:column;align-items:center;padding:10px 4px 7px;text-align:center;box-shadow:inset 0 0 20px rgba(170,255,39,.03)}
    #bootHome.${HOME_CLASS} .nx-game.cyan{--accent:#24dfff;border-color:rgba(36,223,255,.62);box-shadow:inset 0 0 20px rgba(36,223,255,.035)}
    #bootHome.${HOME_CLASS} .nx-game.pink{--accent:#f16bea;border-color:rgba(241,107,234,.62);box-shadow:inset 0 0 20px rgba(241,107,234,.035)}
    #bootHome.${HOME_CLASS} .nx-game.teal{--accent:#32e8c3;border-color:rgba(50,232,195,.62);box-shadow:inset 0 0 20px rgba(50,232,195,.035)}
    #bootHome.${HOME_CLASS} .nx-game-icon{height:76px;display:grid;place-items:center}
    #bootHome.${HOME_CLASS} .nx-game-icon svg{width:56px;height:56px;fill:none;stroke:var(--accent);stroke-width:1.35;filter:drop-shadow(0 0 7px var(--accent))}
    #bootHome.${HOME_CLASS} .nx-game-name{margin-top:4px;color:#f6f6f4;font-family:"Arial Narrow","Roboto Condensed",Impact,sans-serif;font-size:12px;line-height:1.06;font-weight:850;white-space:nowrap;text-transform:uppercase}
    #bootHome.${HOME_CLASS} .nx-game-go{margin-top:auto;width:100%;height:21px;border-top:1px solid rgba(170,255,39,.12);display:grid;place-items:center}
    #bootHome.${HOME_CLASS} .nx-game.cyan .nx-game-go{border-color:rgba(36,223,255,.16)}
    #bootHome.${HOME_CLASS} .nx-game.pink .nx-game-go{border-color:rgba(241,107,234,.16)}
    #bootHome.${HOME_CLASS} .nx-game.teal .nx-game-go{border-color:rgba(50,232,195,.16)}
    #bootHome.${HOME_CLASS} .nx-game-go svg{width:13px;height:13px;fill:none;stroke:var(--accent);stroke-width:2}
    #bootHome.${HOME_CLASS} .nx-all{height:46px;margin-top:8px;width:100%;border:1px solid rgba(172,255,42,.48);border-radius:9px;background:rgba(3,12,9,.77);display:grid;grid-template-columns:1fr 34px;align-items:center;color:#b6ff39;font-weight:900;font-size:14px;letter-spacing:.09em;text-transform:uppercase}
    #bootHome.${HOME_CLASS} .nx-all svg{width:19px;height:19px;fill:none;stroke:#b6ff39;stroke-width:2}
    #bootHome.${HOME_CLASS} .nx-footer{margin-top:11px;height:78px;border:1px solid rgba(171,255,42,.38);border-radius:16px;background:rgba(3,11,9,.91);display:grid;grid-template-columns:repeat(4,1fr);overflow:hidden}
    #bootHome.${HOME_CLASS} .nx-foot{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;color:#f3f4f2;font-size:8px;letter-spacing:.055em;text-transform:uppercase}
    #bootHome.${HOME_CLASS} .nx-foot:not(:last-child)::after{content:"";position:absolute;right:0;top:17px;bottom:17px;width:1px;background:rgba(174,255,40,.24)}
    #bootHome.${HOME_CLASS} .nx-foot svg{width:26px;height:26px;fill:none;stroke:#b4ff32;stroke-width:1.55;filter:drop-shadow(0 0 4px rgba(180,255,50,.25))}
    #bootHome.${HOME_CLASS} .nx-status{position:fixed;z-index:100;left:50%;bottom:max(12px,env(safe-area-inset-bottom));transform:translateX(-50%);width:min(calc(100% - 32px),398px);padding:0;color:#f6f7f6;font-size:12px;font-weight:750;text-align:center;pointer-events:none}
    #bootHome.${HOME_CLASS} .nx-status:not(:empty){padding:10px 12px;border:1px solid rgba(156,255,43,.32);border-radius:10px;background:rgba(3,9,7,.96)}
    #bootHome.${HOME_CLASS} .nx-btn:active,#bootHome.${HOME_CLASS} .nx-game:active,#bootHome.${HOME_CLASS} .nx-mode:active,#bootHome.${HOME_CLASS} .nx-tournament:active{filter:brightness(1.15);transform:translateY(1px)}
    @media(max-width:380px){#bootHome.${HOME_CLASS} .nx-code-app{padding-left:10px;padding-right:10px}#bootHome.${HOME_CLASS} .nx-top{height:164px}#bootHome.${HOME_CLASS} .nx-logo{top:34px;width:74%}#bootHome.${HOME_CLASS} .nx-subtitle{top:126px;font-size:10px;letter-spacing:.39em}#bootHome.${HOME_CLASS} .nx-subtitle::before,#bootHome.${HOME_CLASS} .nx-subtitle::after{width:39px}#bootHome.${HOME_CLASS} .nx-hero{height:214px}#bootHome.${HOME_CLASS} .nx-hero h1{font-size:43px}#bootHome.${HOME_CLASS} .nx-games{gap:5px}#bootHome.${HOME_CLASS} .nx-game-name{font-size:10px}#bootHome.${HOME_CLASS} .nx-mode-title{font-size:15px}#bootHome.${HOME_CLASS} .nx-mode-sub{font-size:8px}#bootHome.${HOME_CLASS} .nx-tournament strong{font-size:20px}}
    @media(min-width:700px){#bootHome.${HOME_CLASS} .nx-code-app{width:430px}}
  `;

  function addStyle(){document.getElementById(STYLE_ID)?.remove();const style=document.createElement("style");style.id=STYLE_ID;style.textContent=css;document.head.appendChild(style)}
  function normalizeText(value){return String(value||"").toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/ı/g,"i").replace(/ş/g,"s").replace(/ğ/g,"g").replace(/ü/g,"u").replace(/ö/g,"o").replace(/ç/g,"c")}
  function controlText(node){return normalizeText([node?.textContent,node?.getAttribute?.("aria-label"),node?.getAttribute?.("title"),node?.getAttribute?.("data-action")].filter(Boolean).join(" "))}
  function findAction(root,needles,exclude=[]){const set=new Set(exclude.filter(Boolean));return [...root.querySelectorAll("button,a,[role='button']")].find(n=>!set.has(n)&&needles.some(x=>controlText(n).includes(x)))||null}
  function message(status,text){status.textContent=text;setTimeout(()=>{if(status.textContent===text)status.textContent=""},2300)}
  function clickTarget(target,status,label){if(target?.isConnected){target.click();return true}message(status,`${label} şu anda açılamıyor.`);return false}
  function openSocial(tab,status){let n=0;const tryOpen=()=>{if(window.NEON_SOCIAL&&typeof window.NEON_SOCIAL.open==="function"){window.NEON_SOCIAL.open(tab);return true}const fallback=document.querySelector(`[data-neon-social="${tab}"]`);if(fallback){fallback.click();return true}return false};if(tryOpen())return;const timer=setInterval(()=>{n++;if(tryOpen()||n>80){clearInterval(timer);if(n>80)message(status,"Sosyal ekran yüklenemedi.")}},50)}

  function initialize(){
    const home=document.getElementById("bootHome");if(!home||home.dataset.nxCodedHome===VERSION)return;
    const single=document.getElementById("singleModeBtn"),bot=document.getElementById("botModeBtn"),online=document.getElementById("onlineModeBtn"),tournament=home.querySelector(".neonHomeQuickRow button"),settings=home.querySelector("[data-open-neon-settings]");
    const exclude=[single,bot,online,tournament,settings],how=findAction(home,["nasil oynanir","how to play"],exclude),feedback=findAction(home,["sikayet","oneri","feedback"],[...exclude,how]);
    const legacy=document.createElement("div");legacy.className="nx-legacy-home";legacy.setAttribute("aria-hidden","true");while(home.firstChild)legacy.appendChild(home.firstChild);
    const bg=document.createElement("div");bg.className="nx-code-bg";bg.setAttribute("aria-hidden","true");const scroll=document.createElement("div");scroll.className="nx-code-scroll";const app=document.createElement("main");app.className="nx-code-app";app.setAttribute("aria-label","NEON XI ana menüsü");const status=document.createElement("div");status.className="nx-status";status.setAttribute("role","status");status.setAttribute("aria-live","polite");
    app.innerHTML=`<header class="nx-top"><button type="button" class="nx-btn nx-social" data-act="social">${I.users}<span>SOSYAL</span></button><button type="button" class="nx-btn nx-settings" data-act="settings" aria-label="Ayarlar">${I.gear}</button><img class="nx-logo" src="./assets/neon-xi-logo-outline.png?v=${VERSION}" alt="NEON XI"><div class="nx-subtitle">FUTBOL YÖNETİMİ</div></header><section class="nx-shell nx-main"><div class="nx-kicker">ANA OYUN</div><div class="nx-hero"><div class="nx-hero-copy"><h1>DRAFT XI</h1><p>Hayalindeki kadroyu kur,<br>zafer için sahaya sür.</p></div><div class="nx-stadium" aria-hidden="true"></div></div><div class="nx-modes"><button type="button" class="nx-btn nx-mode" data-act="single"><span class="nx-mode-icon">${I.user}</span><span class="nx-mode-title">TEK<br>OYUNCULU</span><span class="nx-mode-sub">KARİYER MODU</span><span class="nx-mode-arrow">${I.arrow}</span></button><button type="button" class="nx-btn nx-mode" data-act="bot"><span class="nx-mode-icon">${I.bot}</span><span class="nx-mode-title">BOTA<br>KARŞI</span><span class="nx-mode-sub">ÇEVRİMİÇİ VEYA<br>ÇEVRİMDIŞI</span><span class="nx-mode-arrow">${I.arrow}</span></button><button type="button" class="nx-btn nx-mode" data-act="online"><span class="nx-mode-icon">${I.globe}</span><span class="nx-mode-title">ONLINE</span><span class="nx-mode-sub">RAKİP ARA ·<br>ARKADAŞ DAVET ET</span><span class="nx-mode-arrow">${I.arrow}</span></button></div><button type="button" class="nx-btn nx-tournament" data-act="tournament"><span class="nx-trophy">${I.trophy}</span><span><strong>TURNUVA MODU</strong><small>4 TAKIM&nbsp;&nbsp;•&nbsp;&nbsp;8 TAKIM</small></span><span class="nx-arrow">${I.arrow}</span></button></section><section class="nx-shell nx-side"><div class="nx-section-title">YAN OYUNLAR</div><div class="nx-games"><a class="nx-btn nx-game" href="./side-games/football-xox/index.html" aria-label="Futbol XOX"><span class="nx-game-icon">${I.xox}</span><span class="nx-game-name">FUTBOL XOX</span><span class="nx-game-go">${I.arrow}</span></a><a class="nx-btn nx-game cyan" href="./side-games/career-twin/index.html" aria-label="Kariyer İkizi"><span class="nx-game-icon">${I.twin}</span><span class="nx-game-name">KARİYER İKİZİ</span><span class="nx-game-go">${I.arrow}</span></a><a class="nx-btn nx-game pink" href="./side-games/futbol-imposter.html" aria-label="Futbol Imposter"><span class="nx-game-icon">${I.mask}</span><span class="nx-game-name">FUTBOL IMPOSTER</span><span class="nx-game-go">${I.arrow}</span></a><a class="nx-btn nx-game teal" href="./side-games/football-wordle/index.html" aria-label="Football Wordle"><span class="nx-game-icon">${I.wordle}</span><span class="nx-game-name">FOOTBALL WORDLE</span><span class="nx-game-go">${I.arrow}</span></a></div><a class="nx-btn nx-all" href="./side-games/index.html"><span>TÜM YAN OYUNLAR</span>${I.arrow}</a></section><nav class="nx-footer" aria-label="Alt menü"><button type="button" class="nx-btn nx-foot" data-act="friends">${I.users}<span>ARKADAŞLAR</span></button><button type="button" class="nx-btn nx-foot" data-act="how">${I.book}<span>NASIL OYNANIR</span></button><button type="button" class="nx-btn nx-foot" data-act="settings">${I.gear}<span>AYARLAR</span></button><button type="button" class="nx-btn nx-foot" data-act="feedback">${I.chat}<span>ŞİKAYET & ÖNERİ</span></button></nav>`;
    app.addEventListener("click",e=>{const el=e.target.closest("[data-act]");if(!el)return;const a=el.dataset.act;if(a==="social")openSocial("play",status);else if(a==="friends")openSocial("friends",status);else if(a==="settings")clickTarget(settings,status,"Ayarlar");else if(a==="single")clickTarget(single,status,"Tek Oyunculu");else if(a==="bot")clickTarget(bot,status,"Bota Karşı");else if(a==="online")clickTarget(online,status,"Online");else if(a==="tournament")clickTarget(tournament,status,"Turnuva");else if(a==="how")clickTarget(how,status,"Nasıl Oynanır");else if(a==="feedback")clickTarget(feedback,status,"Şikayet ve Öneri")});
    scroll.appendChild(app);home.append(legacy,bg,scroll,status);home.classList.remove("nx-raster-home-v2","nx-raster-home-v3","nx-coded-home-v1");home.classList.add(HOME_CLASS);home.dataset.nxCodedHome=VERSION;
  }

  addStyle();if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});else initialize();
})();