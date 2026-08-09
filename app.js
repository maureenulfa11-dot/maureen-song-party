// app.js — client-side Supabase-powered game logic for host and players
(async function(){
  const env = window.SUPABASE_ENV || {};
  if(!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY){
    console.warn('SUPABASE_ENV not configured. Copy env.example.js -> env.js and set your keys. The app will still render UI but realtime will not work.');
  }

  const supabase = (window.supabase && env.SUPABASE_URL && env.SUPABASE_ANON_KEY)
    ? supabase.createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
    : null;

  function makeCode(){ return Math.random().toString(36).substr(2,6).toUpperCase() }
  function uid(){ return (crypto && crypto.randomUUID)?crypto.randomUUID():('id_'+Date.now()+'_'+Math.floor(Math.random()*10000)) }
  function setQR(el, url){ if(!el) return; el.innerHTML = '<img src="https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl='+encodeURIComponent(url)+'" alt="QR" />' }

  // --- Index page wiring ---
  const btnHost = document.getElementById('btn-host');
  const btnJoin = document.getElementById('btn-join');
  const selMode = document.getElementById('select-mode');
  const liveQR = document.getElementById('live-qr');

  if(btnHost){
    btnHost.addEventListener('click', async ()=>{
      const code = makeCode();
      const mode = selMode ? selMode.value : 'guess';
      if(supabase){
        // create room row
        await supabase.from('rooms').insert([{id:code, owner:'host', mode}]);
      }
      // navigate to host page using URL constructor to respect subpaths
      window.location.href = new URL('host.html?room=' + encodeURIComponent(code), window.location.href).href;
    })
  }

  if(btnJoin){
    btnJoin.addEventListener('click', ()=>{
      const code = prompt('Enter room code to join');
      if(!code) return;
      window.location.href = new URL('play.html?room=' + encodeURIComponent(code.trim().toUpperCase()), window.location.href).href;
    })
  }

  // show a live QR for the index page (join link)
  if(liveQR){
    const url = new URL(window.location.href);
    url.pathname = url.pathname; // keep current base
    url.search = '?room=' + (new URLSearchParams(location.search).get('room') || '');
    setQR(liveQR, new URL('play.html' + url.search, window.location.href).href);
  }

  // --- Host page ---
  const roomParam = new URLSearchParams(location.search).get('room');
  if(document.body.matches('.host-page')){
    const room = roomParam;
    const roomCodeEl = document.getElementById('room-code');
    const playersList = document.getElementById('players-list');
    const btnStart = document.getElementById('btn-start-game');
    const btnNext = document.getElementById('btn-next-round');
    const qrarea = document.getElementById('qr-area');
    const hostMusic = document.getElementById('host-music');
    const roundPanel = document.getElementById('round-panel');
    const leaderboardEl = document.getElementById('leaderboard');

    if(roomCodeEl) roomCodeEl.textContent = room || '----';
    if(qrarea) setQR(qrarea, new URL('play.html?room='+encodeURIComponent(room), window.location.href).href);

    let myHostId = uid();

    async function refreshPlayers(){
      if(!supabase) return;
      const {data} = await supabase.from('players').select('*').eq('room_id', room).order('joined_at', {ascending:true});
      renderPlayers(data || []);
    }

    function renderPlayers(players){
      if(!playersList) return;
      playersList.innerHTML = '';
      if(!players || !players.length){ playersList.innerHTML = ''; return }
      players.forEach(p=>{
        const li = document.createElement('li');
        li.textContent = p.name || 'Player';
        const score = document.createElement('span'); score.textContent = (p.score || 0) + ' pts';
        li.appendChild(score);
        playersList.appendChild(li);
      })
      renderLeaderboard(players);
      updatePlayerCount(players.length);
    }

    function updatePlayerCount(count){
      const countEl = document.getElementById('player-count');
      if(countEl) countEl.textContent = count;
    }

    function renderLeaderboard(players){
      if(!leaderboardEl) return;
      const sorted = (players||[]).slice().sort((a,b)=> (b.score||0)-(a.score||0));
      leaderboardEl.innerHTML = '<h3>Leaderboard</h3>' + (sorted.map((p,i)=>`<div>${i+1}. ${p.name} — ${p.score||0}</div>`).join(''));
    }

    // subscribe to players changes
    if(supabase){
      // initial refresh
      refreshPlayers();
      supabase.channel('public:players')
        .on('postgres_changes', {event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${room}`}, payload=>{
          refreshPlayers();
        }).subscribe();
    }

    // Start Game: create a first round and mark room started
    if(btnStart){
      btnStart.addEventListener('click', async ()=>{
        if(!supabase){ alert('Supabase not configured — the UI will still run locally but multiplayer requires Supabase keys.'); return }
        // pick a demo round from musicLibrary if available
        let pick = null;
        try{ if(window.musicLibrary && musicLibrary.quickCreate) pick = musicLibrary.quickCreate(); }catch(e){}
        const round = {
          id: 'r_'+Date.now(),
          room_id: room,
          round_index: 1,
          question: (pick && pick.title) ? ('Guess: '+pick.title) : 'Guess the song',
          choices: JSON.stringify(["A","B","C","D"]),
          correct_choice: 'A',
          youtube_id: (pick && pick.youtubeId)?pick.youtubeId: (pick && pick.youtubeId)||'3JZ4pnNtyxQ'
        };
        await supabase.from('rounds').insert([round]);
        await supabase.from('rooms').update({started:true,current_round:round.id}).eq('id',room);
        // show host music
        hostMusic.innerHTML = `<iframe src="https://www.youtube.com/embed/${round.youtube_id}?rel=0&autoplay=1&controls=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
        roundPanel.innerHTML = `<div><strong>Round 1</strong><div>${round.question}</div><div><button id=btn-reveal class='btn btn-primary'>Reveal Answer</button></div></div>`;

        document.getElementById('btn-reveal').addEventListener('click', async ()=>{
          // compute answers and update scores
          const {data:answers} = await supabase.from('answers').select('*').eq('round_id', round.id);
          if(answers && answers.length){
            // group correct answers by player
            const correctAnswers = answers.filter(a=>a.choice === round.correct_choice && !a.is_correct);
            const byPlayer = {};
            correctAnswers.forEach(a=>{ byPlayer[a.player_id] = (byPlayer[a.player_id]||0) + 1 });
            // for each player, fetch current score and update
            for(const playerId of Object.keys(byPlayer)){
              // fetch current score
              const {data:playersRows} = await supabase.from('players').select('score').eq('id', playerId).limit(1);
              const current = (playersRows && playersRows[0] && playersRows[0].score) ? playersRows[0].score : 0;
              const newScore = current + 100 * byPlayer[playerId];
              await supabase.from('players').update({score:newScore}).eq('id', playerId);
            }
            // mark answers as processed
            for(const a of correctAnswers){
              await supabase.from('answers').update({is_correct:true}).eq('id', a.id);
            }
          }
        })
      })
    }

    // Next round: simple demo increments index and creates new round
    if(btnNext){ btnNext.addEventListener('click', async ()=>{
      if(!supabase){ alert('Supabase not configured'); return }
      const {data:existing} = await supabase.from('rounds').select('*').eq('room_id',room).order('round_index',{ascending:false}).limit(1);
      const nextIndex = existing && existing[0] ? existing[0].round_index+1 : 1;
      // create demo round
      let pick = null;
      try{ if(window.musicLibrary && musicLibrary.quickCreate) pick = musicLibrary.quickCreate(); }catch(e){}
      const round = {
        id: 'r_'+Date.now(),
        room_id: room,
        round_index: nextIndex,
        question: (pick && pick.title) ? ('Guess: '+pick.title) : 'Guess the song',
        choices: JSON.stringify(["A","B","C","D"]),
        correct_choice: 'A',
        youtube_id: (pick && pick.youtubeId)?pick.youtubeId:'3JZ4pnNtyxQ'
      };
      await supabase.from('rounds').insert([round]);
      await supabase.from('rooms').update({current_round:round.id}).eq('id',room);
      hostMusic.innerHTML = `<iframe src="https://www.youtube.com/embed/${round.youtube_id}?rel=0&autoplay=1&controls=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
      roundPanel.innerHTML = `<div><strong>Round ${nextIndex}</strong><div>${round.question}</div><div><button id=btn-reveal class='btn btn-primary'>Reveal Answer</button></div></div>`;
    })}

    // subscribe to rounds to show current question and update leaderboard when players change
    if(supabase){
      supabase.channel('public:rooms')
        .on('postgres_changes', {event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${room}`}, async payload=>{
          // when room.current_round changes, update roundPanel
          const roomRow = (await supabase.from('rooms').select('*').eq('id',room).single()).data;
          if(roomRow && roomRow.current_round){
            const {data:round} = await supabase.from('rounds').select('*').eq('id',roomRow.current_round).single();
            if(round){
              roundPanel.innerHTML = `<div><strong>Round ${round.round_index}</strong><div>${round.question}</div><div><button id=btn-reveal class='btn btn-primary'>Reveal Answer</button></div></div>`;
              document.getElementById('btn-reveal').addEventListener('click', async ()=>{
                const {data:answers} = await supabase.from('answers').select('*').eq('round_id', round.id);
                if(answers && answers.length){
                  const correctAnswers = answers.filter(a=>a.choice === round.correct_choice && !a.is_correct);
                  const byPlayer = {};
                  correctAnswers.forEach(a=>{ byPlayer[a.player_id] = (byPlayer[a.player_id]||0) + 1 });
                  for(const playerId of Object.keys(byPlayer)){
                    const {data:playersRows} = await supabase.from('players').select('score').eq('id', playerId).limit(1);
                    const current = (playersRows && playersRows[0] && playersRows[0].score) ? playersRows[0].score : 0;
                    const newScore = current + 100 * byPlayer[playerId];
                    await supabase.from('players').update({score:newScore}).eq('id', playerId);
                  }
                  for(const a of correctAnswers){
                    await supabase.from('answers').update({is_correct:true}).eq('id', a.id);
                  }
                }
              })
              // set host music iframe
              hostMusic.innerHTML = `<iframe src="https://www.youtube.com/embed/${round.youtube_id}?rel=0&autoplay=1&controls=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
            }
          }
        }).subscribe();
    }

    // refresh leaderboard periodically
    setInterval(refreshPlayers, 2500);
  }

  // --- Player page ---
  if(document.body.matches('.player-page')){
    const joinPanel = document.getElementById('join-panel');
    const nickInput = document.getElementById('nick');
    const roomInput = document.getElementById('join-room');
    const btnJoinRoom = document.getElementById('btn-join-room');
    const btnQr = document.getElementById('btn-qr-scan');
    const waiting = document.getElementById('waiting');
    const questionCard = document.getElementById('question-card');
    const questionText = document.getElementById('question-text');
    const choicesEl = document.getElementById('choices');
    const playerLeaderboard = document.getElementById('player-leaderboard');
    const playerLeaderboardLive = document.getElementById('player-leaderboard-live');
    const playerRoomTitle = document.getElementById('player-room');

    const presetRoom = roomParam;
    if(presetRoom) roomInput.value = presetRoom;

    let myPlayerId = null;
    let myRoom = null;
    let hasAnswered = false;

    btnJoinRoom.addEventListener('click', async ()=>{
      const nick = (nickInput.value||'').trim() || ('Player'+Math.floor(Math.random()*1000));
      const room = (roomInput.value||'').trim().toUpperCase();
      if(!room){ alert('Enter room code'); return }
      myRoom = room;
      // create player row
      myPlayerId = uid();
      if(supabase){
        await supabase.from('players').insert([{id:myPlayerId, room_id:room, name:nick, score:0}]);
      }
      joinPanel.classList.add('hidden');
      waiting.classList.remove('hidden');
      playerRoomTitle.textContent = '🎵 Room ' + room;

      // subscribe to rounds and players for this room
      if(supabase){
        // watch rounds for this room
        supabase.channel('player:rounds')
          .on('postgres_changes', {event: '*', schema: 'public', table: 'rounds', filter: `room_id=eq.${room}`}, payload=>{
            // when rounds change, pick latest round and show
            showLatestRound(room);
          }).subscribe();

        // also watch rooms.started or current_round
        supabase.channel('player:rooms')
          .on('postgres_changes', {event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${room}`}, payload=>{
            const newRoom = payload.new || payload.record || payload;
            if(newRoom && newRoom.current_round){ showLatestRound(room); }
          }).subscribe();

        // watch players to update leaderboard on player join/score
        supabase.channel('player:players')
          .on('postgres_changes', {event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${room}`}, payload=>{
            refreshLeaderboard(room);
          }).subscribe();
      }

      // initial show
      showLatestRound(room);
      refreshLeaderboard(room);
    });

    async function showLatestRound(room){
      if(!supabase) return;
      // fetch room to get current_round
      const {data:roomRow} = await supabase.from('rooms').select('*').eq('id',room).single();
      if(!roomRow || !roomRow.current_round){ return }
      const {data:round} = await supabase.from('rounds').select('*').eq('id',roomRow.current_round).single();
      if(!round) return;
      waiting.classList.add('hidden');
      questionCard.classList.remove('hidden');
      hasAnswered = false;
      questionText.textContent = round.question || 'Question';
      // choices
      let choices = [];
      try{ choices = JSON.parse(round.choices) }catch(e){ choices = ['A','B','C','D'] }
      choicesEl.innerHTML = '';
      choices.forEach(c=>{
        const b = document.createElement('div'); b.className = 'choice'; b.textContent = c;
        b.addEventListener('click', async ()=>{
          if(hasAnswered) return; hasAnswered = true; b.classList.add('disabled');
          // submit answer
          if(supabase){
            await supabase.from('answers').insert([{id: 'a_'+Date.now()+'_'+Math.floor(Math.random()*1000), round_id: round.id, player_id: myPlayerId, choice: c}]);
          }
        })
        choicesEl.appendChild(b);
      })
    }

    async function refreshLeaderboard(room){
      if(!supabase) return;
      const {data:players} = await supabase.from('players').select('*').eq('room_id',room).order('score',{ascending:false});
      if(!players) return;
      const leaderboardHTML = '<h3>Leaderboard</h3>' + players.map(p=>`<div>${p.name} — ${p.score||0}</div>`).join('');
      if(playerLeaderboard) playerLeaderboard.innerHTML = leaderboardHTML;
      if(playerLeaderboardLive) playerLeaderboardLive.innerHTML = leaderboardHTML;
    }

    btnQr.addEventListener('click', ()=>{
      const room = roomInput.value.trim().toUpperCase();
      if(!room) return alert('Enter room code to show QR');
      const url = new URL('play.html?room='+encodeURIComponent(room), window.location.href).href;
      const w = window.open('','QR','width=260,height=300');
      w.document.body.innerHTML = `<img src="https://chart.googleapis.com/chart?chs=260x260&cht=qr&chl=${encodeURIComponent(url)}"/>`;
    })
  }

})();
