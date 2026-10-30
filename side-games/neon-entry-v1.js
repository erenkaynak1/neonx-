/* NEON XI first-login artwork controller; does not create a second Firebase identity. */
(()=>{
  'use strict';
  if(window.NEON_XI_ENTRY?.version)return;
  const entry=document.createElement('section');
  entry.id='nxEntry';entry.dataset.phase='checking';
  entry.setAttribute('aria-label','NEON XI giriş ekranı');
  entry.innerHTML=[
    '<div class="nx-entry-check" role="status"><span class="nx-entry-spinner" aria-hidden="true"></span><span>OTURUM KONTROL EDİLİYOR</span></div>',
    '<div class="nx-entry-canvas">',
      '<img class="nx-entry-art" alt="NEON XI futbol arenası, giriş seçenekleri ve nasıl oynanır düğmesi" decoding="async" draggable="false">',
      '<svg class="nx-entry-map" viewBox="0 0 941 1672" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="NEON XI giriş seçenekleri">',
        '<a class="nx-entry-hotspot" href="#nasil-oynanir" data-entry-action="help" aria-label="Nasıl Oynanır?"><title>Nasıl Oynanır?</title><rect x="285" y="597" width="365" height="84" rx="17"/></a>',
        '<a class="nx-entry-hotspot" href="#google-ile-giris" data-entry-action="google" aria-label="Google ile giriş yap"><title>Google ile giriş yap</title><rect x="100" y="1235" width="730" height="117" rx="25"/></a>',
        '<a class="nx-entry-hotspot" href="#misafir-girisi" data-entry-action="guest" aria-label="Misafir olarak devam et"><title>Misafir olarak devam et</title><rect x="100" y="1362" width="730" height="120" rx="24"/></a>',
      '</svg>',
    '</div>',
    '<p class="nx-entry-status" role="status" aria-live="polite"></p>',
    '<div id="nxEntryGuide" hidden role="dialog" aria-modal="true" aria-labelledby="nx-entry-guide-title" tabindex="-1">',
      '<div class="nx-entry-guide-card">',
        '<button type="button" class="nx-entry-guide-close" aria-label="Kılavuzu kapat">×</button>',
        '<h2 id="nx-entry-guide-title">NASIL OYNANIR?</h2>',
        '<p>NEON XI’da futbol bilgini ve taktik kararlarını arkadaşlarına veya çevrimiçi rakiplerine karşı kullanırsın.</p>',
        '<h3>DRAFT XI</h3>',
        '<p>Oyuncu havuzundan sırayla futbolcu seçerek 11 kişilik kadronu kur. Formasyon, oyuncu rolleri, takım kimyası ve taktiklerin maç simülasyonunu etkiler.</p>',
        '<h3>ARKADAŞLARINLA OYNA</h3>',
        '<p>Parti oluştur, arkadaşlarını davet et, oyun modunu seç ve birlikte lobiden maça geç.</p>',
        '<h3>RAKİP ARA</h3>',
        '<p>Seçtiğin modda çevrimiçi rakiple otomatik eşleş. Maç sonunda sonuçların oyuncu profiline ve liderlik tablolarına işlenir.</p>',
        '<h3>QUIZ OYUNLARI</h3>',
        '<p>Futbol XOX, Kariyer İkizi, Futbol Imposter ve Football Wordle ile futbol bilgini sınayabilirsin. Her oyunun kendi ekranında ayrıntılı kuralları bulunur.</p>',
        '<p>Google hesabı veya misafir kimliğiyle devam ettikten sonra benzersiz bir oyuncu adı seçersin.</p>',
      '</div>',
    '</div>'
  ].join('');
  document.body.appendChild(entry);
  document.body.classList.add('nx-entry-open');
  const art=entry.querySelector('.nx-entry-art'),status=entry.querySelector('.nx-entry-status');
  const guide=entry.querySelector('#nxEntryGuide'),guideClose=guide.querySelector('.nx-entry-guide-close');
  const hotspots=[...entry.querySelectorAll('[data-entry-action]')];
  const artURL=new URL('./assets/entry/first-login-v1.png',document.baseURI).href;
  let checked=false,authUser=null,busy=false,intent='',previousFocus=null;
  const timer=setTimeout(()=>{
    if(!checked){showWelcome();setStatus('Oturum kontrolü gecikti. Bağlantını kontrol edip sayfayı yenileyebilirsin.')}
  },12000);
  function setStatus(value){status.textContent=value||''}
  function setBusy(value){
    busy=Boolean(value);
    for(const hotspot of hotspots.filter(x=>x.dataset.entryAction!=='help')){
      hotspot.setAttribute('aria-disabled',busy?'true':'false');
    }
  }
  function showWelcome(){
    entry.hidden=false;
    document.body.classList.add('nx-entry-open');
    if(art.complete&&art.naturalWidth){entry.dataset.phase='welcome';return}
    if(!art.getAttribute('src')){
      art.addEventListener('load',()=>{if(!entry.hidden)entry.dataset.phase='welcome'},{once:true});
      art.addEventListener('error',()=>{entry.dataset.phase='welcome';setStatus('Giriş görseli yüklenemedi. Sayfayı yenileyebilirsin.')},{once:true});
      art.src=artURL;
    }
  }
  function hideWelcome(){
    guide.hidden=true;
    entry.hidden=true;
    document.body.classList.remove('nx-entry-open');
    setStatus('');
    setBusy(false);
  }
  function openGuide(){
    previousFocus=document.activeElement;
    guide.hidden=false;guideClose.focus({preventScroll:true});
  }
  function closeGuide(){
    guide.hidden=true;
    if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
  }
  function resolveAuth(user){
    checked=true;clearTimeout(timer);authUser=user||null;
    if(user){
      const originatedHere=Boolean(intent),wasGuest=intent==='guest';
      intent='';hideWelcome();
      if(originatedHere){
        setTimeout(()=>{
          const social=window.NEON_SOCIAL;
          if(!social?.profile&&(wasGuest||social?.open))social?.open?.('friends');
        },wasGuest?400:1100);
      }
    }else{
      intent='';setBusy(false);showWelcome();
    }
  }
  function authError(error){
    checked=true;clearTimeout(timer);
    showWelcome();
    setStatus('Oturum bağlantısı kurulamadı. İnternetini kontrol edip tekrar dene. '+(error?.code||''));
  }
  function beginAuth(action){
    if(busy)return;
    const api=window.NEON_SOCIAL;
    const method=action==='google'?'signIn':'continueAsGuest';
    if(typeof api?.[method]!=='function'){
      setStatus('Giriş sistemi henüz hazır değil. Birkaç saniye sonra tekrar dene.');
      return;
    }
    intent=action;setBusy(true);
    setStatus(action==='google'?'Google hesabı açılıyor…':'Misafir hesabı hazırlanıyor…');
    let result;
    // Call directly inside the tap handler; a delayed popup can be blocked on mobile.
    try{result=api[method]()}catch(error){intent='';setBusy(false);setStatus(error?.message||'Giriş başlatılamadı.');return}
    Promise.resolve(result).catch(error=>{
      intent='';
      const code=String(error?.code||'');
      setStatus(code==='auth/popup-closed-by-user'?'Google giriş penceresi kapatıldı.':code==='auth/popup-blocked'?'Tarayıcı Google giriş penceresini engelledi.':code==='auth/unauthorized-domain'?'Firebase için bu alan adını yetkilendirmen gerekiyor.':(error?.message||'Giriş yapılamadı. Tekrar dene.'));
    }).finally(()=>{setBusy(false);if(authUser)setStatus('')});
  }
  entry.addEventListener('click',e=>{
    const target=e.target.closest('[data-entry-action]');
    if(target){
      e.preventDefault();
      const action=target.dataset.entryAction;
      if(action==='help')openGuide();
      if(action==='google'||action==='guest')beginAuth(action);
      return;
    }
    if(e.target===guide||e.target.closest('.nx-entry-guide-close'))closeGuide();
  });
  entry.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&!guide.hidden){e.preventDefault();closeGuide();return}
    const target=e.target.closest('[data-entry-action]');
    if(target&&e.key===' '){e.preventDefault();target.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))}
    if(guide.hidden||e.key!=='Tab')return;
    const items=[...guide.querySelectorAll('button,a,[tabindex]:not([tabindex="-1"])')].filter(x=>!x.disabled);
    if(!items.length)return;
    if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1).focus()}
    else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0].focus()}
  });
  window.NEON_XI_ENTRY={version:'20260929-v1',resolveAuth,authError,showWelcome,hideWelcome,openGuide,get isOpen(){return !entry.hidden}};
})();
