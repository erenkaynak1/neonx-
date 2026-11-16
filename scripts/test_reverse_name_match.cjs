'use strict';
// RE:VERSE name matcher: names heard by a Turkish speech recogniser must resolve to the right player.
// Runs offline (no browser). Fails if fewer than 95% land first or any misses the top three.
const fs=require('fs');const vm=require('vm');const path=require('path');process.chdir(path.resolve(__dirname,'..'));
const code=fs.readFileSync('side-games/reverse-xi/name-match-v1.js','utf8');
const names=JSON.parse(fs.readFileSync('side-games/reverse-xi/data/names.json','utf8'));
const ctx={window:{},document:{currentScript:{src:'http://x/side-games/reverse-xi/name-match-v1.js'}},location:{href:'http://x/'},URL,fetch:async()=>({json:async()=>names}),console};
vm.createContext(ctx);vm.runInContext(code,ctx);
const cases=[['ırlink holan','Erling Haaland'],['kılyan mbape','Kylian Mbappé'],['vinıcıus','Vinicius Junior'],['belingem','Jude Bellingham'],['salah','Mohamed Salah'],['levandoski','Robert Lewandowski'],
 ['de bruyn','Kevin De Bruyne'],['modriç','Luka Modric'],['osimhen','Victor Osimhen'],['ceko','Edin Dzeko'],['grizman','Antoine Griezmann'],['kimiş','Joshua Kimmich'],['noyer','Manuel Neuer'],['yamal','Lamine Yamal'],
 ['gavi','Gavi'],['keyn','Harry Kane'],['valverde','Federico Valverde'],['rodrigo','Rodrygo'],['ançeloti','Carlo Ancelotti'],['benzema','Karim Benzema'],['icardi','Mauro Icardi'],['mertens','Dries Mertens'],
 ['zaha','Wilfried Zaha'],['torreyra','Lucas Torreira'],['muslera','Fernando Muslera'],['dzeko','Edin Dzeko'],['fred','Fred'],['szymanski','Sebastian Szymanski'],['şimanski','Sebastian Szymanski'],['tadiç','Dusan Tadic'],
 ['bakambu','Cédric Bakambu'],['aboubakar','Vincent Aboubakar'],['abubakar','Vincent Aboubakar'],['ömer faruk beyaz','Ömer Beyaz'],['barış alper yılmaz','Barış Alper Yılmaz'],['uğurcan çakır','Uğurcan Çakır'],['altay bayındır','Altay Bayındır'],['orkun kökçü','Orkun Kökçü'],['cengiz ünder','Cengiz Ünder'],['semih kılıçsoy','Semih Kılıçsoy']];const cases2=[['ırling holand','Erling Haaland'],['erling haland','Erling Haaland'],['haland','Erling Haaland'],['kilyan embape','Kylian Mbappé'],['embape','Kylian Mbappé'],
 ['vinisius junyor','Vinicius Junior'],['cud belingım','Jude Bellingham'],['belingım','Jude Bellingham'],['muhammed salah','Mohamed Salah'],['robert levandovski','Robert Lewandowski'],
 ['harri keyn','Harry Kane'],['kevin dö broyne','Kevin De Bruyne'],['luka modriç','Luka Modric'],['lamin yamal','Lamine Yamal'],['kvaratshelya','Khvicha Kvaratskhelia'],
 ['viktor osimen','Victor Osimhen'],['mauro ikardi','Mauro Icardi'],['ecin ceko','Edin Dzeko'],['dusan tadiç','Dusan Tadic'],['arda güler','Arda Güler'],['hakan çalhanoğlu','Hakan Çalhanoğlu'],
 ['kerem aktürkoğlu','Kerem Aktürkoğlu'],['lionel mesi','Lionel Messi'],['kristiano ronaldo','Cristiano Ronaldo'],['neymar','Neymar'],['ruben dias','Rúben Dias'],['virgil van dayk','Virgil van Dijk'],
 ['antuan grizman','Antoine Griezmann'],['zlatan ibrahimoviç','Zlatan Ibrahimovic'],['ciro immobile','Ciro Immobile'],['ferdi kadıoğlu','Ferdi Kadioglu'],['kenan yıldız','Kenan Yildiz'],
 ['frenki de yong','Frenkie de Jong'],['joşua kimiç','Joshua Kimmich'],['tomas müler','Thomas Müller'],['manuel noyer','Manuel Neuer'],['sadyo mane','Sadio Mané'],['pedri','Pedri'],['rodri','Rodri'],['mesut özil','Mesut Özil']];
cases.push(...cases2);
(async()=>{await ctx.window.NX_NAME_MATCH.ready;let top1=0,top3=0;const miss=[];
 for(const [heard,want] of cases){const s=ctx.window.NX_NAME_MATCH.suggest([heard],3);const names=s.map(x=>x.name);
   const norm=x=>x.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/ı/g,'i');
   const i=names.findIndex(n=>norm(n)===norm(want));if(i===0)top1++;if(i>=0)top3++;else miss.push(heard+' → '+JSON.stringify(s)+' (want '+want+')');
   if(i!==0&&i>=0)miss.push('  (top3 only) '+heard+' → '+names.join(' | '));}
 console.log(`top1 ${top1}/${cases.length}, top3 ${top3}/${cases.length}`);if(miss.length)console.log(miss.join('\n'));
 if(top3<cases.length||top1<Math.ceil(cases.length*.95)){console.error('name matcher below target');process.exit(1)}})();
