const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ============ GAME STATE MANAGEMENT ============
const rooms = new Map();
const players = new Map();

// Helper: Generate random 4-digit room code
function generateRoomCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// Helper: Get random items from array
function getRandomItems(arr, count) {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

// ============ DEEZER API - FETCH SONGS ============
async function fetchSongsFromDeezer(genre = 'pop', limit = 50) {
    try {
        const response = await axios.get(`https://api.deezer.com/search?q=${genre}&limit=${limit}`);
        const tracks = response.data.data || [];
        
        // Filter tracks with valid preview URLs
        return tracks
            .filter(track => track.preview && track.preview.length > 0)
            .map(track => ({
                id: track.id,
                title: track.title,
                artist: track.artist.name,
                preview: track.preview,
                album: track.album.title,
                cover: track.album.cover_medium
            }));
    } catch (error) {
        console.error('Deezer API Error:', error.message);
        return [];
    }
}

// ============ GAME LOGIC ============

class GameRoom {
    constructor(roomCode) {
        this.roomCode = roomCode;
        this.screenSocketId = null;
        this.players = new Map();
        this.currentQuestion = null;
        this.gameState = 'lobby'; // lobby, playing, revealing
        this.roundStartTime = null;
        this.playlist = [];
        this.currentRoundIndex = 0;
        this.answers = new Map();
        this.scores = new Map();
        this.leaderboard = [];
    }

    addPlayer(playerId, playerName, isController = true) {
        if (isController) {
            this.players.set(playerId, {
                id: playerId,
                name: playerName,
                score: 0,
                answered: false,
                answerTime: null
            });
            this.scores.set(playerId, 0);
        }
    }

    setScreen(screenSocketId) {
        this.screenSocketId = screenSocketId;
    }

    async generatePlaylist(genre = 'pop', rounds = 5) {
        console.log(`Fetching songs for genre: ${genre}, rounds: ${rounds}`);
        const songs = await fetchSongsFromDeezer(genre, rounds * 5);
        
        if (songs.length === 0) {
            console.error('No songs fetched from Deezer');
            return false;
        }

        this.playlist = getRandomItems(songs, rounds).map((song, idx) => ({
            ...song,
            correctAnswerIndex: Math.floor(Math.random() * 4),
            round: idx + 1
        }));

        // Generate 4-choice options for each question
        for (let i = 0; i < this.playlist.length; i++) {
            const correctSong = this.playlist[i];
            const options = [correctSong.title];
            
            // Get 3 random wrong answers from other songs
            const wrongSongs = songs.filter(s => s.id !== correctSong.id);
            const wrongTitles = getRandomItems(wrongSongs, 3).map(s => s.title);
            options.push(...wrongTitles);
            
            // Shuffle and assign
            const shuffledOptions = options.sort(() => Math.random() - 0.5);
            correctSong.options = shuffledOptions;
            correctSong.correctAnswerIndex = shuffledOptions.indexOf(correctSong.title);
        }

        return true;
    }

    startRound() {
        if (this.currentRoundIndex >= this.playlist.length) {
            this.gameState = 'finished';
            return false;
        }

        this.currentQuestion = this.playlist[this.currentRoundIndex];
        this.gameState = 'playing';
        this.roundStartTime = Date.now();
        this.answers.clear();
        
        // Reset answered flags
        for (let player of this.players.values()) {
            player.answered = false;
            player.answerTime = null;
        }

        return true;
    }

    submitAnswer(playerId, selectedOptionIndex) {
        if (this.gameState !== 'playing') return false;
        if (!this.players.has(playerId)) return false;

        const player = this.players.get(playerId);
        if (player.answered) return false; // Already answered

        const answerTime = Date.now() - this.roundStartTime;
        const isCorrect = selectedOptionIndex === this.currentQuestion.correctAnswerIndex;
        
        // Calculate points: 100 for correct, bonus for speed (max 50 bonus)
        let points = 0;
        if (isCorrect) {
            points = 100 + Math.max(0, 50 - Math.floor(answerTime / 400));
        }

        player.answered = true;
        player.answerTime = answerTime;
        player.score += points;
        this.scores.set(playerId, player.score);

        this.answers.set(playerId, {
            playerId,
            playerName: player.name,
            selectedOptionIndex,
            isCorrect,
            points,
            answerTime
        });

        return { isCorrect, points, answerTime };
    }

    getLeaderboard() {
        const leaderboardArray = Array.from(this.players.values())
            .map(p => ({
                name: p.name,
                score: p.score,
                answered: p.answered
            }))
            .sort((a, b) => b.score - a.score);
        
        return leaderboardArray;
    }

    nextRound() {
        this.currentRoundIndex++;
        if (this.currentRoundIndex < this.playlist.length) {
            return this.startRound();
        } else {
            this.gameState = 'finished';
            return false;
        }
    }
}

// ============ SOCKET.IO EVENTS ============

io.on('connection', (socket) => {
    console.log(`[Connection] Socket connected: ${socket.id}`);

    // SCREEN connects and creates a room
    socket.on('screen-connect', (callback) => {
        const roomCode = generateRoomCode();
        const room = new GameRoom(roomCode);
        room.setScreen(socket.id);
        rooms.set(roomCode, room);

        socket.join(roomCode);
        socket.roomCode = roomCode;

        console.log(`[Screen] Screen connected to room ${roomCode}`);
        callback({ roomCode });
    });

    // CONTROLLER joins with room code and player name
    socket.on('controller-join', (data, callback) => {
        const { roomCode, playerName } = data;

        if (!rooms.has(roomCode)) {
            return callback({ success: false, error: 'Room not found' });
        }

        const room = rooms.get(roomCode);
        room.addPlayer(socket.id, playerName, true);

        socket.join(roomCode);
        socket.roomCode = roomCode;
        socket.playerName = playerName;

        console.log(`[Controller] ${playerName} joined room ${roomCode}`);

        // Notify screen of new player
        io.to(roomCode).emit('player-joined', {
            playerId: socket.id,
            playerName: playerName,
            players: Array.from(room.players.values())
        });

        callback({ success: true, playerId: socket.id });
    });

    // HOST: Host can also join as a player
    socket.on('host-join-as-player', (data, callback) => {
        const { roomCode, playerName } = data;

        if (!rooms.has(roomCode)) {
            return callback({ success: false, error: 'Room not found' });
        }

        const room = rooms.get(roomCode);
        room.addPlayer(socket.id, playerName, true);

        socket.join(roomCode);
        socket.roomCode = roomCode;
        socket.playerName = playerName;

        console.log(`[Host Player] ${playerName} (host) joined as player in room ${roomCode}`);

        io.to(roomCode).emit('player-joined', {
            playerId: socket.id,
            playerName: playerName,
            players: Array.from(room.players.values())
        });

        callback({ success: true, playerId: socket.id });
    });

    // SCREEN: Request to generate playlist
    socket.on('generate-playlist', async (data, callback) => {
        const { genre = 'pop', rounds = 5 } = data;
        const room = rooms.get(socket.roomCode);

        if (!room) return callback({ success: false });

        const success = await room.generatePlaylist(genre, rounds);
        callback({ success });

        // Notify screen that playlist is ready
        io.to(socket.roomCode).emit('playlist-ready', {
            playlistLength: room.playlist.length
        });
    });

    // SCREEN: Start the game
    socket.on('start-game', (callback) => {
        const room = rooms.get(socket.roomCode);

        if (!room || room.playlist.length === 0) {
            return callback({ success: false, error: 'No playlist generated' });
        }

        room.startRound();

        io.to(socket.roomCode).emit('round-started', {
            question: {
                title: 'Which song is this?',
                options: room.currentQuestion.options,
                preview: room.currentQuestion.preview
            },
            roundNumber: room.currentRoundIndex + 1,
            totalRounds: room.playlist.length
        });

        callback({ success: true });
    });

    // CONTROLLER: Submit answer
    socket.on('submit-answer', (data, callback) => {
        const { selectedOptionIndex } = data;
        const room = rooms.get(socket.roomCode);

        if (!room) return callback({ success: false });

        const result = room.submitAnswer(socket.id, selectedOptionIndex);

        if (!result) {
            return callback({ success: false, error: 'Invalid answer submission' });
        }

        // Send feedback to controller
        callback({
            success: true,
            isCorrect: result.isCorrect,
            points: result.points,
            answerTime: result.answerTime
        });

        // Update leaderboard on screen
        io.to(socket.roomCode).emit('leaderboard-update', {
            leaderboard: room.getLeaderboard(),
            answeredCount: room.answers.size
        });
    });

    // SCREEN: Reveal answer
    socket.on('reveal-answer', (callback) => {
        const room = rooms.get(socket.roomCode);

        if (!room) return callback({ success: false });

        room.gameState = 'revealing';

        io.to(socket.roomCode).emit('answer-revealed', {
            correctAnswer: room.currentQuestion.title,
            correctAnswerIndex: room.currentQuestion.correctAnswerIndex,
            correctArtist: room.currentQuestion.artist,
            answers: Array.from(room.answers.values()),
            leaderboard: room.getLeaderboard()
        });

        callback({ success: true });
    });

    // SCREEN: Next round
    socket.on('next-round', (callback) => {
        const room = rooms.get(socket.roomCode);

        if (!room) return callback({ success: false });

        const hasMore = room.nextRound();

        if (hasMore) {
            io.to(socket.roomCode).emit('round-started', {
                question: {
                    title: 'Which song is this?',
                    options: room.currentQuestion.options,
                    preview: room.currentQuestion.preview
                },
                roundNumber: room.currentRoundIndex + 1,
                totalRounds: room.playlist.length
            });
            callback({ success: true, hasMore: true });
        } else {
            io.to(socket.roomCode).emit('game-finished', {
                leaderboard: room.getLeaderboard()
            });
            callback({ success: true, hasMore: false });
        }
    });

    // SCREEN: End game
    socket.on('end-game', (callback) => {
        const room = rooms.get(socket.roomCode);

        if (room) {
            room.gameState = 'ended';
            io.to(socket.roomCode).emit('game-ended');
        }

        callback({ success: true });
    });

    // Disconnect handler
    socket.on('disconnect', () => {
        const room = rooms.get(socket.roomCode);

        if (room) {
            if (room.screenSocketId === socket.id) {
                console.log(`[Screen] Screen disconnected from room ${socket.roomCode}`);
                io.to(socket.roomCode).emit('screen-disconnected');
                rooms.delete(socket.roomCode);
            } else if (room.players.has(socket.id)) {
                const playerName = socket.playerName || 'Unknown';
                console.log(`[Controller] ${playerName} left room ${socket.roomCode}`);
                room.players.delete(socket.id);
                room.scores.delete(socket.id);

                io.to(socket.roomCode).emit('player-left', {
                    playerId: socket.id,
                    playerName: playerName,
                    players: Array.from(room.players.values())
                });
            }
        }

        console.log(`[Disconnect] Socket disconnected: ${socket.id}`);
    });
});

// ============ ROUTES ============

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/rooms', (req, res) => {
    const roomsList = Array.from(rooms.entries()).map(([code, room]) => ({
        roomCode: code,
        playerCount: room.players.size,
        gameState: room.gameState,
        playlistLength: room.playlist.length
    }));
    res.json(roomsList);
});

// ============ START SERVER ============

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   🎵 MUSIC GUESS PARTY SERVER 🎵      ║
║   Port: ${PORT}                              ║
║   Env: ${process.env.NODE_ENV || 'development'}             ║
╚════════════════════════════════════════╝
    `);
    console.log(`📱 Controller: http://localhost:${PORT}/controller.html`);
    console.log(`📺 Screen: http://localhost:${PORT}/screen.html`);
});
