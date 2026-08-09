# 🎵 Music Guess Party - Setup & Deployment Guide

## Local Development Setup

### Prerequisites
- Node.js 14+ installed
- npm or yarn
- A modern browser (Chrome, Firefox, Safari, or Edge)
- Local network access (for phones to connect)

### Step 1: Install Dependencies

```bash
npm install
```

This installs:
- `express` - Web server
- `socket.io` - Real-time WebSocket library
- `axios` - HTTP client for Deezer API
- `cors` - Cross-origin resource sharing
- `nodemon` (dev) - Auto-restart on file changes

### Step 2: Start the Server

```bash
npm start
```

You should see:
```
╔════════════════════════════════════════╗
║   🎵 MUSIC GUESS PARTY SERVER 🎵      ║
║   Port: 3000                           ║
║   Env: development                     ║
╚════════════════════════════════════════╝
📱 Controller: http://localhost:3000/controller.html
📺 Screen: http://localhost:3000/screen.html
```

### Step 3: Access the Game

#### On Desktop (Main Screen)
Open in your browser:
```
http://localhost:3000/screen.html
```

#### On Smartphone (Player Controller)
On the same network, open:
```
http://<your-computer-ip>:3000/controller.html
```

**Finding your computer's IP:**
- **macOS/Linux**: `ifconfig | grep inet`
- **Windows**: `ipconfig` → Look for "IPv4 Address"
- **Easiest**: Check your router's connected devices

---

## Deployment Options

### Option 1: Heroku (Recommended for Beginners)

**Cost**: Free tier available (may sleep after 30 mins of inactivity)

