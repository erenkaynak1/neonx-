from pathlib import Path
import re
import subprocess
import tempfile

index = Path("index.html")
text = index.read_text(encoding="utf-8")
marker = "<!-- NEON XI / Engine-2D-Stats Integration v2 2026-08-17 -->"


def replace_all(old, new, label, minimum=1):
    global text
    count = text.count(old)
    if count < minimum:
        raise SystemExit(f"{label}: beklenen kaynak bulunamadı (count={count})")
    text = text.replace(old, new)
    print(f"{label}: {count} eşleşme güncellendi")


if marker not in text:
    replace_all(
        '''  showScene = async function(kind, steps, token) {
    if (game.testMode) return;
    if(kind==="goal"){
      const cinema=window.NEON_XI_EVENT_CINEMA;
      if(cinema?.playAndWait){
        return cinema.playAndWait("goal",{minute:game.minute,token});
      }
      return presentationWait(320,token);
    }''',
        '''  showScene = async function(kind, steps, token) {
    if (game.testMode) return;
    if(kind==="goal"){
      /* Gol artık popup/cinema açmaz. Olay 2D akışta kalır ve skor değişimi üst tabelada canlandırılır. */
      window.NEON_XI_EVENT_CINEMA?.cancel?.();
      return presentationWait(40,token);
    }''',
        "goal showScene",
    )

    replace_all(
        '  window.addEventListener("neon-xi:match-event",event=>queueDirect(event.detail));',
        '''  window.addEventListener("neon-xi:match-event",event=>{
    if(event?.detail?.kind==="goal") return;
    queueDirect(event.detail);
  });''',
        "goal cinema event listener",
    )

    replace_all(
        '''    applyMicroRating(attackingTeam,p.support,"positioning",success,probability,.018,{
      positionalActions:1,positionalWins:success?1:0,positionalErrors:success?0:1
    });
  }
  function v3RunPhase(attackingTeam,defendingTeam,phase,route) {''',
        '''    applyMicroRating(attackingTeam,p.support,"positioning",success,probability,.018,{
      positionalActions:1,positionalWins:success?1:0,positionalErrors:success?0:1
    });
    return p;
  }
  function v3RunPhase(attackingTeam,defendingTeam,phase,route) {''',
        "v3 phase participants return",
    )

    replace_all(
        '''    const success=rng()<probability;
    v3RecordPhaseMicro(attackingTeam,defendingTeam,phase,route,success,probability);
    return{success,probability,scores,attackAdjustment,defenseAdjustment};''',
        '''    const success=rng()<probability;
    const micro=v3RecordPhaseMicro(attackingTeam,defendingTeam,phase,route,success,probability);
    return{success,probability,scores,attackAdjustment,defenseAdjustment,micro,statDelta:null,failureReason:null};''',
        "v3 phase result bridge",
    )

    replace_all(
        '''      const p1=v3RunPhase(attackingTeam,defendingTeam,1,route);
      game.stats[attackingTeam].passesAttempted+=4;game.stats[attackingTeam].passesCompleted+=p1.success?4:Math.round(rand(1,3));''',
        '''      const p1=v3RunPhase(attackingTeam,defendingTeam,1,route);
      const p1Completed=p1.success?4:Math.round(rand(1,3));
      p1.statDelta={passesAttempted:4,passesCompleted:p1Completed,turnovers:p1.success?0:1};
      game.stats[attackingTeam].passesAttempted+=4;game.stats[attackingTeam].passesCompleted+=p1Completed;''',
        "phase 1 stats",
    )

    replace_all(
        '''      const p2=v3RunPhase(attackingTeam,defendingTeam,2,route);
      game.stats[attackingTeam].passesAttempted+=5;game.stats[attackingTeam].passesCompleted+=p2.success?5:Math.round(rand(2,4));''',
        '''      const p2=v3RunPhase(attackingTeam,defendingTeam,2,route);
      const p2Completed=p2.success?5:Math.round(rand(2,4));
      p2.statDelta={passesAttempted:5,passesCompleted:p2Completed,turnovers:p2.success?0:1};
      game.stats[attackingTeam].passesAttempted+=5;game.stats[attackingTeam].passesCompleted+=p2Completed;''',
        "phase 2 stats",
    )

    replace_all(
        '''      setVisualPhase("progress",{team:attackingTeam,route,phase:2,success:true,action:"circulation",message:`${game.teamNames[attackingTeam]} orta saha bağlantısını kurdu`});''',
        '''      setVisualPhase("progress",{
        team:attackingTeam,route,phase:2,success:true,action:"circulation",
        focusIds:visualMemberIds(p1.micro?.primary,p1.micro?.carrier,p1.micro?.support),
        carrierId:p1.micro?.carrier?.footballer?.id||p1.micro?.primary?.footballer?.id||null,
        supportId:p1.micro?.support?.footballer?.id||null,
        ballTargetId:p1.micro?.support?.footballer?.id||null,
        statDelta:p1.statDelta,
        message:`${p1.micro?.primary?.footballer?.name||game.teamNames[attackingTeam]} oyunu orta sahaya taşıdı`,
        cause:`${p1.micro?.primary?.footballer?.name||"Pasör"} pas bağlantısını kurdu; ${p1.micro?.support?.footballer?.name||"destek oyuncusu"} yeni pas açısını oluşturdu.`
      });''',
        "phase 1 success visual",
    )

    replace_all(
        '''      setVisualPhase("entry",{team:attackingTeam,route,phase:3,success:true,action:"advance",message:route==="wing"?"Top kanat koridoruna taşındı":"Top merkezde son bölgeye taşındı"});''',
        '''      setVisualPhase("entry",{
        team:attackingTeam,route,phase:3,success:true,action:"advance",
        focusIds:visualMemberIds(p2.micro?.primary,p2.micro?.carrier,p2.micro?.support),
        carrierId:p2.micro?.carrier?.footballer?.id||p2.micro?.primary?.footballer?.id||null,
        supportId:p2.micro?.support?.footballer?.id||null,
        ballTargetId:p2.micro?.support?.footballer?.id||null,
        statDelta:p2.statDelta,
        message:route==="wing"
          ?`${p2.micro?.carrier?.footballer?.name||game.teamNames[attackingTeam]} topu kanat koridoruna taşıdı`
          :`${p2.micro?.primary?.footballer?.name||game.teamNames[attackingTeam]} merkezden son bölge bağlantısını kurdu`,
        cause:route==="wing"
          ?`${p2.micro?.carrier?.footballer?.name||"Top taşıyıcı"} genişliği kullandı; ${p2.micro?.support?.footballer?.name||"destek oyuncusu"} ileri pas açısını açtı.`
          :`${p2.micro?.primary?.footballer?.name||"Pasör"} ve ${p2.micro?.support?.footballer?.name||"destek oyuncusu"} merkezde hatlar arası bağlantıyı kurdu.`
      });''',
        "phase 2 success visual",
    )

    old_failure = '''  function v3PhaseFailure(attackingTeam,defendingTeam,phase,result,route="center") {
    const label=phase===1?"geriden oyun kurma":phase===2?"orta sahada ilerleme":phase===3?"son bölgeye giriş":"geçiş oyunu";
    setVisualPhase("turnover",{team:defendingTeam,route,phase,success:false,action:"interception",message:`${game.teamNames[defendingTeam]} ${label} aşamasını durdurdu.`});
    addEvent("tactical",`${game.teamNames[defendingTeam]} ${label} aşamasını durdurdu.`,`${Math.round(result.probability*100)}% hücum başarı olasılığı`,`Nihai faz ayarları hücum ${result.attackAdjustment>=0?"+":""}${result.attackAdjustment}, savunma ${result.defenseAdjustment>=0?"+":""}${result.defenseAdjustment}; sınır ±18.`);
    if((phase===1&&rng()<.15)||(phase===2&&rng()<.20))game.forcedAttack={team:defendingTeam,route:"transition",bonus:1};
  }'''

    new_failure = '''  function v3NarrativeIndex(key,size){
    const text=String(key||"");let h=2166136261;
    for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}
    return (h>>>0)%Math.max(1,size||1);
  }
  function v3NarrativePick(list,key){return list[v3NarrativeIndex(key,list.length)]||list[0];}
  function v3FailureNarrative(attackingTeam,defendingTeam,phase,result,route="center"){
    const p=result?.micro||{};
    const passer=p.primary||p.carrier||null,carrier=p.carrier||p.primary||null,defender=p.defender||null,support=p.support||null;
    const name=(member,fallback)=>member?.footballer?.name||fallback;
    const value=(member,key)=>{const n=Number(stat(member,key));return Number.isFinite(n)?n:50;};
    const passerName=name(passer,game.teamNames[attackingTeam]);
    const carrierName=name(carrier,passerName);
    const defenderName=name(defender,game.teamNames[defendingTeam]);
    const supportName=name(support,"takım arkadaşı");
    const passQuality=(value(passer,"shortPassing")+value(passer,"vision")+value(passer,"decisionMaking"))/3;
    const carryQuality=(value(carrier,"dribbling")+value(carrier,"pace")+value(carrier,"decisionMaking"))/3;
    const defenseQuality=(value(defender,"positioning")+value(defender,"tackling")+value(defender,"defending"))/3;
    const supportQuality=(value(support,"positioning")+value(support,"decisionMaking")+value(support,"pace"))/3;
    const pressureEdge=(Number(result?.defenseAdjustment)||0)-(Number(result?.attackAdjustment)||0);
    const phaseLabel=phase===1?"geriden çıkış":phase===2?"orta saha ilerleyişi":phase===3?"son bölge girişi":"geçiş hücumu";
    const routeLabel=route==="wing"?"Kanat":route==="transition"?"Geçiş":route==="setPiece"?"Duran top":"Merkez";
    const key=[game.minute,phase,route,passer?.footballer?.id,carrier?.footballer?.id,defender?.footballer?.id,support?.footballer?.id].join("|");
    let reason="interception",variants=[],cause="";

    if(phase>=2&&carryQuality+4<defenseQuality&&(route==="wing"||phase===4||value(carrier,"dribbling")<58)){
      reason="heavyTouch";
      variants=[
        `${carrierName} topu ayağından biraz açtı, ${defenderName} araya girip topu aldı.`,
        `${carrierName} kontrolü uzatınca ${defenderName} müdahaleyi yaptı.`,
        `${defenderName}, ${carrierName}'ın topu önüne fazla açmasını değerlendirdi.`
      ];
      cause=`${carrierName}'ın top taşıma profili bu pozisyonda ${defenderName}'ın pozisyon alma ve müdahale kalitesinin gerisinde kaldı.`;
    }else if(pressureEdge>=7){
      reason="press";
      variants=[
        `${game.teamNames[defendingTeam]} baskıyı artırdı; ${passerName} acele pas yaptı ve ${defenderName} topu kazandı.`,
        `${passerName} baskı altında pas açısını bulamadı, ${defenderName} araya girdi.`,
        `${defenderName} öne çıkarak ${passerName}'ın baskı altında çıkardığı pası kesti.`
      ];
      cause=`Savunma ayarı bu fazda hücum ayarından daha güçlü etki üretti; ${defenderName} baskının kazandırdığı mesafeyi kullandı.`;
    }else if(support&&supportQuality+5<defenseQuality&&phase>=2){
      reason="markedReceiver";
      variants=[
        `${supportName} markajdan çıkamayınca ${passerName}'ın pası savunmada kaldı.`,
        `${defenderName}, ${supportName}'a giden hattı kapattı; ${passerName} topu kaybetti.`,
        `${passerName} ${supportName}'ı aradı ama ${defenderName} pas kanalını kapattı.`
      ];
      cause=`${supportName}'ın boş alan bulma desteği, ${defenderName}'ın pozisyon alma üstünlüğünü aşamadı.`;
    }else if(passQuality+2<defenseQuality){
      reason="interception";
      variants=[
        `${defenderName} pas kanalını okuyup ${passerName}'ın pasını kesti.`,
        `${passerName} ileri pası denedi; ${defenderName} zamanlamayı doğru yapıp araya girdi.`,
        `${defenderName}, ${passerName}'ın pas yönünü erken okuyarak topu kazandı.`
      ];
      cause=`${defenderName}'ın savunma okuması bu fazda ${passerName}'ın pas üretimine üstün geldi.`;
    }else if(passQuality<60){
      reason="shortPass";
      variants=[
        `${passerName} pası kısa bıraktı, ${defenderName} araya girdi.`,
        `${passerName}'ın pasında hız eksik kaldı; ${defenderName} topu topladı.`,
        `${passerName} bağlantı pasını yeterince sert gönderemedi, ${defenderName} hamleyi yaptı.`
      ];
      cause=`Bu top kaybında pas hızı ve karar kalitesi belirleyici oldu; savunma pasın yolunu kapattı.`;
    }else{
      reason="duel";
      variants=[
        `${defenderName} zamanlamayı doğru yaptı ve ${carrierName}'dan topu söktü.`,
        `${carrierName} ilerlemek istedi ama ${defenderName} geçit vermedi.`,
        `${defenderName} ikili mücadeleyi kazanıp hücumu bitirdi.`
      ];
      cause=`Faz başarı ihtimali savunmanın lehine sonuçlandı; ${defenderName} bireysel müdahaleyle pozisyonu tamamladı.`;
    }
    return{reason,text:v3NarrativePick(variants,key),detail:`${routeLabel} · ${phaseLabel}`,cause};
  }
  function v3PhaseFailure(attackingTeam,defendingTeam,phase,result,route="center") {
    const narrative=v3FailureNarrative(attackingTeam,defendingTeam,phase,result,route);
    const p=result?.micro||{};
    result.failureReason=narrative.reason;
    game.stats[attackingTeam].turnovers++;
    if(phase===1)game.stats[defendingTeam].highTurnovers++;
    setVisualPhase("turnover",{
      team:defendingTeam,route,phase,success:false,action:"interception",
      focusIds:visualMemberIds(p.primary,p.carrier,p.defender,p.support),
      carrierId:p.carrier?.footballer?.id||p.primary?.footballer?.id||null,
      defenderId:p.defender?.footballer?.id||null,
      supportId:p.support?.footballer?.id||null,
      ballTargetId:p.defender?.footballer?.id||null,
      outcome:narrative.reason,
      statDelta:result.statDelta||null,
      message:narrative.text,
      cause:narrative.cause
    });
    addEvent("turnover",narrative.text,narrative.detail,narrative.cause);
    if((phase===1&&rng()<.15)||(phase===2&&rng()<.20))game.forcedAttack={team:defendingTeam,route:"transition",bonus:1};
  }'''

    replace_all(old_failure, new_failure, "v3 failure narrative")

    replace_all(
        '''      setVisualPhase("turnover",{team:defendingTeam,route,phase:5,success:false,action:"interception",focusIds:visualMemberIds(result.creator,result.receiver),message:`${game.teamNames[defendingTeam]} giriş pasını kesti`});
      addEvent("turnover",`${game.teamNames[attackingTeam]} ceza sahasına giriş pasını kaybetti.`,`${Math.round(result.probability*100)}% başarı olasılığı`,"Pas kanalı savunması giriş kombinasyonunu bozdu.");''',
        '''      const stopper=result.defenders?.[0]?.member||null;
      const entryText=stopper
        ?`${result.creator.footballer.name}, ${result.receiver.footballer.name}'ı aradı; ${stopper.footballer.name} pası kesti.`
        :`${result.creator.footballer.name} ceza sahasına giriş pasını kaybetti.`;
      const entryCause=stopper
        ?`${stopper.footballer.name} ceza sahası girişindeki pas kanalını erken kapattı.`
        :"Pas kanalı savunma tarafından kapatıldı.";
      setVisualPhase("turnover",{
        team:defendingTeam,route,phase:5,success:false,action:"interception",
        focusIds:visualMemberIds(result.creator,result.receiver,stopper),
        carrierId:result.creator?.footballer?.id||null,
        defenderId:stopper?.footballer?.id||null,
        supportId:result.receiver?.footballer?.id||null,
        ballTargetId:stopper?.footballer?.id||null,
        outcome:"entryInterception",message:entryText,cause:entryCause
      });
      addEvent("turnover",entryText,`${route==="wing"?"Kanat":"Merkez"} · ceza sahası girişi`,entryCause);''',
        "work-ball interception commentary",
    )

    replace_all(
        '''    if(!duelSuccess){addEvent("tactical",`${creator.footballer.name} ortasında savunma hava topunu kazandı.`,`${Math.round(duel*100)}% hücum hava düellosu` ,"Hava savunması üstün geldi.");if(rng()<.20)return v3ResolveGroundShot(attackingTeam,defendingTeam,route,5,.88,attackCtx,token,"İkinci top");return;}''',
        '''    if(!duelSuccess){addEvent("tactical",`${defender.footballer.name}, ${target.footballer.name}'a karşı hava topunu kazandı.`,`${creator.footballer.name} ortayı yaptı.`,`${defender.footballer.name} pozisyon alma, kafa ve güç profiliyle hava düellosunda üstün geldi.`);if(rng()<.20)return v3ResolveGroundShot(attackingTeam,defendingTeam,route,5,.88,attackCtx,token,"İkinci top");return;}''',
        "aerial duel commentary",
    )

    replace_all(
        '''      outcome:update.outcome??"",
      shotId:update.shotId??null,
      message:update.message||previous.message||"Maç yerleşimi",''',
        '''      outcome:update.outcome??"",
      shotId:update.shotId??null,
      statDelta:update.statDelta||null,
      score:{A:Number(game.score?.A||0),B:Number(game.score?.B||0)},
      possession:{A:Number(game.possession?.A||50),B:Number(game.possession?.B||50)},
      stats:{A:{...(game.stats?.A||{})},B:{...(game.stats?.B||{})}},
      message:update.message||previous.message||"Maç yerleşimi",''',
        "visual frame stat snapshot",
    )

    replace_all(
        '''    const payload={frameId:visual.id,minute:game.minute,kind,text,detail:visibleDetail};''',
        '''    const payload={frameId:visual.id,minute:game.minute,kind,text,detail:visibleDetail,visual,score:visual?.score||null,stats:visual?.stats||null};''',
        "commentary payload sync",
    )

    replace_all(
        '''  function actionResult(frame){if(frame?.success===true)return frame.action==="dribble"?"Rakibini geçti":"Başarılı";if(frame?.success===false)return frame.action==="dribble"?"Savunmacı durdurdu":"Başarısız";if(frame?.stage==="goal")return"Gol";if(frame?.stage==="finish")return"Kaleye yöneldi";return"Devam ediyor"}
  function causeTitle(frame){if(frame.action==="dribble")return frame.success===false?"Bire bir müdahalesi":"Bireysel üstünlük ve boş alan";if(frame.route==="wing")return"Genişlik ve koridor kullanımı";if(frame.route==="center")return"Pas bağlantıları ve merkez yoğunluğu";if(frame.route==="transition")return"Top kazanımı ve hızlı koşular";if(frame.stage==="turnover")return"Savunma müdahalesi";return"Taktik yerleşim"}''',
        '''  function actionResult(frame){if(frame?.stage==="turnover")return"Top rakibe geçti";if(frame?.success===true)return frame.action==="dribble"?"Rakibini geçti":"Başarılı";if(frame?.success===false)return frame.action==="dribble"?"Savunmacı durdurdu":"Başarısız";if(frame?.stage==="goal")return"Gol";if(frame?.stage==="finish")return"Kaleye yöneldi";return"Devam ediyor"}
  function causeTitle(frame){
    if(frame?.stage==="turnover")return({heavyTouch:"Kontrol hatası + müdahale",press:"Baskı altında top kaybı",markedReceiver:"Pas kanalı kapandı",shortPass:"Kısa / zayıf pas",interception:"Pas arası",entryInterception:"Ceza sahası girişinde pas arası",duel:"İkili mücadele"})[frame?.outcome]||"Savunma müdahalesi";
    if(frame.action==="dribble")return frame.success===false?"Bire bir müdahalesi":"Bireysel üstünlük ve boş alan";
    if(frame.route==="wing")return"Genişlik ve koridor kullanımı";
    if(frame.route==="center")return"Pas bağlantıları ve merkez yoğunluğu";
    if(frame.route==="transition")return"Top kazanımı ve hızlı koşular";
    return"Taktik yerleşim";
  }''',
        "2D reason labels",
    )

    popup_patch = '''

<!-- NEON XI / Engine-2D-Stats Integration v2 2026-08-17 -->
<style id="neon-xi-no-goal-popup-v2">
.goalCinema,.goalCinema.show{display:none!important;visibility:hidden!important;pointer-events:none!important}
#kadroPresentationScene.kp-scene.show.goal{display:none!important;visibility:hidden!important;pointer-events:none!important}
#nxEventCinema.nx-event-cinema.goal{display:none!important;visibility:hidden!important;pointer-events:none!important}
</style>
'''
    pos = text.rfind("</body>")
    if pos < 0:
        raise SystemExit("index.html: </body> bulunamadı")
    text = text[:pos] + popup_patch + text[pos:]
    index.write_text(text, encoding="utf-8")
    print("Integration v2 index.html içine yazıldı.")
else:
    print("Integration v2 zaten mevcut; kaynak tekrar değiştirilmedi.")

current = index.read_text(encoding="utf-8")
if current.count("<script") != current.count("</script>"):
    raise SystemExit("Script tag sayıları eşleşmiyor.")

scripts = re.findall(r"<script([^>]*)>(.*?)</script>", current, flags=re.I | re.S)
checked = 0
for i, (attrs, js) in enumerate(scripts):
    if not js.strip() or "application/json" in attrs.lower() or "application/ld+json" in attrs.lower():
        continue
    with tempfile.NamedTemporaryFile("w", suffix=".js", encoding="utf-8", delete=False) as tmp:
        tmp.write(js)
        tmp_path = tmp.name
    proc = subprocess.run(["node", "--check", tmp_path], capture_output=True, text=True)
    Path(tmp_path).unlink(missing_ok=True)
    if proc.returncode != 0:
        raise SystemExit(f"JS syntax kontrolü başarısız script #{i}:\n{proc.stderr}")
    checked += 1

print(f"JS syntax kontrolü başarılı: {checked} inline script.")
