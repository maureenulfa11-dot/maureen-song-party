// app.js — handles routing and overlays, uses mock images as backgrounds

(function(){
  // utility
  function qs(id){return document.getElementById(id)}
  function makeCode(){return Math.random().toString(36).substr(2,6).toUpperCase()}
  function setQR(imgEl, url){
    if(!imgEl) return
    var encoded = encodeURIComponent(url)
    // use Google Chart API to generate QR
    imgEl.src = 'https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl='+encoded
  }

  // read room param
  var params = new URLSearchParams(location.search)
  var room = params.get('room')
  var isHost = location.pathname.endsWith('host.html')
  var isComposer = location.pathname.endsWith('composer.html')
  var isHome = location.pathname.endsWith('index.html') || location.pathname.endsWith('/')
  var isPlay = location.pathname.endsWith('play.html')

  if(isHome){
    var start = qs('start-hosting')
    var joinBtn = qs('join-btn')
    var joinInput = qs('join-code')
    var qr = qs('qr-img')

    var currentRoom = localStorage.getItem('lastRoom') || makeCode()
    setQR(qr, location.origin + '/play.html?room=' + currentRoom)

    start.addEventListener('click', function(){
      var code = makeCode()
      localStorage.setItem('lastRoom', code)
      // create minimal room state locally (Supabase hook would be here)
      localStorage.setItem('room:' + code, JSON.stringify({players:[],songs:[]}))
      location.href = 'host.html?room=' + code
    })

    joinBtn.addEventListener('click', function(){
      var code = joinInput.value.trim().toUpperCase()
      if(!code) return alert('Enter a room code')
      // navigate to player page
      location.href = 'play.html?room=' + code
    })
  }

  if(isComposer){
    var list = qs('created-list')
    var qc = qs('quick-create')
    qc.addEventListener('click', function(){
      var song = musicLibrary.quickCreate()
      // save to local library for demo
      var lib = JSON.parse(localStorage.getItem('library')||'[]')
      lib.push(song)
      localStorage.setItem('library', JSON.stringify(lib))
      renderList()
    })
    function renderList(){
      var lib = JSON.parse(localStorage.getItem('library')||'[]')
      list.innerHTML = lib.map((s,i)=>`<div class="player-card">${i+1}. ${s.title} — <small>${s.artist}</small></div>`).join('')
    }
    renderList()
  }

  if(isHost){
    var code = params.get('room') || localStorage.getItem('lastRoom') || makeCode()
    qs('room-code').textContent = code
    qs('lobby-qr').src = ''
    setQR(qs('lobby-qr'), location.origin + '/play.html?room=' + code)

    qs('copy-code').addEventListener('click', function(){
      navigator.clipboard.writeText(code).then(()=>alert('Copied'))
    })

    qs('start-game').addEventListener('click', function(){
      // mark game started in localStorage state
      var state = JSON.parse(localStorage.getItem('room:' + code) || '{}')
      state.started = true
      localStorage.setItem('room:' + code, JSON.stringify(state))
      // show host player (YouTube) and navigate to game view
      startHostGameUI(code)
    })

    function startHostGameUI(code){
      // show host player container
      var player = qs('host-player')
      player.classList.remove('hidden')
      // pick a sample youtube id from musicLibrary
      var lib = JSON.parse(localStorage.getItem('library')||'[]')
      var pick = (lib[0] && lib[0].youtubeId) || musicLibrary.sampleYouTubeId()
      qs('yt-iframe').src = 'https://www.youtube.com/embed/' + pick + '?rel=0&autoplay=1&controls=1'
      // swap background to host-game mockup for host
      document.body.className = 'host-game-bg'
      // (players will be on play.html and won't hear music)
    }

    // if arrived already with ?game=1 start immediately
    if(params.get('game')) startHostGameUI(code)
  }

  if(isPlay){
    var code = params.get('room') || 'UNKNOWN'
    qs('player-room').textContent = 'Room ' + code
    // player should NOT hear music — we won't load YouTube iframe here

    qs('ready-btn').addEventListener('click', function(){
      alert('Ready! Waiting for host...')
      // In real app we'd notify Supabase realtime here
    })
  }

})();
