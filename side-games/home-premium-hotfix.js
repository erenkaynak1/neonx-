(() => {
  const STYLE_ID='nx-premium-home-hotfix-style';
  const css=`
  #bootHome.nx-premium-final .neonTopLang{display:none!important}
  #bootHome.nx-premium-final .neonHomeTopbar{position:absolute!important;top:14px!important;right:18px!important;z-index:30!important;padding:0!important}
  #bootHome.nx-premium-final .neonHomeTopControls{gap:0!important}
  #bootHome.nx-premium-final .neonTopIconOnly{width:48px!important;height:48px!important;min-height:48px!important;border-radius:14px!important;background:rgba(3,10,7,.86)!important;backdrop-filter:blur(12px)}
  #bootHome.nx-premium-final .neonHomeCenterWrap{padding-top:18px!important}
  #bootHome.nx-premium-final .neonHomeHero{width:min(900px,calc(100vw - 32px))!important;max-width:900px!important;gap:12px!important}
  #bootHome.nx-premium-final .neonHomeLogo{width:min(56vw,500px)!important;max-height:120px!important;margin:2px auto -10px!important}
  #bootHome.nx-premium-final .neonHomeSubtitle{margin-bottom:10px!important}

  #bootHome.nx-premium-final .nxDraftZone{min-height:0!important;padding:25px 26px 22px!important;display:block!important}
  #bootHome.nx-premium-final .nxZoneHead{margin-bottom:8px!important;min-height:150px!important}
  #bootHome.nx-premium-final .nxZone h2{font-size:clamp(52px,5.2vw,70px)!important}
  #bootHome.nx-premium-final .nxZoneCopy{font-size:13px!important;max-width:310px!important;margin-top:14px!important}
  #bootHome.nx-premium-final .nxZoneIndex{font-size:68px!important}

  #bootHome.nx-premium-final .nxDraftVisual{top:28px!important;right:2%!important;width:55%!important;height:245px!important;opacity:.96!important}
  #bootHome.nx-premium-final .nxOrbit{right:5%!important;top:4%!important;width:220px!important;height:220px!important;border-color:rgba(166,255,87,.28)!important;box-shadow:0 0 34px rgba(118,255,57,.12),inset 0 0 44px rgba(143,255,79,.07)!important}
  #bootHome.nx-premium-final .nxBall{right:51px!important;top:35px!important;width:158px!important;height:158px!important;background:radial-gradient(circle at 34% 27%,rgba(231,255,219,.28),transparent 10%),radial-gradient(circle at 50% 48%,#101b13 0 36%,#071008 56%,#010302 100%)!important;border:1px solid rgba(203,255,145,.86)!important;box-shadow:0 0 10px rgba(198,255,126,.95),0 0 34px rgba(109,255,46,.42),inset -24px -28px 44px rgba(0,0,0,.78),inset 10px 10px 24px rgba(155,255,81,.16)!important}
  #bootHome.nx-premium-final .nxBall svg{opacity:1!important;filter:drop-shadow(0 0 5px rgba(171,255,94,.85))!important}
  #bootHome.nx-premium-final .nxBall svg *{stroke:rgba(188,255,113,.9)!important;stroke-width:1.35!important}
  #bootHome.nx-premium-final .nxTrajectory{right:-8px!important;top:101px!important;width:280px!important;height:92px!important}

  #bootHome.nx-premium-final .nxDraftModes{margin-top:76px!important;gap:12px!important;align-items:stretch!important}
  #bootHome.nx-premium-final .nxDraftModes .neonHomeAction{min-height:196px!important;height:196px!important;padding:16px 13px 16px!important}
  #bootHome.nx-premium-final .nxDraftModes .neonHomeActionIcon{width:62px!important;height:62px!important;margin-bottom:12px!important}
  #bootHome.nx-premium-final .nxDraftModes .neonHomeActionIcon svg{width:30px!important;height:30px!important}
  #bootHome.nx-premium-final .nxDraftModes .neonHomeActionText strong{font-size:18px!important}
  #bootHome.nx-premium-final .nxDraftModes .neonHomeActionText small{font-size:9px!important}
  #bootHome.nx-premium-final .nxTournament{min-height:76px!important;grid-template-columns:58px minmax(0,1fr) 38px!important;padding:9px 17px!important}
  #bootHome.nx-premium-final .nxTournamentIcon{width:52px!important;height:52px!important}
  #bootHome.nx-premium-final .nxTournamentIcon svg{width:36px!important;height:36px!important}

  #bootHome.nx-premium-final .nxSideZone{padding:24px 26px 22px!important}
  #bootHome.nx-premium-final .nxSideZone .nxZoneHead{min-height:auto!important;margin-bottom:18px!important}
  #bootHome.nx-premium-final .nxSideZone h2{font-size:46px!important}
  #bootHome.nx-premium-final .nxSideGrid{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:12px!important}
  #bootHome.nx-premium-final .nxSideGame,#bootHome.nx-premium-final .nxSideGame:first-child{grid-column:auto!important;min-height:190px!important;height:190px!important;padding:15px!important}
  #bootHome.nx-premium-final .nxSideGame strong{font-size:15px!important}
  #bootHome.nx-premium-final .nxSideGame small{font-size:8px!important}

  @media (max-width:760px){
    #bootHome.nx-premium-final .neonHomeTopbar{top:9px!important;right:10px!important}
    #bootHome.nx-premium-final .neonTopIconOnly{width:42px!important;height:42px!important;min-height:42px!important}
    #bootHome.nx-premium-final .neonHomeCenterWrap{padding:8px 10px 18px!important}
    #bootHome.nx-premium-final .neonHomeHero{width:100%!important;max-width:none!important}
    #bootHome.nx-premium-final .neonHomeLogo{width:min(76vw,360px)!important;max-height:88px!important;margin:2px auto -8px!important}
    #bootHome.nx-premium-final .neonHomeSubtitle{font-size:8px!important;letter-spacing:.32em!important;margin-bottom:5px!important}
    #bootHome.nx-premium-final .nxDraftZone{padding:18px 14px 16px!important}
    #bootHome.nx-premium-final .nxZoneHead{min-height:126px!important;margin-bottom:4px!important}
    #bootHome.nx-premium-final .nxZone h2{font-size:40px!important}
    #bootHome.nx-premium-final .nxZoneCopy{font-size:9px!important;max-width:180px!important;margin-top:8px!important}
    #bootHome.nx-premium-final .nxZoneIndex{font-size:44px!important}
    #bootHome.nx-premium-final .nxDraftVisual{top:35px!important;right:-5%!important;width:61%!important;height:175px!important}
    #bootHome.nx-premium-final .nxOrbit{width:142px!important;height:142px!important;right:7%!important}
    #bootHome.nx-premium-final .nxBall{width:102px!important;height:102px!important;right:35px!important;top:23px!important}
    #bootHome.nx-premium-final .nxTrajectory{width:185px!important;height:62px!important;top:69px!important;right:-10px!important}
    #bootHome.nx-premium-final .nxDraftModes{margin-top:42px!important;gap:7px!important}
    #bootHome.nx-premium-final .nxDraftModes .neonHomeAction{min-height:142px!important;height:142px!important;padding:10px 7px 11px!important}
    #bootHome.nx-premium-final .nxDraftModes .neonHomeActionIcon{width:46px!important;height:46px!important;margin-bottom:8px!important;border-radius:13px!important}
    #bootHome.nx-premium-final .nxDraftModes .neonHomeActionIcon svg{width:23px!important;height:23px!important}
    #bootHome.nx-premium-final .nxDraftModes .neonHomeActionText strong{font-size:11px!important}
    #bootHome.nx-premium-final .nxDraftModes .neonHomeActionText small{font-size:7px!important}
    #bootHome.nx-premium-final .nxTournament{min-height:62px!important;grid-template-columns:44px minmax(0,1fr) 28px!important;padding:8px 12px!important}
    #bootHome.nx-premium-final .nxTournamentIcon{width:40px!important;height:40px!important}
    #bootHome.nx-premium-final .nxTournamentIcon svg{width:29px!important;height:29px!important}
    #bootHome.nx-premium-final .nxSideZone{padding:18px 14px 16px!important}
    #bootHome.nx-premium-final .nxSideZone h2{font-size:31px!important}
    #bootHome.nx-premium-final .nxSideGrid{gap:7px!important}
    #bootHome.nx-premium-final .nxSideGame,#bootHome.nx-premium-final .nxSideGame:first-child{min-height:132px!important;height:132px!important;padding:10px!important}
    #bootHome.nx-premium-final .nxSideGame strong{font-size:10px!important}
    #bootHome.nx-premium-final .nxSideGame small{font-size:6.5px!important}
  }
  `;
  function apply(){
    if(!document.getElementById(STYLE_ID)){const s=document.createElement('style');s.id=STYLE_ID;s.textContent=css;document.head.appendChild(s)}
    const home=document.getElementById('bootHome');if(home)home.classList.add('nx-premium-final');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  setTimeout(apply,250);setTimeout(apply,1000);
})();