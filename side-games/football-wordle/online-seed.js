(() => {
  const p=new URLSearchParams(location.search);
  const key=p.get('nxMatch')||p.get('nxCode')||'';
  if(!key)return;
  let h=2166136261>>>0;
  for(let i=0;i<key.length;i++){h^=key.charCodeAt(i);h=Math.imul(h,16777619)}
  let a=h>>>0;
  Math.random=()=>{
    a|=0;a=a+0x6D2B79F5|0;
    let t=Math.imul(a^a>>>15,1|a);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return((t^t>>>14)>>>0)/4294967296;
  };
  document.documentElement.dataset.nxOnlineWordle='1';
})();