#### Step 1: Create Heroku Account
Go to [heroku.com](https://www.heroku.com) and sign up

#### Step 2: Install Heroku CLI
```bash
# macOS
brew tap heroku/brew && brew install heroku

# Windows (via npm)
npm install -g heroku

# Linux
curl https://cli-assets.heroku.com/install.sh | sh
```

#### Step 3: Login to Heroku
```bash
heroku login
```

#### Step 4: Create & Deploy
```bash
# Initialize git if not already
git init

# Create a Heroku app
heroku create your-music-guess-app

# Set buildpack
heroku buildpacks:set heroku/nodejs

# Deploy
git push heroku main
```

#### Step 5: Access Your App
```
https://your-music-guess-app.herokuapp.com/screen.html
https://your-music-guess-app.herokuapp.com/controller.html
```

#### Enable Dyno for Always-On (Optional)
```bash
heroku dyno:resize standard-1x
```

---

### Option 2: Render (Free, Better Uptime)

**Cost**: Free tier with generous limits

#### Step 1: Connect GitHub
1. Push your code to GitHub
2. Go to [render.com](https://render.com)
3. Click "New +" → "Web Service"
4. Connect your GitHub repository

#### Step 2: Configure Render
- **Name**: `music-guess-party`
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Free Plan**: ✅ Selected

#### Step 3: Deploy
Click "Create Web Service" and wait for deployment

#### Access Your App
```
https://music-guess-party.onrender.com/screen.html
https://music-guess-party.onrender.com/controller.html
```

---

### Option 3: Railway (Fast, Easy)

**Cost**: Free credits included

#### Step 1: Sign Up
Go to [railway.app](https://railway.app) and connect GitHub

#### Step 2: New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Select this repository

#### Step 3: Add Environment Variables (if needed)
No special variables needed! Railway auto-detects Node.js

#### Step 4: Deploy
Railway auto-deploys on every push to `main`

#### Access Your App
```
https://<your-project-name>.railway.app/screen.html
```

---

### Option 4: DigitalOcean App Platform (Premium)

**Cost**: Starting $5/month

#### Step 1: Create DigitalOcean Account
Go to [digitalocean.com](https://digitalocean.com)

#### Step 2: Create App
1. Click "Create" → "Apps"
2. Connect GitHub repository
3. Follow the setup wizard

#### Step 3: Environment
- **Build Command**: `npm install`
- **Run Command**: `npm start`

#### Step 4: Deploy
DigitalOcean handles the rest!

---

### Option 5: AWS Amplify (Scalable)

**Cost**: Free tier with generous usage

#### Step 1: Push to GitHub
```bash
git push origin main
```

#### Step 2: Connect Amplify
1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify)
2. Click "Create app"
3. Connect GitHub repository
4. Select branch: `main`

#### Step 3: Build Settings
Amplify auto-detects the Node.js setup

#### Step 4: Deploy
Click "Save and deploy"

---

## Docker Deployment (Advanced)

If you want to run in a Docker container:

### Create `Dockerfile`

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### Create `.dockerignore`

```
node_modules
npm-debug.log
.git
.gitignore
README.md
```

### Build & Run

```bash
# Build
docker build -t music-guess-party .

# Run locally
docker run -p 3000:3000 music-guess-party

# Access
http://localhost:3000/screen.html
```

### Deploy Docker to Cloud

**Option A: Docker Hub → Any Cloud**
```bash
docker tag music-guess-party your-username/music-guess-party
docker push your-username/music-guess-party
```

**Option B: Deploy to AWS ECS, Google Cloud Run, or Azure Container Instances**

---

## Environment Variables (Optional)

Create a `.env` file if needed:

```bash
PORT=3000
NODE_ENV=production
```

Then deploy:

```bash
# Heroku
heroku config:set PORT=3000

# Render / Railway
Add in dashboard under "Environment"
```

---

## Testing After Deployment

1. **Check Health**
   ```
   https://your-app.com/api/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Test Screen Connection**
   Open: `https://your-app.com/screen.html`
   Should show Room Code like `5234`

3. **Test Player Join**
   On phone, open: `https://your-app.com/controller.html`
   Enter room code from screen
   Should connect and show in player list

4. **Test Music Playback**
   Click "Generate Playlist" on screen
   Should fetch songs from Deezer API
   Audio preview should play when round starts

---

## Troubleshooting Deployment

### "Cannot find module 'express'"
```bash
npm install
git add package-lock.json
git commit -m "Add package-lock"
git push heroku main
```

### Port Error: "Address already in use"
```bash
# Find and kill process on port 3000
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows
```

### Socket.io Connection Refused
- Check firewall settings
- Ensure CORS is enabled (it is in server.js)
- Verify SSL/TLS if using HTTPS

### Deezer API Not Responding
- API rate limit exceeded? (Free tier: 50 requests/sec)
- Check internet connection
- Try different genre with fewer songs

### Players Can't Connect to Room
1. Ensure room code is correct (exactly 4 digits)
2. Verify both screen and controller are on same network
3. Check if firewall is blocking WebSocket connections
4. Restart server and refresh both screens

---

## Performance & Scaling

### Current Limitations
- Single server instance (not load-balanced)
- In-memory storage (resets on restart)
- ~100 concurrent rooms recommended

### For Higher Scale
1. **Use Redis** for session storage
2. **Use Load Balancer** (nginx, HAProxy)
3. **Database** (MongoDB, PostgreSQL) for persistence
4. **CDN** for static assets

---

## Security Notes

⚠️ **This is a development/demo setup. For production:**

1. Add authentication
2. Validate all inputs
3. Use HTTPS/SSL
4. Rate-limit API calls
5. Sanitize user names
6. Add CSRF protection
7. Use environment variables for secrets

---

## Monitoring & Logs

### View Logs on Heroku
```bash
heroku logs --tail
```

### View Logs on Render
Click app in dashboard → "Logs" tab

### Local Logs
Look for messages like:
```
[Screen] Screen connected to room 5234
[Controller] John joined room 5234
[Connection] Socket connected
```

---

## Updates & Maintenance

### Pull Latest Code
```bash
git pull origin main
git push heroku main
```

### Restart Server
```bash
heroku restart  # Heroku
# Render auto-redeploys on push
```

### View Active Sessions
```bash
curl https://your-app.com/api/rooms
```

---

## Next Steps

✅ Deploy the app  
✅ Share the URL with friends  
✅ Open screen.html on a big display  
✅ Share controller.html link for players to join  
✅ Have fun! 🎉

---

For more help:
- Check server console for errors
- Open browser DevTools (F12)
- Check Network tab for Socket.io connection
- Look at server.js comments for implementation details
