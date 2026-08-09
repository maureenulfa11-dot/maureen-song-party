// app.js — Artboard hotspot wiring and overlays (updated QR generation to use relative URL for GitHub Pages)
(function(){
  function qs(id){return document.getElementById(id)}
  function makeCode(){return Math.random().toString(36).substr(2,6).toUpperCase()}
  function setQR(imgEl, url){ if(!imgEl) return; imgEl.src = 'https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl='+encodeURIComponent(url) }

  // Home artboard
  var hotStart = qs('hot-start-hosting')
  var hotJoinQR = qs('hot-join-qr')
  var hotFill = qs('hot-fill-card')
  var hotGuess = qs('hot-guess-card')

  if(hotStart){
    hotStart.addEventListener('click', function(){
      var code = makeCode()
      localStorage.setItem('lastRoom', code)
      localStorage.setItem('room:'+code, JSON.stringify({players:[],songs:[]}))
      location.href = 'host.html?room='+code
    })
  }

  if(hotJoinQR){
    hotJoinQR.addEventListener('click', function(){
      // no visible input on artboard — use a prompt to enter the room code
      var code = prompt('Enter room code to join')
      if(!code) return
      code = code.trim().toUpperCase()
      if(code) location.href = 'play.html?room='+code
    })
  }

  if(hotFill){ hotFill.addEventListener('click', function(){ location.href = 'composer.html?mode=fill' }) }
  if(hotGuess){ hotGuess.addEventListener('click', function(){ location.href = 'composer.html?mode=guess' }) }

  // Composer artboard wiring
  var hotTabFill = qs('hot-tab-fill')
  var hotTabGuess = qs('hot-tab-guess')
  var inputSource = qs('input-song-source')
  var selGenre = qs('select-genre')
  var selBlanks = qs('select-blanks')
  var hotAutoCreate = qs('hot-auto-create')
  var hotSaveRound = qs('hot-save-round')

  if(hotTabFill) hotTabFill.addEventListener('click', function(){ location.search = '?mode=fill' })
  if(hotTabGuess) hotTabGuess.addEventListener('click', function(){ location.search = '?mode=guess' })

  if(hotAutoCreate){
    hotAutoCreate.addEventListener('click', function(){
      // create a quick round and store locally
      var song = musicLibrary.quickCreate()
      song.mode = (new URLSearchParams(location.search).get('mode'))||'fill'
      song.genre = selGenre ? selGenre.value : 'pop'
      song.source = inputSource ? inputSource.value : ''
      var rounds = JSON.parse(localStorage.getItem('rounds')||'[]')
      rounds.push(song)
      localStorage.setItem('rounds', JSON.stringify(rounds))
      alert('Round created')
    })
  }

  if(hotSaveRound){
    hotSaveRound.addEventListener('click', function(){
      var song = {
        id: 'r'+Date.now(),
        title: inputSource && inputSource.value ? inputSource.value : 'New Round',
        artist: 'Composer',
        mode: new URLSearchParams(location.search).get('mode')||'fill',
        genre: selGenre?selGenre.value:'pop'
      }
      var rounds = JSON.parse(localStorage.getItem('rounds')||'[]')
      rounds.push(song)
      localStorage.setItem('rounds', JSON.stringify(rounds))
      alert('Saved')
    })
  }

  // Host lobby wiring
  var hostImg = qs('host-img')
  var roomCodeText = qs('room-code-text')
  var hostQR = qs('host-qr')
  var playersArea = qs('players-area')
  var hotStartGame = qs('hot-start-game')
  var hostYTContainer = qs('host-yt-container')
  var hostYT = qs('host-yt')

  if(hostImg){
    // if there is a room param show it
    var params = new URLSearchParams(location.search)
    var room = params.get('room')
    if(room){
      if(roomCodeText) roomCodeText.textContent = room
      if(hostQR){
        // Use a relative URL for the QR so GitHub Pages hosting path works correctly
        var playUrl = new URL('play.html?room=' + encodeURIComponent(room), window.location.href).href
        setQR(hostQR, playUrl)
      }
      // render players if any
      var state = JSON.parse(localStorage.getItem('room:'+room) || '{}')
      if(state.players && state.players.length){
        playersArea.innerHTML = state.players.map(function(p){ return '<div style="padding:6px 0">'+(p.name||'Player')+'</div>'}).join('')
      } else {
        playersArea.innerHTML = '<div style="opacity:0.8">No players yet</div>'
      }
    }

    if(hotStartGame){
      hotStartGame.addEventListener('click', function(){
        // mark started and go to game artboard (swap image and show host player)
        if(room) {
          var state = JSON.parse(localStorage.getItem('room:'+room) || '{}')
          state.started = true
          localStorage.setItem('room:'+room, JSON.stringify(state))
        }
        // swap the artboard image to the host game mockup
        hostImg.src = 'IMG_8338.jpeg'
        // show the host youtube container inside the music player area
        hostYTContainer.style.display = 'block'
        var pick = (JSON.parse(localStorage.getItem('rounds')||'[]')[0]||{}).youtubeId || musicLibrary.sampleYouTubeId()
        hostYT.src = 'https://www.youtube.com/embed/' + pick + '?rel=0&autoplay=1&controls=1'
      })
    }
  }

  // Player page wiring
  var playerRoomText = qs('player-room-text')
  var questionArea = qs('question-area')
  var leaderboardArea = qs('leaderboard-area')
  var phonePreview = qs('phone-preview')
  var hotPause = qs('hot-pause')
  var hotEndRound = qs('hot-end-round')

  if(playerRoomText){
    var params = new URLSearchParams(location.search)
    var room = params.get('room') || '---'
    playerRoomText.textContent = 'Room ' + room
    // show a placeholder question and leaderboard from localStorage state if present
    var rounds = JSON.parse(localStorage.getItem('rounds')||'[]')
    questionArea.textContent = rounds[0] ? (rounds[0].title + ' — ' + (rounds[0].artist||'')) : 'Waiting for host to start the round...'
    var players = (JSON.parse(localStorage.getItem('room:'+room) || '{}').players) || []
    leaderboardArea.innerHTML = players.length ? players.map(function(p,i){return '<div style="padding:6px 8px">'+(i+1)+'. '+(p.name||'Player')+'</div>'}).join('') : '<div style="opacity:0.8">No scores yet</div>'
    phonePreview.textContent = 'Your phone preview'

    if(hotPause) hotPause.addEventListener('click', function(){ alert('Pause pressed (host only)') })
    if(hotEndRound) hotEndRound.addEventListener('click', function(){ alert('End Round pressed (host only)') })
  }

})();
