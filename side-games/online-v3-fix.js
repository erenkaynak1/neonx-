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

  let pendingToken = '';
  let retryTimer = null;
  const currentPlayer = () => state.online.players[state.online.turnIndex];
  const turnToken = () => {
    const o = state.online;
    const p = currentPlayer();
    return [o.round,o.gamePhase,o.turnIndex,o.phaseRevision,p?.id||''].join(':');
  };

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

  function clearPending(){
    pendingToken='';
    if(retryTimer){clearTimeout(retryTimer);retryTimer=null;}
  }

  function goVoting(){
    const o = state.online;
    Object.assign(o,{gamePhase:'voting',votes:{},voteCount:0,turnDeadline:0,myVoteSubmitted:false});
    o.voteRound = (+o.voteRound || 0) + 1;
    o.phaseRevision = (+o.phaseRevision || 0) + 1;
    clearPending();
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
      clearPending();
      broadcastLobbyState();
      render();
    } else {
      goVoting();
    }
  }

  function submitEmoji(value,grid){
    const o = state.online;
    if(o.gamePhase !== 'emoji') return;
    const p = currentPlayer();
    if(!p || p.id !== o.myId) return;

    const token = turnToken();
    pendingToken = token;

    if(o.isHost){
      hostEmojiSubmit(o.myId,value);
      return;
    }

    if(p2pHostConnection && p2pHostConnection.open){
      sendConn(p2pHostConnection,{type:'emoji-v3',value:String(value),turnToken:token});
    }

    if(retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(()=>{
      const now = turnToken();
      if(now===token && state.online.gamePhase==='emoji' && currentPlayer()?.id===state.online.myId){
        pendingToken='';
        grid?.querySelectorAll('button').forEach(x=>x.disabled=false);
      }
      retryTimer=null;
    },1200);
  }

  function attachEmojiListener(conn){
    if(!conn || conn.__neonEmojiV3Bound) return;
    conn.__neonEmojiV3Bound = true;
    conn.on('data', msg => {
      if(msg && msg.type === 'emoji-v3' && conn.__neonPlayerId){
        hostEmojiSubmit(conn.__neonPlayerId,msg.value);
      }
    });
  }

  const previousBindHostConnection = bindHostConnection;
  bindHostConnection = conn => {
    previousBindHostConnection(conn);
    attachEmojiListener(conn);
  };

  try{
    p2pHostConnections?.forEach?.(attachEmojiListener);
  }catch(e){}

  const previousDiscussion = renderOnlineDiscussion;
  renderOnlineDiscussion = app => {
    previousDiscussion(app);
    const o = state.online;
    if(o.gamePhase !== 'emoji') return;

    const p = currentPlayer();
    const grid = app.querySelector('.og-grid');
    if(!grid || !p || p.id !== o.myId) return;

    const token = turnToken();
    if(pendingToken && pendingToken !== token) clearPending();

    grid.classList.add('og-grid-v3');
    grid.innerHTML = '';

    EMOJIS.forEach(emoji => {
      const b = document.createElement('button');
      b.className = 'og-em';
      b.type = 'button';
      b.textContent = emoji;
      b.disabled = false;
      b.setAttribute('aria-label','Emoji '+emoji);
      b.onclick = () => {
        if(state.online.gamePhase!=='emoji' || currentPlayer()?.id!==state.online.myId) return;
        grid.querySelectorAll('button').forEach(x=>x.disabled=true);
        submitEmoji(emoji,grid);
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
    const oldToken = turnToken();
    previousApplyLobbyState(data);
    const newToken = turnToken();
    if(newToken !== oldToken) clearPending();
  };
})();
