'use strict';
(() => {
  const app=document.getElementById('app');
  if(!app)return;

  const FLAGS={
    'Türkiye':'🇹🇷','Turkiye':'🇹🇷','Turkey':'🇹🇷','Hollanda':'🇳🇱','Netherlands':'🇳🇱','Norveç':'🇳🇴','Norvec':'🇳🇴','Norway':'🇳🇴','Mısır':'🇪🇬','Misir':'🇪🇬','Egypt':'🇪🇬',
    'İngiltere':'🇬🇧','Ingiltere':'🇬🇧','England':'🏴','Fransa':'🇫🇷','France':'🇫🇷','Almanya':'🇩🇪','Germany':'🇩🇪','İspanya':'🇪🇸','Ispanya':'🇪🇸','Spain':'🇪🇸','İtalya':'🇮🇹','Italya':'🇮🇹','Italy':'🇮🇹',
    'Portekiz':'🇵🇹','Portugal':'🇵🇹','Belçika':'🇧🇪','Belcika':'🇧🇪','Belgium':'🇧🇪','Brezilya':'🇧🇷','Brazil':'🇧🇷','Arjantin':'🇦🇷','Argentina':'🇦🇷','Uruguay':'🇺🇾','Kolombiya':'🇨🇴','Colombia':'🇨🇴',
    'Şili':'🇨🇱','Sili':'🇨🇱','Chile':'🇨🇱','Meksika':'🇲🇽','Mexico':'🇲🇽','ABD':'🇺🇸','USA':'🇺🇸','United States':'🇺🇸','Kanada':'🇨🇦','Canada':'🇨🇦','Fas':'🇲🇦','Morocco':'🇲🇦','Cezayir':'🇩🇿','Algeria':'🇩🇿',
    'Tunus':'🇹🇳','Tunisia':'🇹🇳','Senegal':'🇸🇳','Nijerya':'🇳🇬','Nigeria':'🇳🇬','Gana':'🇬🇭','Ghana':'🇬🇭','Fildişi Sahili':'🇨🇮','Fildisi Sahili':'🇨🇮','Ivory Coast':'🇨🇮','Kamerun':'🇨🇲','Cameroon':'🇨🇲',
    'Japonya':'🇯🇵','Japan':'🇯🇵','Güney Kore':'🇰🇷','Guney Kore':'🇰🇷','South Korea':'🇰🇷','Suudi Arabistan':'🇸🇦','Saudi Arabia':'🇸🇦','İran':'🇮🇷','Iran':'🇮🇷','Avustralya':'🇦🇺','Australia':'🇦🇺',
    'İskoçya':'🏴','Iskocya':'🏴','Scotland':'🏴','Galler':'🏴','Wales':'🏴','İrlanda':'🇮🇪','Irlanda':'🇮🇪','Ireland':'🇮🇪','Danimarka':'🇩🇰','Denmark':'🇩🇰','İsveç':'🇸🇪','Isvec':'🇸🇪','Sweden':'🇸🇪',
    'Finlandiya':'🇫🇮','Finland':'🇫🇮','İsviçre':'🇨🇭','Isvicre':'🇨🇭','Switzerland':'🇨🇭','Avusturya':'🇦🇹','Austria':'🇦🇹','Polonya':'🇵🇱','Poland':'🇵🇱','Çekya':'🇨🇿','Cekya':'🇨🇿','Czechia':'🇨🇿',
    'Hırvatistan':'🇭🇷','Hirvatistan':'🇭🇷','Croatia':'🇭🇷','Sırbistan':'🇷🇸','Sirbistan':'🇷🇸','Serbia':'🇷🇸','Bosna Hersek':'🇧🇦','Bosnia and Herzegovina':'🇧🇦','Yunanistan':'🇬🇷','Greece':'🇬🇷','Ukrayna':'🇺🇦','Ukraine':'🇺🇦',
    'Rusya':'🇷🇺','Russia':'🇷🇺','Gürcistan':'🇬🇪','Gurcistan':'🇬🇪','Georgia':'🇬🇪','Macaristan':'🇭🇺','Hungary':'🇭🇺','Romanya':'🇷🇴','Romania':'🇷🇴','Slovakya':'🇸🇰','Slovakia':'🇸🇰','Slovenya':'🇸🇮','Slovenia':'🇸🇮'
  };

  const GLYPHS={
    club:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4.5 10 3h4l2 1.5 4 1.7-2.2 4-2.1-1v10.3H8.3V9.2l-2.1 1L4 6.2 8 4.5Z"/><path d="M10 3c.2 1.5.9 2.3 2 2.3S13.8 4.5 14 3"/></svg>',
    league:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v5c0 3-1.6 5-4 5s-4-2-4-5V4Z"/><path d="M8 6H4v2c0 2 1.2 3.3 3.7 3.8M16 6h4v2c0 2-1.2 3.3-3.7 3.8M12 14v4M8.5 21h7M10 18h4"/></svg>'
  };

  function decorateHead(head){
    if(head.dataset.premiumDecorated==='1')return;
    const box=head.querySelector(':scope > div');
    const small=box?.querySelector('small');
    if(!box||!small)return;
    const label=(small.textContent||'').trim().toUpperCase();
    const value=[...box.childNodes].filter(n=>n!==small).map(n=>n.textContent||'').join('').trim();
    let kind='';
    if(label==='MİLLİYET'||label==='MILLIYET')kind='nationality';
    else if(label==='KULÜP'||label==='KULUP')kind='club';
    else if(label==='LİG'||label==='LIG')kind='league';
    if(!kind)return;

    head.classList.add('kind-'+kind);
    const text=document.createElement('span');
    text.className='headText';
    text.textContent=value;
    [...box.childNodes].forEach(n=>{if(n!==small)n.remove()});

    if(kind==='club'||kind==='league'){
      const glyph=document.createElement('span');
      glyph.className='conditionGlyph';
      glyph.innerHTML=GLYPHS[kind];
      box.append(glyph,small,text);
    }else{
      box.append(small,text);
      const flag=document.createElement('span');
      flag.className='countryFlag';
      flag.setAttribute('aria-label',value+' bayrağı');
      flag.textContent=FLAGS[value]||'🌐';
      box.appendChild(flag);
    }
    head.dataset.premiumDecorated='1';
  }

  function decorate(){
    if(document.body.dataset.ctScreen!=='game')return;
    const corner=app.querySelector('.grid .corner');
    if(corner&&corner.textContent!=='X')corner.textContent='X';
    app.querySelectorAll('.grid .head').forEach(decorateHead);
    const brand=app.querySelector('.brand');
    if(brand&&!brand.dataset.premiumLabelled){
      brand.dataset.premiumLabelled='1';
      brand.setAttribute('aria-label','NEON XI Futbol XOX');
    }
  }

  let queued=false;
  const queue=()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;decorate()});
  };
  const observer=new MutationObserver(queue);
  observer.observe(app,{childList:true,subtree:true});
  queue();
})();
