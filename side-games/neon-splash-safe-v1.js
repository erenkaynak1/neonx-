(()=>{
  'use strict';

  if (window.NX_SPLASH && document.getElementById('nxSplashOverlay')) return;

  const STYLE_ID = 'nx-splash-style-v1';
  const ROOT_ID = 'nxSplashOverlay';
  const READY_SELECTORS = [
    '#bootHome.nx-approved-home-v1',
    '#bootHome.nx-approved-home-v1.active'
  ];

  function injectStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      :root {
        --nx-bg: #040706;
        --nx-bg-raised: #070c0a;
        --nx-surface: #0a110e;
        --nx-surface-raised: #0e1813;
        --nx-green: #20f77a;
        --nx-green-bright: #7bffb5;
        --nx-green-dark: #0f6a3c;
        --nx-red: #ff3f5f;
        --nx-cyan: #32d9ff;
        --nx-gold: #ffd166;
        --nx-purple: #a477ff;
        --nx-text: #f3f7f5;
        --nx-text-secondary: #d7e5de;
        --nx-text-muted: #8b9a93;
        --nx-text-disabled: #414b46;
        --nx-space-1: 4px;
        --nx-space-2: 8px;
        --nx-space-3: 12px;
        --nx-space-4: 16px;
        --nx-space-5: 20px;
        --nx-space-6: 24px;
        --nx-space-7: 32px;
        --nx-space-8: 40px;
        --nx-fast: 160ms;
        --nx-normal: 220ms;
        --nx-slow: 280ms;
        --nx-ease: cubic-bezier(.22,.8,.25,1);
      }
      #${ROOT_ID}{position:fixed;inset:0;z-index:999999;background:#000;display:flex;justify-content:center;align-items:center;opacity:1;visibility:visible;transition:opacity 260ms var(--nx-ease),visibility 260ms var(--nx-ease);}
      #${ROOT_ID}.nx-hide{opacity:0;visibility:hidden;pointer-events:none;}
      #${ROOT_ID} .app{position:relative;width:100%;max-width:430px;height:100dvh;background:var(--nx-bg);overflow:hidden;font-family:Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
      #${ROOT_ID} .bg{position:absolute;inset:0;z-index:0;}
      #${ROOT_ID} .bg svg{width:100%;height:100%;filter:blur(4px) brightness(.48) saturate(.9);}
      #${ROOT_ID} .bg-vignette{position:absolute;inset:0;background:radial-gradient(72% 44% at 50% 42%, rgba(32,247,122,.08) 0%, rgba(32,247,122,0) 58%),linear-gradient(180deg,#040706 0%,rgba(4,7,6,.55) 38%,rgba(4,7,6,.55) 62%,#040706 100%);}
      #${ROOT_ID} .ambient-flash{position:absolute;inset:0;z-index:5;pointer-events:none;background:radial-gradient(42% 28% at 50% 40%, rgba(123,255,181,.34) 0%, rgba(32,247,122,0) 70%);opacity:0;transition:opacity 90ms linear;}
      #${ROOT_ID} .ambient-flash.on{opacity:1;transition:opacity 20ms linear;}
      #${ROOT_ID} .scanlines{position:absolute;inset:0;z-index:6;pointer-events:none;background:repeating-linear-gradient(180deg,rgba(82,255,160,.028) 0px,rgba(82,255,160,.028) 1px,transparent 1px,transparent 4px);mix-blend-mode:overlay;opacity:.24;}
      #${ROOT_ID} .content{position:relative;z-index:10;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;}
      #${ROOT_ID} .brand{display:flex;flex-direction:column;align-items:center;opacity:0;animation:nxFadeIn var(--nx-slow) var(--nx-ease) 80ms forwards;}
      #${ROOT_ID} .n-letter{width:170px;height:192px;margin-bottom:20px;overflow:visible;shape-rendering:geometricPrecision;text-rendering:geometricPrecision;transition:opacity 300ms var(--nx-ease);}
      #${ROOT_ID} .n-path{fill:none;stroke-linecap:round;stroke-linejoin:round;}
      #${ROOT_ID} .n-glow{stroke:#22ff82;stroke-width:9;opacity:.34;filter:blur(2.4px);}
      #${ROOT_ID} .n-chroma{stroke:var(--nx-cyan);stroke-width:2.2;opacity:.16;mix-blend-mode:screen;transform:translate(1.1px,-0.7px);filter:blur(.5px);}
      #${ROOT_ID} .n-core{stroke:#7bffb5;stroke-width:5.2;filter:drop-shadow(0 0 1px #effff6) drop-shadow(0 0 4px rgba(123,255,181,.95)) drop-shadow(0 0 10px rgba(32,247,122,.46));transition:filter 180ms linear,opacity 180ms linear;}
      #${ROOT_ID} .n-letter.flicker-off .n-core{opacity:.32;filter:drop-shadow(0 0 1px rgba(123,255,181,.22));}
      #${ROOT_ID} .n-letter.flicker-off .n-glow{opacity:.08;}
      #${ROOT_ID} .n-letter.flicker-off .n-chroma{opacity:.05;}
      #${ROOT_ID} .n-letter.flicker-hot .n-core{stroke:#f4fff9;filter:drop-shadow(0 0 2px #fff) drop-shadow(0 0 7px rgba(123,255,181,.95)) drop-shadow(0 0 14px rgba(32,247,122,.52));}
      #${ROOT_ID} .n-letter.flicker-hot .n-glow{opacity:.42;}
      #${ROOT_ID} .n-letter.flicker-hot .n-chroma{opacity:.24;}
      #${ROOT_ID} .n-letter.steady .n-core{animation:nxNPulse 2.8s var(--nx-ease) infinite;}
      #${ROOT_ID} .n-letter.steady .n-glow{animation:nxNPulseGlow 2.8s var(--nx-ease) infinite;}
      #${ROOT_ID} .n-letter.jitter{animation:nxJitter 90ms linear;}
      #${ROOT_ID} #spark{fill:#c9ffe0;filter:drop-shadow(0 0 3px #fff) drop-shadow(0 0 9px rgba(123,255,181,.9)) drop-shadow(0 0 16px rgba(32,247,122,.6));opacity:0;}
      #${ROOT_ID} .spark-branch{stroke:#c9ffe0;stroke-width:2.2;stroke-linecap:round;filter:drop-shadow(0 0 3px #fff) drop-shadow(0 0 8px rgba(123,255,181,.82));opacity:0;transition:opacity 90ms linear;}
      #${ROOT_ID} .spark-branch.on{opacity:1;}
      #${ROOT_ID} .wordmark{margin:0;font-family:Inter,system-ui,sans-serif;font-weight:800;font-size:19px;letter-spacing:2px;color:#d7e5de;}
      #${ROOT_ID} .subtitle{margin:4px 0 0;font-size:11px;font-weight:600;letter-spacing:1.5px;color:#8b9a93;}
      #${ROOT_ID} .tip-wrap{position:absolute;left:24px;right:24px;bottom:calc(env(safe-area-inset-bottom) + 40px);z-index:10;min-height:34px;}
      #${ROOT_ID} .tip{font-size:12px;font-weight:500;line-height:1.5;color:#8b9a93;opacity:0;transition:opacity var(--nx-normal) var(--nx-ease);}
      #${ROOT_ID} .tip.visible{opacity:1;}
      #${ROOT_ID} .tip b{color:#d7e5de;font-weight:600;}
      #${ROOT_ID} .version{position:absolute;left:0;right:0;bottom:env(safe-area-inset-bottom);z-index:10;text-align:center;padding-bottom:16px;font-size:11px;font-weight:600;color:#414b46;}
      @keyframes nxFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      @keyframes nxNPulse{0%,100%{filter:drop-shadow(0 0 1px #effff6) drop-shadow(0 0 4px rgba(123,255,181,.92)) drop-shadow(0 0 10px rgba(32,247,122,.42));}50%{filter:drop-shadow(0 0 2px #f6fffb) drop-shadow(0 0 6px rgba(123,255,181,.96)) drop-shadow(0 0 13px rgba(32,247,122,.54));}}
      @keyframes nxNPulseGlow{0%,100%{opacity:.28}50%{opacity:.4}}
      @keyframes nxJitter{0%{transform:translate(0,0)}20%{transform:translate(-1px,.5px)}40%{transform:translate(1px,-.5px)}60%{transform:translate(-.5px,-1px)}80%{transform:translate(.5px,1px)}100%{transform:translate(0,0)}}
      @media (prefers-reduced-motion: reduce){#${ROOT_ID} .brand{animation:none!important;opacity:1!important;transform:none!important;}#${ROOT_ID} .n-letter.steady .n-core,#${ROOT_ID} .n-letter.steady .n-glow,#${ROOT_ID} .n-letter.jitter{animation:none!important;}}
    `;
    document.head.appendChild(style);
  }

  function markup(){
    return `
      <div class="app" aria-label="NEON XI yükleniyor ekranı">
        <div class="bg">
          <svg viewBox="0 0 390 844" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="390" height="844" fill="#040706"/>
            <g opacity="0.45">
              <rect x="0" y="560" width="34" height="284" fill="#0a110e"/>
              <rect x="40" y="520" width="26" height="324" fill="#0a110e"/>
              <rect x="120" y="500" width="40" height="344" fill="#0a110e"/>
              <rect x="205" y="480" width="34" height="364" fill="#0a110e"/>
              <rect x="290" y="510" width="42" height="334" fill="#0a110e"/>
              <rect x="372" y="530" width="20" height="314" fill="#0a110e"/>
            </g>
            <g opacity="0.75">
              <rect x="-10" y="640" width="56" height="204" fill="#070c0a"/>
              <rect x="95" y="660" width="46" height="184" fill="#070c0a"/>
              <rect x="188" y="630" width="52" height="214" fill="#070c0a"/>
              <rect x="290" y="655" width="44" height="189" fill="#070c0a"/>
              <rect x="342" y="610" width="48" height="234" fill="#070c0a"/>
            </g>
            <g>
              <rect x="58" y="630" width="5" height="8" fill="#18e875" opacity="0.6"/>
              <rect x="103" y="690" width="5" height="8" fill="#32d9ff" opacity="0.5"/>
              <rect x="200" y="660" width="5" height="8" fill="#18e875" opacity="0.5"/>
              <rect x="300" y="685" width="5" height="8" fill="#18e875" opacity="0.55"/>
              <rect x="355" y="645" width="5" height="8" fill="#18e875" opacity="0.45"/>
            </g>
          </svg>
          <div class="bg-vignette"></div>
        </div>
        <div class="ambient-flash" id="ambientFlash"></div>
        <div class="scanlines"></div>
        <div class="content">
          <div class="brand">
            <svg class="n-letter" id="nLetter" viewBox="0 0 198 224" xmlns="http://www.w3.org/2000/svg">
              <path id="nGlow" class="n-path n-glow" d="M67.24,201.40 L22,201.40 L22,22 L70.88,22 L130.42,126 L130.42,22 L175.66,22 L175.66,201.40 L127.04,201.40 L67.24,97.40 Z" />
              <path id="nChroma" class="n-path n-chroma" d="M67.24,201.40 L22,201.40 L22,22 L70.88,22 L130.42,126 L130.42,22 L175.66,22 L175.66,201.40 L127.04,201.40 L67.24,97.40 Z" />
              <path id="nCore" class="n-path n-core" d="M67.24,201.40 L22,201.40 L22,22 L70.88,22 L130.42,126 L130.42,22 L175.66,22 L175.66,201.40 L127.04,201.40 L67.24,97.40 Z" />
              <g id="sparkBranches"></g>
              <circle id="spark" r="5.6" cx="0" cy="0" />
            </svg>
            <h1 class="wordmark">NEON XI</h1>
            <p class="subtitle">FOOTBALL SIMULATION</p>
          </div>
        </div>
        <div class="tip-wrap"><p class="tip visible" id="tip">İpucu: <b>Yüksek kimya</b>, saha içi uyumu belirgin şekilde artırır.</p></div>
        <div class="version">v1.0.0</div>
      </div>`;
  }

  function readyNow(){
    return READY_SELECTORS.some(sel => document.querySelector(sel));
  }

  const api = {
    root: null,
    hideTimer: null,
    revealObserver: null,
    tipTimer: null,
    isVisible: false,
    show(){
      injectStyle();
      if(!this.root){
        const wrap = document.createElement('div');
        wrap.id = ROOT_ID;
        wrap.innerHTML = markup();
        document.body.appendChild(wrap);
        this.root = wrap;
        this.bindAnimation();
      }
      this.root.classList.remove('nx-hide');
      this.isVisible = true;
      document.documentElement.style.background = '#000';
      document.body.style.background = '#000';
      this.watchForReady();
      if(this.hideTimer) clearTimeout(this.hideTimer);
      this.hideTimer = setTimeout(()=>this.hide(), 9000);
    },
    hide(){
      if(!this.root || !this.isVisible) return;
      this.isVisible = false;
      if(this.hideTimer) clearTimeout(this.hideTimer);
      if(this.revealObserver){ this.revealObserver.disconnect(); this.revealObserver = null; }
      this.root.classList.add('nx-hide');
      setTimeout(()=>{ if(this.root) this.root.remove(); this.root = null; }, 320);
    },
    watchForReady(){
      if(readyNow()) { this.hideSoon(); return; }
      if(this.revealObserver) this.revealObserver.disconnect();
      this.revealObserver = new MutationObserver(()=>{
        if(readyNow()) this.hideSoon();
      });
      this.revealObserver.observe(document.documentElement, {childList:true, subtree:true, attributes:true, attributeFilter:['class','id']});
    },
    hideSoon(){
      if(this.revealObserver){ this.revealObserver.disconnect(); this.revealObserver = null; }
      setTimeout(()=>this.hide(), 220);
    },
    bindAnimation(){
      const root = this.root;
      const nLetter = root.querySelector('#nLetter');
      const nGlow = root.querySelector('#nGlow');
      const nChroma = root.querySelector('#nChroma');
      const nCore = root.querySelector('#nCore');
      const spark = root.querySelector('#spark');
      const sparkBranches = root.querySelector('#sparkBranches');
      const ambientFlash = root.querySelector('#ambientFlash');
      const tipEl = root.querySelector('#tip');
      const nPaths = [nGlow, nChroma, nCore];
      const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
      const flashAmbient = ms => { ambientFlash.classList.add('on'); setTimeout(()=>ambientFlash.classList.remove('on'), ms); };
      const totalLenSafe = () => { try { return nCore.getTotalLength(); } catch(e) { return 1; } };
      const armPath = p => {
        const len = p.getTotalLength();
        p.style.transition = 'none';
        p.style.strokeDasharray = len;
        p.style.strokeDashoffset = len;
      };
      const spawnSparkBranch = (x,y) => {
        const count = 1 + Math.floor(Math.random()*2);
        for(let i=0;i<count;i++){
          const angle = Math.random()*Math.PI*2;
          const dist = 6 + Math.random()*11;
          const x2 = x + Math.cos(angle)*dist;
          const y2 = y + Math.sin(angle)*dist;
          const line = document.createElementNS('http://www.w3.org/2000/svg','line');
          line.setAttribute('x1', x); line.setAttribute('y1', y);
          line.setAttribute('x2', x2); line.setAttribute('y2', y2);
          line.setAttribute('class','spark-branch');
          sparkBranches.appendChild(line);
          requestAnimationFrame(()=>line.classList.add('on'));
          setTimeout(()=>{ line.classList.remove('on'); setTimeout(()=>line.remove(),120); }, 60 + Math.random()*60);
        }
      };
      const scheduleMicroFlicker = () => {
        clearTimeout(scheduleMicroFlicker.t);
        const delay = 1800 + Math.random()*1900;
        scheduleMicroFlicker.t = setTimeout(()=>{
          if(!nLetter.classList.contains('steady')) return;
          nLetter.classList.add('flicker-hot', 'jitter');
          flashAmbient(50);
          const pt = nCore.getPointAtLength(Math.random()*totalLenSafe());
          spawnSparkBranch(pt.x, pt.y);
          setTimeout(()=>{
            nLetter.classList.remove('flicker-hot', 'jitter');
            scheduleMicroFlicker();
          }, 95);
        }, delay);
      };
      const holdThenReset = () => {
        clearTimeout(scheduleMicroFlicker.t);
        nLetter.style.opacity = 0;
        setTimeout(drawOn, 720);
      };
      const startFlicker = () => {
        const beats = [
          { gap:110, state:'off' },
          { gap:95, state:'hot' },
          { gap:160, state:'off' },
          { gap:120, state:'hot' },
          { gap:110, state:'hot' },
          { gap:220, state:'off' },
          { gap:85, state:'hot' },
          { gap:360, state:'off' },
          { gap:90, state:'hot' }
        ];
        let t=0;
        beats.forEach(b=>{
          t += b.gap;
          setTimeout(()=>{
            nLetter.classList.remove('flicker-off','flicker-hot');
            nLetter.classList.add('flicker-' + b.state);
            nLetter.classList.add('jitter');
            setTimeout(()=>nLetter.classList.remove('jitter'), 100);
            if(b.state === 'hot'){
              flashAmbient(65);
              const pt = nCore.getPointAtLength(Math.random()*totalLenSafe());
              spawnSparkBranch(pt.x, pt.y);
            }
          }, t);
        });
        setTimeout(()=>{
          nLetter.classList.remove('flicker-off','flicker-hot','jitter');
          nLetter.classList.add('steady');
          flashAmbient(110);
          scheduleMicroFlicker();
          setTimeout(holdThenReset, 4200);
        }, t + 220);
      };
      const drawOn = () => {
        nPaths.forEach(armPath);
        nLetter.classList.remove('steady','flicker-hot','flicker-off');
        nLetter.style.opacity = 1;
        spark.style.opacity = 0;
        void nLetter.getBoundingClientRect();
        const totalLen = nCore.getTotalLength();
        const duration = 3600;
        const start = performance.now();
        spark.style.opacity = 1;
        function frame(now){
          const t = Math.min(1, (now-start)/duration);
          const eased = easeOutCubic(t);
          const offset = totalLen * (1-eased);
          nCore.style.strokeDashoffset = offset;
          nGlow.style.strokeDashoffset = offset;
          nChroma.style.strokeDashoffset = offset;
          const pt = nCore.getPointAtLength(totalLen*eased);
          spark.setAttribute('cx', pt.x);
          spark.setAttribute('cy', pt.y);
          if(Math.random() < 0.16) spawnSparkBranch(pt.x, pt.y);
          if(t < 1){ requestAnimationFrame(frame); }
          else { spark.style.opacity = 0; flashAmbient(100); setTimeout(startFlicker, 110); }
        }
        requestAnimationFrame(frame);
      };
      drawOn();
      const tips = [
        'İpucu: <b>Yüksek kimya</b>, saha içi uyumu belirgin şekilde artırır.',
        'İpucu: <b>Oyuncu rolleri</b>, taktik uyumunu doğrudan etkiler.',
        'İpucu: <b>Taktik değişikliklerini</b> maç ortasında da yapabilirsin.',
        'İpucu: <b>Kanat ve merkez tercihleri</b>, hücum akışını ciddi şekilde değiştirir.'
      ];
      let idx = 0;
      clearInterval(this.tipTimer);
      this.tipTimer = setInterval(()=>{
        if(!this.root || !this.isVisible) return;
        tipEl.classList.remove('visible');
        setTimeout(()=>{
          idx = (idx + 1) % tips.length;
          tipEl.innerHTML = tips[idx];
          tipEl.classList.add('visible');
        }, 220);
      }, 3200);
    }
  };

  window.NX_SPLASH = api;

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ()=>api.show(), {once:true});
  }else{
    api.show();
  }
})();
