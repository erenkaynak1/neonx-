(()=>{
  if(typeof buildPeelCard !== 'function') return;
  const previousBuildPeelCard = buildPeelCard;

  function isDesktop(){
    return window.matchMedia('(pointer:fine)').matches || window.innerWidth >= 700;
  }
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));

  function clipHalf(poly,nx,ny,t,less){
    if(!poly.length) return [];
    const out=[];
    const side=p=>nx*p[0]+ny*p[1]-t;
    const inside=p=>less ? side(p)<=1e-7 : side(p)>=-1e-7;
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length],ai=inside(a),bi=inside(b);
      if(ai) out.push(a);
      if(ai!==bi){
        const sa=side(a),sb=side(b),den=sa-sb,k=Math.abs(den)<1e-9?0:sa/den;
        out.push([a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k]);
      }
    }
    return out;
  }
  function polyCss(poly){
    if(poly.length<3) return 'polygon(0 0,0 0,0 0)';
    return 'polygon('+poly.map(([x,y])=>(x*100).toFixed(3)+'% '+(y*100).toFixed(3)+'%').join(',')+')';
  }
  function intersections(nx,ny,t){
    const pts=[];
    const add=(x,y)=>{if(x>=-1e-6&&x<=1+1e-6&&y>=-1e-6&&y<=1+1e-6&&!pts.some(p=>Math.hypot(p[0]-x,p[1]-y)<1e-5))pts.push([clamp(x),clamp(y)])};
    if(Math.abs(ny)>1e-8){add(0,t/ny);add(1,(t-nx)/ny)}
    if(Math.abs(nx)>1e-8){add(t/nx,0);add((t-ny)/nx,1)}
    if(pts.length<2) return [[1,1],[1,1]];
    let best=[pts[0],pts[1]],bd=-1;
    for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){let d=Math.hypot(pts[i][0]-pts[j][0],pts[i][1]-pts[j][1]);if(d>bd){bd=d;best=[pts[i],pts[j]]}}
    return best;
  }
  function placeLine(node,wrap,p1,p2,offset=0){
    if(!node) return;
    const rect=wrap.getBoundingClientRect(),inset=10,w=Math.max(1,rect.width-20),h=Math.max(1,rect.height-20);
    let x1=inset+p1[0]*w,y1=inset+p1[1]*h,x2=inset+p2[0]*w,y2=inset+p2[1]*h;
    const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy);
    if(len<.5){node.style.opacity='0';return}
    const ox=-dy/len*offset,oy=dx/len*offset;x1+=ox;y1+=oy;
    node.style.left=x1+'px';node.style.top=y1+'px';node.style.width=len+'px';node.style.transform='rotate('+(Math.atan2(dy,dx)*180/Math.PI)+'deg)';
  }

  function installDesktopPeel(wrap,onChange,revealed){
    if(!isDesktop() || revealed) return;
    const hit=wrap.querySelector('.peel-hit-zone');
    const front=wrap.querySelector('.top-paper-front');
    const back=wrap.querySelector('.top-paper-back');
    const crease=wrap.querySelector('.fold-crease');
    const shadow=wrap.querySelector('.fold-shadow');
    if(!hit||!front||!back) return;

    hit.style.width='150px';
    hit.style.height='150px';
    hit.style.cursor='nwse-resize';

    const square=[[0,0],[1,0],[1,1],[0,1]];
    let dragging=false,pid=null,sx=0,sy=0,progress=0,nx=Math.SQRT1_2,ny=Math.SQRT1_2,raf=null;

    function draw(p){
      progress=clamp(p);
      if(progress>=.998){
        front.style.clipPath='polygon(0 0,0 0,0 0)';
        back.style.clipPath='polygon(0 0,0 0,0 0)';
        if(crease) crease.style.opacity='0';
        if(shadow) shadow.style.opacity='0';
        return;
      }
      if(progress<=.002){
        front.style.clipPath='polygon(0 0,100% 0,100% 100%,0 100%)';
        back.style.clipPath='polygon(100% 100%,100% 100%,100% 100%)';
        if(crease) crease.style.opacity='0';
        if(shadow) shadow.style.opacity='0';
        return;
      }
      const len=Math.hypot(nx,ny)||1;nx/=len;ny/=len;
      const threshold=(nx+ny)*(1-progress);
      front.style.clipPath=polyCss(clipHalf(square,nx,ny,threshold,true));
      const peeled=clipHalf(square,nx,ny,threshold,false);
      const lift=Math.sin(Math.PI*progress),reflection=1.72+0.18*lift;
      back.style.clipPath=polyCss(peeled.map(([x,y])=>{const d=nx*x+ny*y-threshold;return[x-reflection*d*nx,y-reflection*d*ny]}));
      const ep=intersections(nx,ny,threshold);
      placeLine(crease,wrap,ep[0],ep[1],0);placeLine(shadow,wrap,ep[0],ep[1],5+lift*5);
      if(crease) crease.style.opacity=String(clamp(Math.sin(Math.PI*progress)*1.15));
      if(shadow) shadow.style.opacity=String(clamp(Math.sin(Math.PI*progress)*.9));
    }

    function animate(target){
      if(raf) cancelAnimationFrame(raf);
      const from=progress,start=performance.now(),dur=150;
      const frame=now=>{const t=clamp((now-start)/dur),e=1-Math.pow(1-t,3);draw(from+(target-from)*e);if(t<1)raf=requestAnimationFrame(frame);else{raf=null;if(target===1){hit.classList.add('disabled');hit.style.pointerEvents='none';onChange(true)}else onChange(false)}};
      raf=requestAnimationFrame(frame);
    }

    function move(e){
      if(!dragging || e.pointerId!==pid) return;
      e.preventDefault();e.stopImmediatePropagation();
      const dx=Math.max(0,sx-e.clientX),dy=Math.max(0,sy-e.clientY);
      const p=clamp(Math.hypot(dx,dy*1.15)/210);
      if(dx+dy>3){const vx=Math.max(.08,dx/210),vy=Math.max(.08,dy/165),l=Math.hypot(vx,vy)||1;nx=vx/l;ny=vy/l}
      draw(p);
    }
    function up(e){
      if(!dragging || e.pointerId!==pid) return;
      e.preventDefault();e.stopImmediatePropagation();
      dragging=false;
      try{hit.releasePointerCapture(pid)}catch(_){ }
      document.removeEventListener('pointermove',move,true);
      document.removeEventListener('pointerup',up,true);
      document.removeEventListener('pointercancel',up,true);
      pid=null;
      animate(progress>=.28?1:0);
    }
    function down(e){
      if(e.button!==undefined && e.button!==0) return;
      e.preventDefault();e.stopImmediatePropagation();
      if(raf){cancelAnimationFrame(raf);raf=null}
      dragging=true;pid=e.pointerId;sx=e.clientX;sy=e.clientY;
      try{hit.setPointerCapture(pid)}catch(_){ }
      document.addEventListener('pointermove',move,true);
      document.addEventListener('pointerup',up,true);
      document.addEventListener('pointercancel',up,true);
    }
    hit.addEventListener('pointerdown',down,true);
    draw(0);
  }

  buildPeelCard = function(revealed,isImposter,footballer,onChange){
    const wrap=previousBuildPeelCard(revealed,isImposter,footballer,onChange);
    installDesktopPeel(wrap,onChange,revealed);
    return wrap;
  };
})();
