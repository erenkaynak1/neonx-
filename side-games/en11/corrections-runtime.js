(function(){
  var pending;
  var allowed={birthDate:1,heightCm:1,clubCount:1,careerGoals:1,careerAssists:1,careerAppearances:1,internationalCaps:1,internationalGoals:1,peakValue:1};
  function load(){return pending||(pending=fetch('./data/corrections.json',{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error('corrections');return r.json()}).then(function(d){return Array.isArray(d&&d.corrections)?d.corrections:[]}).catch(function(){return []}))}
  window.NX_EN11=window.NX_EN11||{};
  window.NX_EN11.applyCorrections=function(rows){return load().then(function(cs){cs.forEach(function(c){var url=String(c&&c.source_url||''),date=String(c&&c.verified_at||''),id=Number(c&&c.player_id);if(!(id>0)||!/^https:\/\//i.test(url)||! /^\d{4}-\d{2}-\d{2}$/.test(date)||!c.values||typeof c.values!=='object'||Array.isArray(c.values))return;var p=rows.find(function(x){return Number(x.id)===id});if(!p)return;Object.keys(c.values).forEach(function(k){var v=c.values[k];if(allowed[k]&&typeof v==='number'&&Number.isFinite(v)&&v>=0)p[k]=v});p.verifiedCorrection={verifiedAt:date,sourceUrl:url}});return rows})}
})();
