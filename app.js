// Main application logic

function goToPage(pageId) {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  window.scrollTo(0, 0);
}

function switchTab(tabId) {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabBtns.forEach(btn => btn.classList.remove('active'));
  tabContents.forEach(content => content.classList.remove('active'));
  
  event.target.classList.add('active');
  document.getElementById(tabId).classList.add('active');
}

function addSongToPlaylist() {
  const source = document.getElementById('songSource').value;
  if (!source) return alert('Please enter a song');
  
  const playlistItems = document.getElementById('playlistItems');
  if (playlistItems.innerHTML.includes('No songs')) {
    playlistItems.innerHTML = '';
  }
  
  const item = document.createElement('div');
  item.className = 'player-item';
  item.innerHTML = `<span>${source}</span><button onclick="this.parentElement.remove()" class="btn btn-secondary" style="padding: 4px 8px; font-size: 12px;">Remove</button>`;
  playlistItems.appendChild(item);
  
  document.getElementById('songSource').value = '';
}

function generateAutoPlaylist() {
  const genre = document.getElementById('genreSelect').value;
  const rounds = document.getElementById('roundsInput').value;
  alert(`Generated ${rounds} songs from ${genre} genre!`);
}

function startGame() {
  alert('Game starting...');
}

function copyRoomCode() {
  const code = document.getElementById('displayRoomCode').textContent;
  navigator.clipboard.writeText(code);
  alert('Room code copied!');
}

function createDecorations() {
  const container = document.getElementById('decorations');
  if (!container) return;
  
  // Create floating leaves
  const leaves = ['🍂', '🍃', '🍁', '🌿'];
  for (let i = 0; i < 8; i++) {
    const leaf = document.createElement('div');
    leaf.className = 'floating-leaf';
    leaf.textContent = leaves[Math.floor(Math.random() * leaves.length)];
    leaf.style.left = Math.random() * 100 + '%';
    leaf.style.top = Math.random() * 100 + '%';
    leaf.style.animationDelay = Math.random() * 3 + 's';
    container.appendChild(leaf);
  }
  
  // Create sparkles
  for (let i = 0; i < 12; i++) {
    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle';
    sparkle.textContent = '✨';
    sparkle.style.left = Math.random() * 100 + '%';
    sparkle.style.top = Math.random() * 100 + '%';
    sparkle.style.animationDelay = Math.random() * 2 + 's';
    container.appendChild(sparkle);
  }
}

document.addEventListener('DOMContentLoaded', createDecorations);
