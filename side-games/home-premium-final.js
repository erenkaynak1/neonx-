(() => {
  const STYLE_ID = 'nx-premium-home-final-style';
  const HOME_CLASS = 'nx-premium-final';

  const styles = `
  #bootHome.${HOME_CLASS}{--nx-green:#a7ff4f;--nx-green2:#63ff6b;--nx-ink:#030706;--nx-card:#07100c;--nx-card2:#0a1510;--nx-line:rgba(182,255,111,.52);--nx-soft:rgba(169,255,96,.12);}
  #bootHome.${HOME_CLASS} .neonHomeScene{
    position:relative;isolation:isolate;overflow:hidden!important;
    background:
      radial-gradient(circle at 50% 5%,rgba(128,255,76,.12),transparent 30%),
      radial-gradient(circle at 18% 48%,rgba(39,153,121,.13),transparent 30%),
      radial-gradient(circle at 84% 72%,rgba(54,255,153,.08),transparent 30%),
      linear-gradient(180deg,#010403 0%,#020806 42%,#010302 100%)!important;
  }
  #bootHome.${HOME_CLASS} .nxPremiumCity{position:absolute;inset:-2%;z-index:0;pointer-events:none;opacity:.38;filter:blur(2.6px) saturate(.72) brightness(.66);transform:scale(1.035);mask-image:linear-gradient(180deg,black 0%,rgba(0,0,0,.86) 36%,rgba(0,0,0,.72) 72%,rgba(0,0,0,.82) 100%);}
  #bootHome.${HOME_CLASS} .nxPremiumCity svg{width:100%;height:100%;display:block}
  #bootHome.${HOME_CLASS} .nxPremiumVeil{position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,rgba(0,4,2,.13),rgba(0,4,2,.46) 36%,rgba(0,3,2,.58) 100%),radial-gradient(circle at 50% 26%,transparent 0 28%,rgba(0,0,0,.16) 70%);}
  #bootHome.${HOME_CLASS} .neonHomeTopbar,#bootHome.${HOME_CLASS} .neonHomeCenterWrap{position:relative;z-index:3}
  #bootHome.${HOME_CLASS} .neonHomeStand{opacity:.07!important}
  #bootHome.${HOME_CLASS} .neonHomePitchGlow{opacity:.24!important}
  #bootHome.${HOME_CLASS} .neonHomeMist{opacity:.08!important;filter:blur(58px)!important}
  #bootHome.${HOME_CLASS} .neonHomeScene::after{opacity:.11!important;background-size:64px 64px!important;}

  #bootHome.${HOME_CLASS} .neonHomeCenterWrap{padding:0 16px 24px!important;overflow:auto!important;scrollbar-width:none}
  #bootHome.${HOME_CLASS} .neonHomeCenterWrap::-webkit-scrollbar{display:none}
  #bootHome.${HOME_CLASS} .neonHomeHero{width:min(930px,100%)!important;max-width:930px!important;margin:0 auto!important;gap:12px!important;}
  #bootHome.${HOME_CLASS} .neonHomeLogo{width:min(58vw,520px)!important;max-height:132px!important;margin:-10px auto -12px!important;filter:drop-shadow(0 0 8px rgba(168,255,79,.74)) drop-shadow(0 0 26px rgba(91,255,43,.18))!important;}
  #bootHome.${HOME_CLASS} .neonHomeSubtitle{color:rgba(243,255,239,.92)!important;letter-spacing:.46em!important;margin-bottom:7px!important}
  #bootHome.${HOME_CLASS} .neonHomeSubtitle span{background:linear-gradient(90deg,transparent,rgba(176,255,96,.72))!important}

  #bootHome.${HOME_CLASS} .nxHomeHub{display:grid!important;grid-template-columns:1fr!important;gap:14px!important;min-height:0!important;}
  #bootHome.${HOME_CLASS} .nxZone{
    border:1px solid rgba(185,255,116,.58)!important;border-radius:24px!important;overflow:hidden!important;
    background:linear-gradient(155deg,rgba(8,18,13,.94),rgba(3,8,6,.97))!important;
    box-shadow:inset 0 0 0 1px rgba(239,255,225,.035),inset 0 -90px 120px rgba(0,0,0,.28),0 18px 50px rgba(0,0,0,.42),0 0 20px rgba(128,255,65,.065)!important;
  }
  #bootHome.${HOME_CLASS} .nxZone::before{opacity:.18!important;filter:blur(28px)!important}
  #bootHome.${HOME_CLASS} .nxZone::after{height:1px!important;opacity:.6!important;animation-duration:5.2s!important;}
  #bootHome.${HOME_CLASS} .nxDraftZone{position:relative;min-height:660px!important;padding:28px 28px 24px!important;}
  #bootHome.${HOME_CLASS} .nxSideZone{padding:26px 28px 24px!important;}
  #bootHome.${HOME_CLASS} .nxZoneHead{position:relative;z-index:4;margin-bottom:24px!important;}
  #bootHome.${HOME_CLASS} .nxZone h2{font-size:clamp(44px,6vw,76px)!important;line-height:.9!important;color:#f6f8f5!important;text-shadow:0 3px 20px rgba(0,0,0,.5);}
  #bootHome.${HOME_CLASS} .nxSideZone h2{font-size:clamp(36px,5vw,58px)!important;}
  #bootHome.${HOME_CLASS} .nxEyebrow{color:var(--nx-green)!important;font-size:11px!important;letter-spacing:.17em!important;}
  #bootHome.${HOME_CLASS} .nxZoneCopy{font-size:14px!important;max-width:330px!important;color:rgba(239,248,241,.68)!important;line-height:1.48!important;margin-top:17px!important;}
  #bootHome.${HOME_CLASS} .nxZoneIndex{font-size:76px!important;color:rgba(146,255,61,.16)!important;-webkit-text-stroke:1px rgba(160,255,75,.2);}

  #bootHome.${HOME_CLASS} .nxDraftVisual{position:absolute;z-index:2;right:2.5%;top:18px;width:58%;height:310px;pointer-events:none;opacity:.95;}
  #bootHome.${HOME_CLASS} .nxDraftVisual::before{content:"";position:absolute;inset:18% 4% 2% 4%;background:radial-gradient(ellipse at 54% 55%,rgba(133,255,59,.18),transparent 36%),repeating-linear-gradient(168deg,transparent 0 22px,rgba(143,255,72,.055) 23px,transparent 24px);mask-image:linear-gradient(90deg,transparent,black 20%,black 88%,transparent);}
  #bootHome.${HOME_CLASS} .nxOrbit{position:absolute;right:4%;top:7%;width:270px;height:270px;border:1px solid rgba(154,255,80,.22);border-radius:50%;box-shadow:0 0 38px rgba(125,255,61,.08),inset 0 0 42px rgba(134,255,72,.05);}
  #bootHome.${HOME_CLASS} .nxOrbit::before,#bootHome.${HOME_CLASS} .nxOrbit::after{content:"";position:absolute;border:1px dashed rgba(163,255,89,.23);border-radius:50%;}
  #bootHome.${HOME_CLASS} .nxOrbit::before{inset:-23px 18px 23px -18px;transform:rotate(-18deg)}
  #bootHome.${HOME_CLASS} .nxOrbit::after{inset:36px -54px 20px -24px;transform:rotate(16deg)}
  #bootHome.${HOME_CLASS} .nxBall{position:absolute;right:61px;top:42px;width:190px;height:190px;border-radius:50%;background:radial-gradient(circle at 38% 31%,rgba(221,255,210,.22),transparent 11%),radial-gradient(circle at 47% 47%,#0a120d 0 34%,#020504 65%,#000 100%);border:1px solid rgba(189,255,129,.68);box-shadow:0 0 9px rgba(181,255,108,.9),0 0 32px rgba(99,255,39,.34),inset -24px -28px 48px rgba(0,0,0,.8),inset 8px 8px 25px rgba(142,255,72,.12);}
  #bootHome.${HOME_CLASS} .nxBall svg{position:absolute;inset:6%;width:88%;height:88%;opacity:.84;filter:drop-shadow(0 0 5px rgba(157,255,79,.55));}
  #bootHome.${HOME_CLASS} .nxTrajectory{position:absolute;right:-15px;top:120px;width:340px;height:110px;border-top:1px dashed rgba(170,255,92,.7);border-radius:50%;transform:rotate(-9deg);filter:drop-shadow(0 0 4px rgba(133,255,65,.65));}
  #bootHome.${HOME_CLASS} .nxTrajectory::before,#bootHome.${HOME_CLASS} .nxTrajectory::after{content:"";position:absolute;width:7px;height:7px;border-radius:50%;background:var(--nx-green);box-shadow:0 0 8px var(--nx-green)}
  #bootHome.${HOME_CLASS} .nxTrajectory::before{left:11%;top:-4px}#bootHome.${HOME_CLASS} .nxTrajectory::after{left:55%;top:-4px}

  #bootHome.${HOME_CLASS} .nxDraftModes{position:relative;z-index:5;display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:14px!important;margin-top:226px!important;align-items:stretch!important;}
  #bootHome.${HOME_CLASS} .nxDraftModes .neonHomeAction{
    position:relative!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:flex-end!important;
    min-height:228px!important;height:100%!important;padding:18px 15px 18px!important;gap:8px!important;border-radius:19px!important;
    background:linear-gradient(155deg,rgba(11,24,17,.94),rgba(4,10,7,.98))!important;border:1px solid rgba(183,255,115,.52)!important;
    box-shadow:inset 0 0 0 1px rgba(226,255,205,.025),inset 0 -34px 55px rgba(0,0,0,.18),0 12px 26px rgba(0,0,0,.3)!important;overflow:hidden!important;text-align:center!important;
  }
  #bootHome.${HOME_CLASS} .nxDraftModes .neonHomeAction::before{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.44;}
  #bootHome.${HOME_CLASS} #singleModeBtn::before{background:linear-gradient(30deg,transparent 48%,rgba(164,255,85,.08) 49% 50%,transparent 51%),radial-gradient(circle at 50% 20%,rgba(156,255,83,.08),transparent 34%),repeating-radial-gradient(circle at 12% 15%,rgba(148,255,77,.06) 0 1px,transparent 1px 24px);}
  #bootHome.${HOME_CLASS} #botModeBtn::before{background:repeating-linear-gradient(135deg,transparent 0 18px,rgba(144,255,77,.05) 19px,transparent 20px),radial-gradient(circle at 76% 18%,rgba(155,255,76,.38) 0 1.5px,transparent 2px);background-size:auto,11px 11px;}
  #bootHome.${HOME_CLASS} #onlineModeBtn::before{background:radial-gradient(circle at 18% 28%,rgba(164,255,83,.35) 0 1px,transparent 2px),radial-gradient(circle at 54% 22%,rgba(164,255,83,.28) 0 1px,transparent 2px),radial-gradient(circle at 77% 51%,rgba(164,255,83,.26) 0 1px,transparent 2px),linear-gradient(160deg,transparent,rgba(102,255,74,.04));background-size:23px 23px,31px 31px,27px 27px,auto;}
  #bootHome.${HOME_CLASS} .nxCardArtwork{position:absolute;inset:0;z-index:1;pointer-events:none;opacity:.34;overflow:hidden;}
  #bootHome.${HOME_CLASS} .nxCardArtwork svg{width:100%;height:100%;display:block;}
  #bootHome.${HOME_CLASS} .nxDraftModes .neonHomeActionIcon{position:relative;z-index:3;width:70px!important;height:70px!important;margin:0 0 16px!important;border-radius:18px!important;color:var(--nx-green)!important;background:rgba(7,18,11,.86)!important;border:1px solid rgba(171,255,99,.42)!important;box-shadow:0 0 0 7px rgba(128,255,60,.025),0 0 23px rgba(111,255,47,.12)!important;}
  #bootHome.${HOME_CLASS} .nxDraftModes .neonHomeActionIcon svg{width:34px!important;height:34px!important;}
  #bootHome.${HOME_CLASS} .nxDraftModes .neonHomeActionText{position:relative;z-index:3;text-align:center!important;}
  #bootHome.${HOME_CLASS} .nxDraftModes .neonHomeActionText strong{font-size:20px!important;line-height:1.04!important;color:#f5f7f4!important;text-transform:uppercase!important;}
  #bootHome.${HOME_CLASS} .nxDraftModes .neonHomeActionText small{font-size:10px!important;line-height:1.3!important;color:rgba(183,255,94,.74)!important;text-transform:uppercase!important;letter-spacing:.1em!important;}
  #bootHome.${HOME_CLASS} .nxDraftModes .neonHomeActionArrow{display:none!important}
  #bootHome.${HOME_CLASS} .nxDraftModes .neonHomeAction::after{content:"";position:absolute;left:18px;bottom:12px;width:56px;height:2px;background:linear-gradient(90deg,var(--nx-green),rgba(159,255,76,.08));box-shadow:0 0 6px rgba(148,255,67,.45);}
  #bootHome.${HOME_CLASS} .nxDraftModes .neonHomeAction:hover,#bootHome.${HOME_CLASS} .nxDraftModes .neonHomeAction:focus-visible{transform:translateY(-3px)!important;border-color:rgba(210,255,160,.82)!important;background:linear-gradient(155deg,rgba(14,31,21,.98),rgba(4,12,8,.99))!important;box-shadow:0 0 24px rgba(110,255,47,.14),0 16px 34px rgba(0,0,0,.34)!important;}

  #bootHome.${HOME_CLASS} .nxDraftUtility{position:relative;z-index:5;margin-top:14px!important;padding:0!important;border:0!important;}
  #bootHome.${HOME_CLASS} .nxDraftUtility>span{display:none!important}
  #bootHome.${HOME_CLASS} .nxTournament{width:100%!important;min-height:88px!important;display:grid!important;grid-template-columns:66px minmax(0,1fr) 44px!important;align-items:center!important;gap:15px!important;padding:11px 20px!important;border:1px solid rgba(185,255,116,.48)!important;border-radius:17px!important;background:linear-gradient(90deg,rgba(14,30,18,.95),rgba(4,11,8,.98))!important;color:inherit!important;text-align:left!important;box-shadow:inset 0 0 30px rgba(128,255,58,.025)!important;}
  #bootHome.${HOME_CLASS} .nxTournamentIcon{display:grid;place-items:center;width:58px;height:58px;border-right:1px solid rgba(165,255,84,.15);color:var(--nx-green);}
  #bootHome.${HOME_CLASS} .nxTournamentIcon svg{width:42px;height:42px;filter:drop-shadow(0 0 6px rgba(159,255,80,.45));}
  #bootHome.${HOME_CLASS} .nxTournamentText strong{display:block;color:var(--nx-green);font-size:23px;line-height:1.05;letter-spacing:.09em;text-transform:uppercase;}
  #bootHome.${HOME_CLASS} .nxTournamentText small{display:block;margin-top:7px;color:rgba(240,246,240,.72);font-size:11px;letter-spacing:.22em;}
  #bootHome.${HOME_CLASS} .nxTournamentArrow{justify-self:end;color:var(--nx-green);font-size:38px;line-height:1;filter:drop-shadow(0 0 5px rgba(147,255,69,.5));}

  #bootHome.${HOME_CLASS} .nxSideGrid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:14px!important;margin-top:4px!important;align-items:stretch!important;}
  #bootHome.${HOME_CLASS} .nxSideGame,#bootHome.${HOME_CLASS} .nxSideGame:first-child{grid-column:auto!important;min-height:210px!important;height:100%!important;padding:18px!important;border-radius:18px!important;border:1px solid rgba(185,255,116,.44)!important;background:linear-gradient(155deg,rgba(10,23,16,.95),rgba(4,10,7,.99))!important;box-shadow:inset 0 0 0 1px rgba(225,255,203,.025),0 10px 24px rgba(0,0,0,.28)!important;justify-content:flex-end!important;text-align:center!important;align-items:center!important;}
  #bootHome.${HOME_CLASS} .nxSideGame::before{display:none!important}
  #bootHome.${HOME_CLASS} .nxSideGame .nxCardArtwork{opacity:.55}
  #bootHome.${HOME_CLASS} .nxSideCode{top:12px!important;right:14px!important;color:rgba(161,255,79,.58)!important;font-size:16px!important;}
  #bootHome.${HOME_CLASS} .nxSideIcon{position:relative;z-index:3;width:54px!important;height:54px!important;margin:0 0 16px!important;border-radius:15px!important;color:var(--nx-green)!important;background:rgba(7,18,11,.82)!important;border:1px solid rgba(171,255,99,.36)!important;font-size:25px!important;box-shadow:0 0 17px rgba(109,255,50,.08)!important;}
  #bootHome.${HOME_CLASS} .nxSideGame strong{position:relative;z-index:3;color:#f5f6f4!important;font-size:18px!important;line-height:1.12!important;}
  #bootHome.${HOME_CLASS} .nxSideGame small{position:relative;z-index:3;color:rgba(182,255,93,.72)!important;font-size:9px!important;line-height:1.3!important;letter-spacing:.1em!important;}
  #bootHome.${HOME_CLASS} .nxSideGame::after{content:"";position:absolute;z-index:3;left:50%;bottom:10px;width:44px;height:2px;transform:translateX(-50%);background:linear-gradient(90deg,transparent,var(--nx-green),transparent);}
  #bootHome.${HOME_CLASS} .nxAllGames{min-height:72px!important;margin-top:16px!important;padding:0 22px!important;border:1px solid rgba(191,255,127,.52)!important;border-radius:17px!important;background:linear-gradient(90deg,rgba(18,40,23,.96),rgba(6,16,10,.98))!important;color:var(--nx-green)!important;font-size:16px!important;font-weight:900!important;letter-spacing:.14em!important;box-shadow:inset 0 0 36px rgba(113,255,48,.045),0 0 16px rgba(99,255,41,.06)!important;}
  #bootHome.${HOME_CLASS} .nxAllGames b{font-size:34px!important;filter:drop-shadow(0 0 5px rgba(151,255,70,.5));}

  @media(max-width:760px){
    #bootHome.${HOME_CLASS} .neonHomeTopbar{padding:8px 10px 0!important}
    #bootHome.${HOME_CLASS} .neonHomeCenterWrap{padding:0 9px 16px!important;}
    #bootHome.${HOME_CLASS} .neonHomeHero{width:100%!important;}
    #bootHome.${HOME_CLASS} .neonHomeLogo{width:min(73vw,360px)!important;max-height:88px!important;margin:0 auto -8px!important;}
    #bootHome.${HOME_CLASS} .neonHomeSubtitle{font-size:7px!important;letter-spacing:.42em!important;}
    #bootHome.${HOME_CLASS} .nxZone{border-radius:19px!important;}
    #bootHome.${HOME_CLASS} .nxDraftZone{min-height:0!important;padding:19px 16px 16px!important;}
    #bootHome.${HOME_CLASS} .nxSideZone{padding:18px 16px 16px!important;}
    #bootHome.${HOME_CLASS} .nxZoneHead{margin-bottom:10px!important;}
    #bootHome.${HOME_CLASS} .nxZone h2{font-size:42px!important;}
    #bootHome.${HOME_CLASS} .nxSideZone h2{font-size:34px!important;}
    #bootHome.${HOME_CLASS} .nxZoneCopy{font-size:10px!important;max-width:195px!important;margin-top:10px!important;}
    #bootHome.${HOME_CLASS} .nxZoneIndex{font-size:46px!important;}
    #bootHome.${HOME_CLASS} .nxDraftVisual{right:-4%;top:44px;width:62%;height:190px;opacity:.8;}
    #bootHome.${HOME_CLASS} .nxOrbit{right:5%;top:3%;width:154px;height:154px;}
    #bootHome.${HOME_CLASS} .nxBall{right:39px;top:25px;width:110px;height:110px;}
    #bootHome.${HOME_CLASS} .nxTrajectory{right:-16px;top:75px;width:204px;height:70px;}
    #bootHome.${HOME_CLASS} .nxDraftModes{margin-top:104px!important;gap:8px!important;}
    #bootHome.${HOME_CLASS} .nxDraftModes .neonHomeAction{min-height:166px!important;padding:12px 8px 14px!important;gap:6px!important;border-radius:14px!important;}
    #bootHome.${HOME_CLASS} .nxDraftModes .neonHomeActionIcon{width:50px!important;height:50px!important;margin-bottom:8px!important;border-radius:14px!important;}
    #bootHome.${HOME_CLASS} .nxDraftModes .neonHomeActionIcon svg{width:25px!important;height:25px!important;}
    #bootHome.${HOME_CLASS} .nxDraftModes .neonHomeActionText strong{font-size:13px!important;}
    #bootHome.${HOME_CLASS} .nxDraftModes .neonHomeActionText small{font-size:7px!important;letter-spacing:.07em!important;}
    #bootHome.${HOME_CLASS} .nxDraftModes .neonHomeAction::after{left:12px;bottom:8px;width:36px;}
    #bootHome.${HOME_CLASS} .nxTournament{min-height:68px!important;grid-template-columns:48px minmax(0,1fr) 24px!important;gap:9px!important;padding:8px 11px!important;border-radius:14px!important;}
    #bootHome.${HOME_CLASS} .nxTournamentIcon{width:44px;height:44px;}
    #bootHome.${HOME_CLASS} .nxTournamentIcon svg{width:32px;height:32px;}
    #bootHome.${HOME_CLASS} .nxTournamentText strong{font-size:15px;letter-spacing:.08em;}
    #bootHome.${HOME_CLASS} .nxTournamentText small{font-size:8px;letter-spacing:.16em;}
    #bootHome.${HOME_CLASS} .nxTournamentArrow{font-size:27px;}
    #bootHome.${HOME_CLASS} .nxSideGrid{gap:8px!important;}
    #bootHome.${HOME_CLASS} .nxSideGame,#bootHome.${HOME_CLASS} .nxSideGame:first-child{min-height:150px!important;padding:11px 7px!important;border-radius:14px!important;}
    #bootHome.${HOME_CLASS} .nxSideIcon{width:40px!important;height:40px!important;margin-bottom:10px!important;border-radius:12px!important;font-size:19px!important;}
    #bootHome.${HOME_CLASS} .nxSideGame strong{font-size:12px!important;}
    #bootHome.${HOME_CLASS} .nxSideGame small{font-size:7px!important;letter-spacing:.06em!important;}
    #bootHome.${HOME_CLASS} .nxSideCode{font-size:12px!important;top:8px!important;right:9px!important;}
    #bootHome.${HOME_CLASS} .nxAllGames{min-height:58px!important;padding:0 15px!important;margin-top:10px!important;border-radius:14px!important;font-size:11px!important;letter-spacing:.12em!important;}
    #bootHome.${HOME_CLASS} .nxAllGames b{font-size:27px!important;}
    #bootHome.${HOME_CLASS} .nxPremiumCity{opacity:.29;filter:blur(3.2px) saturate(.7) brightness(.58);}
  }
  @media(max-width:390px){
    #bootHome.${HOME_CLASS} .nxZone h2{font-size:37px!important}
    #bootHome.${HOME_CLASS} .nxDraftModes .neonHomeActionText strong{font-size:11px!important}
    #bootHome.${HOME_CLASS} .nxDraftModes .neonHomeActionText small{font-size:6.5px!important}
    #bootHome.${HOME_CLASS} .nxSideGame strong{font-size:10px!important}
  }
  `;

  const citySvg = `
  <svg viewBox="0 0 1000 1600" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#04110d"/><stop offset="1" stop-color="#010403"/></linearGradient>
      <linearGradient id="b1" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#092018"/><stop offset="1" stop-color="#020807"/></linearGradient>
      <filter id="glow"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <rect width="1000" height="1600" fill="url(#sky)"/>
    <g opacity=".93"><path d="M0 230H105V65H188V315H270V135H354V355H430V190H520V330H603V98H695V282H775V45H850V306H932V160H1000V1600H0Z" fill="url(#b1)"/><path d="M0 515H75V350H145V620H236V420H315V620H397V365H458V690H535V475H617V635H705V405H785V690H862V372H942V600H1000V1600H0Z" fill="#06130f" opacity=".82"/></g>
    <g stroke="#37a26d" stroke-width="2" opacity=".26"><path d="M18 162h142M780 210h180M45 760h190M740 870h210M68 1115h170M785 1240h176"/><path d="M116 0v420M836 0v530M268 220v560M676 80v700M918 560v820M86 840v650"/></g>
    <g fill="#73ff7a" opacity=".32"><rect x="26" y="260" width="9" height="3"/><rect x="48" y="276" width="12" height="3"/><rect x="89" y="205" width="8" height="3"/><rect x="123" y="130" width="12" height="3"/><rect x="294" y="195" width="12" height="3"/><rect x="324" y="215" width="8" height="3"/><rect x="456" y="243" width="13" height="3"/><rect x="634" y="178" width="10" height="3"/><rect x="818" y="95" width="12" height="3"/><rect x="845" y="126" width="8" height="3"/><rect x="911" y="218" width="13" height="3"/></g>
    <g filter="url(#glow)" font-family="Arial, sans-serif" font-weight="700" letter-spacing="3"><g transform="translate(58 115) rotate(-1)"><rect width="170" height="72" rx="5" fill="#071c15" stroke="#7cff88" stroke-opacity=".34"/><text x="18" y="32" font-size="22" fill="#8cff92">NEON</text><text x="18" y="57" font-size="22" fill="#8cff92">GAMES</text></g><g transform="translate(765 165) rotate(1)"><rect width="172" height="72" rx="5" fill="#071c15" stroke="#7cff88" stroke-opacity=".34"/><text x="19" y="32" font-size="22" fill="#8cff92">NEON</text><text x="19" y="57" font-size="22" fill="#8cff92">GAMES</text></g><g transform="translate(38 915)"><rect width="145" height="58" rx="4" fill="#062018" stroke="#62ffb0" stroke-opacity=".28"/><text x="14" y="36" font-size="18" fill="#72ffab">NEON GAMES</text></g><g transform="translate(785 1060)"><rect width="154" height="60" rx="4" fill="#061a15" stroke="#63ffb1" stroke-opacity=".28"/><text x="13" y="37" font-size="17" fill="#72ffab">NEON GAMES</text></g></g>
    <g opacity=".22" stroke="#7cff8a" fill="none"><path d="M0 370L220 268 416 334 610 248 1000 320"/><path d="M0 1000L190 920 405 995 625 890 1000 970"/></g>
  </svg>`;

  const art = {
    single: `<div class="nxCardArtwork" aria-hidden="true"><svg viewBox="0 0 300 240"><g fill="none" stroke="#a7ff4f" stroke-opacity=".28"><path d="M20 180C72 115 122 92 176 100c48 7 83 38 109 83"/><path d="M35 55h230M55 35v145M245 35v145" stroke-opacity=".12"/><g fill="#a7ff4f"><circle cx="56" cy="142" r="4"/><circle cx="104" cy="116" r="4"/><circle cx="151" cy="126" r="4"/><circle cx="194" cy="104" r="4"/><circle cx="242" cy="139" r="4"/></g><path d="M56 142l48-26 47 10 43-22 48 35" stroke-dasharray="6 5"/></g></svg></div>`,
    bot: `<div class="nxCardArtwork" aria-hidden="true"><svg viewBox="0 0 300 240"><g fill="none" stroke="#a7ff4f" stroke-opacity=".22" stroke-width="1.3"><path d="M20 40h60v26h46v36h74v-26h80M34 194h50v-32h54v-42h46v38h84"/><path d="M64 18v48M126 66v36M200 76v-36M84 162v48M138 162v56M184 158v44"/></g><g fill="#a7ff4f" fill-opacity=".35"><circle cx="80" cy="66" r="3"/><circle cx="126" cy="102" r="3"/><circle cx="200" cy="76" r="3"/><circle cx="84" cy="162" r="3"/><circle cx="138" cy="162" r="3"/><circle cx="184" cy="158" r="3"/></g></svg></div>`,
    online: `<div class="nxCardArtwork" aria-hidden="true"><svg viewBox="0 0 300 240"><g fill="#a7ff4f" fill-opacity=".17"><path d="M34 99l24-25 28 8 17-20 23 13 12 30-22 10-10 19-28-8-21 12-16-17zM137 72l30-24 39 8 24 21-8 26 18 16-19 26-39 1-21-24-32-4-9-25zM195 152l21 5 11 25-16 17-27-7-7-20z"/></g><g stroke="#a7ff4f" stroke-opacity=".28" fill="none"><path d="M31 166C80 111 115 98 154 104c47 6 70 42 116 57"/><path d="M60 82l72 35 79-39M73 155l84-51 70 43"/></g><g fill="#a7ff4f" fill-opacity=".62"><circle cx="60" cy="82" r="3"/><circle cx="132" cy="117" r="3"/><circle cx="211" cy="78" r="3"/><circle cx="73" cy="155" r="3"/><circle cx="157" cy="104" r="3"/><circle cx="227" cy="147" r="3"/></g></svg></div>`,
    xox: `<div class="nxCardArtwork" aria-hidden="true"><svg viewBox="0 0 300 240"><g stroke="#a7ff4f" stroke-opacity=".18"><path d="M100 24v170M200 24v170M34 82h232M34 145h232"/></g><g fill="none" stroke="#a7ff4f" stroke-width="5" stroke-opacity=".54"><path d="M54 43l28 28M82 43L54 71M122 103l28 28M150 103l-28 28"/><circle cx="235" cy="112" r="19"/><circle cx="156" cy="176" r="19"/></g></svg></div>`,
    twin: `<div class="nxCardArtwork" aria-hidden="true"><svg viewBox="0 0 300 240"><g fill="none" stroke="#a7ff4f" stroke-opacity=".36"><circle cx="150" cy="104" r="78" stroke-opacity=".12"/><circle cx="150" cy="104" r="58" stroke-opacity=".16"/><path d="M80 128c9-29 24-44 42-44 11 0 20 6 26 16-9 7-15 17-17 29-4 20 4 36 21 49H84c-7-17-8-34-4-50zM220 128c-9-29-24-44-42-44-11 0-20 6-26 16 9 7 15 17 17 29 4 20-4 36-21 49h68c7-17 8-34 4-50z"/><path d="M115 116h70M115 116l15-11M115 116l15 11M185 116l-15-11M185 116l-15 11"/></g></svg></div>`,
    imposter: `<div class="nxCardArtwork" aria-hidden="true"><svg viewBox="0 0 300 240"><g fill="none" stroke="#a7ff4f" stroke-opacity=".3"><g transform="translate(44 66)"><circle cx="0" cy="0" r="14"/><path d="M-22 44c4-18 11-28 22-28s18 10 22 28"/></g><g transform="translate(96 53)"><circle cx="0" cy="0" r="14"/><path d="M-22 44c4-18 11-28 22-28s18 10 22 28"/></g><g transform="translate(150 43)" stroke-opacity=".86"><circle cx="0" cy="0" r="15"/><path d="M-24 48c4-20 12-31 24-31s20 11 24 31"/></g><g transform="translate(205 57)"><circle cx="0" cy="0" r="14"/><path d="M-22 44c4-18 11-28 22-28s18 10 22 28"/></g><g transform="translate(255 70)"><circle cx="0" cy="0" r="14"/><path d="M-22 44c4-18 11-28 22-28s18 10 22 28"/></g></g><circle cx="150" cy="89" r="39" fill="#a7ff4f" fill-opacity=".055" stroke="#a7ff4f" stroke-opacity=".18"/></svg></div>`
  };

  const ballSvg = `<svg viewBox="0 0 200 200" aria-hidden="true"><g fill="none" stroke="#a7ff4f" stroke-opacity=".32"><path d="M100 38l28 20-11 33H83L72 58z"/><path d="M72 58L43 80l10 35 30-24M128 58l29 22-10 35-30-24M53 115l18 29 29 7 29-7 18-29M71 144l-8 23M129 144l8 23M100 151v31"/><circle cx="100" cy="100" r="76" stroke-opacity=".16"/></g></svg>`;

  function ensureStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');style.id=STYLE_ID;style.textContent=styles;document.head.appendChild(style);
  }

  function decorate(){
    const home=document.getElementById('bootHome');
    if(!home) return;
    home.classList.add(HOME_CLASS);
    const scene=home.querySelector('.neonHomeScene');
    if(scene && !scene.querySelector('.nxPremiumCity')){
      const city=document.createElement('div');city.className='nxPremiumCity';city.innerHTML=citySvg;scene.prepend(city);
      const veil=document.createElement('div');veil.className='nxPremiumVeil';scene.insertBefore(veil,city.nextSibling);
    }
    const hub=home.querySelector('.nxHomeHub');
    if(!hub) return;
    const draft=hub.querySelector('.nxDraftZone');
    if(draft && !draft.querySelector('.nxDraftVisual')){
      const visual=document.createElement('div');visual.className='nxDraftVisual';visual.setAttribute('aria-hidden','true');
      visual.innerHTML=`<div class="nxOrbit"></div><div class="nxBall">${ballSvg}</div><div class="nxTrajectory"></div>`;
      draft.appendChild(visual);
    }
    const modes=[['singleModeBtn','single'],['botModeBtn','bot'],['onlineModeBtn','online']];
    modes.forEach(([id,key])=>{const el=document.getElementById(id);if(el&&!el.querySelector('.nxCardArtwork'))el.insertAdjacentHTML('afterbegin',art[key]);});
    const games=[...hub.querySelectorAll('.nxSideGame')];
    games.forEach(el=>{if(el.querySelector('.nxCardArtwork'))return;const href=(el.getAttribute('href')||'').toLowerCase();const key=href.includes('xox')?'xox':href.includes('career-twin')?'twin':'imposter';el.insertAdjacentHTML('afterbegin',art[key]);});
    const tournament=hub.querySelector('.nxTournament');
    if(tournament && tournament.dataset.nxPremium!=='1'){
      tournament.dataset.nxPremium='1';
      tournament.innerHTML=`<span class="nxTournamentIcon" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 8h18v8c0 8-4 13-9 13s-9-5-9-13V8Z"/><path d="M15 12H8v4c0 7 4 11 10 11M33 12h7v4c0 7-4 11-10 11M24 29v8M16 41h16M19 37h10"/></svg></span><span class="nxTournamentText"><strong>Turnuva Modu</strong><small>4 TAKIM&nbsp;&nbsp; • &nbsp;&nbsp;8 TAKIM</small></span><span class="nxTournamentArrow" aria-hidden="true">›</span>`;
    }
  }

  function init(){ensureStyle();decorate();const obs=new MutationObserver(decorate);obs.observe(document.documentElement,{childList:true,subtree:true});setTimeout(decorate,250);setTimeout(decorate,1000);setTimeout(decorate,2200);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
