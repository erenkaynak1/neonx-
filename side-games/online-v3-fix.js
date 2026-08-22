(()=>{
  const EMOJIS = [
    '⚽','🥅','🏆','🥇','🥈','🥉','🏅','🎖️','👟','🧤','🎯','🔥','⚡','💨','🚀','💥',
    '🐐','👑','🦁','🐺','🦅','🦊','🐍','🐢','🐎','🦈','🐂','🐆','🐯','🐻','🐉','🦖',
    '🧱','🧠','💪','🫀','👀','🦵','🦶','🤝','👏','🙏','🫡','👍','👎','🤌','✋','☝️',
    '🎩','🪄','🎭','🤡','💀','👻','😎','🤓','🥶','🥵','😡','🤯','😍','😭','😂','🤫','😈',
    '❤️','💔','💚','💙','🖤','🤍','⭐','🌟','✨','☄️','🌪️','🌊','❄️','☀️','🌙','🌈',
    '🏟️','✈️','🚌','🚑','🚨','⏱️','⌛','📣','🎤','📸','💰','💎','🔒','🔑','📈','📉',
    '🇦🇷','🇧🇷','🇵🇹','🇫🇷','🇩🇪','🇪🇸','🇮🇹','🇬🇧','🇹🇷','🇳🇱','🇧🇪','🇭🇷','🇺🇾','🇨🇴','🇲🇦','🇸🇳',
    '🇯🇵','🇰🇷','🇺🇸','🇲🇽','🇨🇲','🇳🇬','🇪🇬','🇸🇦','🇷🇸','🇨🇭','🇦🇹','🇩🇰','🇸🇪','🇳🇴','🇵🇱','🇨🇿'
  ];

  let submittedRevision = -1;
  const currentPlayer = () => state.online.players[state.online.turnIndex];

  const style = document.createElement('style');
  style.id = 'neonxi-online-v3-fix-style';
  style.textContent = `
    .og-grid.og-grid-v3{grid-template-columns:repeat(7,minmax(0,1fr))!important;max-height:310px;overflow-y:auto;overscroll-behavior:contain;padding:3px 3px 7px;scrollbar-width:thin}
    .og-grid-v3 .og-em{min-width:0;font-size:22px;cursor:pointer;touch-action:manipulation}
    .og-grid-v3 .og-em:disabled{opacity:.42;cursor:default}
    .og-emoji-note{text-align:center;color:#7da996;font-size:12px;margin:8px 0 2px;letter-spacing:.04em}
    @media(max-width:420px){.og-grid.og-grid-v3{grid-template-columns:repeat(6,minmax(0,1fr));max-height:285px}.og-grid-v3 .og-em{font-size:21px}}
  `;
  document.head.appendChild(style);

  function goVoting(){
    const o = state.online;
    Object.assign(o,{gamePhase:'voting',votes:{},voteCount:0,turnDeadline:0,myVoteSubmitted:false});
    o.voteRound = (+o.voteRound || 0) + 1;
    o.phaseRevision = (+o.phaseRevision || 0) + 1;
    submittedRevision = -1;
    broadcastLobbyState();
    state.screen = 'online-voting';
    render();
  }

  function hostEmojiSubmit(playerId,value){
    const o = state.online;
    if(!o.isHost || o.gamePhase !== 'emoji') return;
    const p = currentPlayer();
    if(!p || p.id !== playerId || !EMOJIS.includes(String(value))) return;

    o.responses = Array.isArray(o.responses) ? o.responses : [];
    o.responses.push({roundKey:'emoji',playerId:p.id,name:p.name,text:String(value),kind:'emoji'});

    if(o.turnIndex < o.players.length - 1){
      o.turnIndex++;
      o.turnDeadline = Date.now() + 15000;
      o.phaseRevision = (+o.phaseRevision || 0) + 1;
      submittedRevision = -1;
      broadcastLobbyState();
      render();
    } else {
      goVoting();
    }
  }

  function submitEmoji(value){
    const o = state.online;
    if(o.gamePhase !== 'emoji') return;
    const p = currentPlayer();
    if(!p || p.id !== o.myId || submittedRevision === o.phaseRevision) return;
    submittedRevision = o.phaseRevision;

    if(o.isHost){
      hostEmojiSubmit(o.myId,value);
    } else if(p2pHostConnection && p2pHostConnection.open){
      sendConn(p2pHostConnection,{type:'emoji-v3',value:String(value)});
    }
  }

  const previousBindHostConnection = bindHostConnection;
  bindHostConnection = conn => {
    previousBindHostConnection(conn);
    conn.on('data', msg => {
      if(msg && msg.type === 'emoji-v3' && conn.__neonPlayerId){
        hostEmojiSubmit(conn.__neonPlayerId,msg.value);
      }
    });
  };

  const previousDiscussion = renderOnlineDiscussion;
  renderOnlineDiscussion = app => {
    previousDiscussion(app);
    const o = state.online;
    if(o.gamePhase !== 'emoji') return;

    const p = currentPlayer();
    const grid = app.querySelector('.og-grid');
    if(!grid || !p || p.id !== o.myId) return;

    grid.classList.add('og-grid-v3');
    grid.innerHTML = '';
    const locked = submittedRevision === o.phaseRevision;

    EMOJIS.forEach(emoji => {
      const b = document.createElement('button');
      b.className = 'og-em';
      b.type = 'button';
      b.textContent = emoji;
      b.disabled = locked;
      b.setAttribute('aria-label','Emoji '+emoji);
      b.onclick = () => {
        if(submittedRevision === state.online.phaseRevision) return;
        grid.querySelectorAll('button').forEach(x=>x.disabled=true);
        submitEmoji(emoji);
      };
      grid.appendChild(b);
    });

    const note = document.createElement('div');
    note.className = 'og-emoji-note';
    note.textContent = 'Yalnızca 1 emoji seçebilirsin · ' + EMOJIS.length + ' seçenek';
    grid.parentElement && grid.parentElement.appendChild(note);
  };

  const previousApplyLobbyState = applyLobbyState;
  applyLobbyState = data => {
    const oldRevision = state.online.phaseRevision;
    const oldTurn = state.online.turnIndex;
    const oldPhase = state.online.gamePhase;
    previousApplyLobbyState(data);
    if(state.online.phaseRevision !== oldRevision || state.online.turnIndex !== oldTurn || state.online.gamePhase !== oldPhase){
      submittedRevision = -1;
    }
  };
})();
