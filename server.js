const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json()); // Add JSON body parser

// API Routes
const homeRoutes = require('./routes/home');
const trendingRoutes = require('./routes/trending');
const statsRoutes = require('./routes/stats');

app.use('/api/v1', homeRoutes);
app.use('/api/v1', trendingRoutes);
app.use('/api/v1', statsRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket']
});

const PORT = process.env.PORT || 3000;
const rooms = new Map();
const roomWaitTimers = new Map();

// --- Status Page HTML ---
const getStatusPage = () => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Echopulse Unified | Status</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #050018;
            --accent: #00f2fe;
            --accent2: #4facfe;
            --glass: rgba(255, 255, 255, 0.05);
            --border: rgba(255, 255, 255, 0.1);
        }
        body {
            margin: 0;
            padding: 0;
            font-family: 'Outfit', sans-serif;
            background: var(--bg);
            color: white;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            overflow: hidden;
            background: radial-gradient(circle at top right, #0a0033, #050018);
        }
        .container {
            text-align: center;
            padding: 3rem;
            background: var(--glass);
            backdrop-filter: blur(20px);
            border-radius: 30px;
            border: 1px solid var(--border);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            animation: fadeIn 1s ease-out;
            max-width: 450px;
            width: 90%;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .logo {
            font-size: 2.5rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            background: linear-gradient(45deg, var(--accent), var(--accent2));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: -1px;
        }
        .status-badge {
            display: inline-flex;
            align-items: center;
            padding: 0.5rem 1rem;
            background: rgba(0, 255, 127, 0.1);
            color: #00ff7f;
            border-radius: 50px;
            font-size: 0.9rem;
            margin-bottom: 2rem;
            border: 1px solid rgba(0, 255, 127, 0.2);
        }
        .pulse {
            width: 8px;
            height: 8px;
            background: #00ff7f;
            border-radius: 50%;
            margin-right: 10px;
            box-shadow: 0 0 10px #00ff7f;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 255, 127, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(0, 255, 127, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 255, 127, 0); }
        }
        .stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-top: 1rem;
        }
        .stat-card {
            background: rgba(255, 255, 255, 0.03);
            padding: 1.25rem;
            border-radius: 15px;
            border: 1px solid var(--border);
            transition: transform 0.3s ease;
        }
        .stat-card:hover { transform: translateY(-5px); background: rgba(255, 255, 255, 0.06); }
        .stat-value {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--accent);
        }
        .stat-label {
            font-size: 0.75rem;
            opacity: 0.5;
            text-transform: uppercase;
            margin-top: 0.2rem;
            letter-spacing: 1px;
        }
        .footer {
            margin-top: 2.5rem;
            font-size: 0.8rem;
            opacity: 0.4;
            line-height: 1.6;
        }
        .api-tag {
            background: rgba(79, 172, 254, 0.1);
            color: var(--accent2);
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.7rem;
            margin-left: 5px;
            border: 1px solid rgba(79, 172, 254, 0.2);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">Echopulse Unified</div>
        <div class="status-badge">
            <div class="pulse"></div>
            All Core Systems Operational
        </div>
        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">${rooms.size}</div>
                <div class="stat-label">Active Sync Rooms</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${io.engine.clientsCount}</div>
                <div class="stat-label">Live Listeners</div>
            </div>
            <div class="stat-card" style="grid-column: span 2;">
                <div class="stat-value">Active <span class="api-tag">REST v1.0</span></div>
                <div class="stat-label">Music Discovery Engine</div>
            </div>
        </div>
        <div class="footer">
            Unified Music Infrastructure | Low Latency WebSocket + REST API<br>
            Powered by Supabase & Node.js
        </div>
    </div>
</body>
</html>
`;

io.on('connection', (socket) => {
  let currentUserId = null;
  let currentRoomCode = null;

  socket.on('create_room', (data) => {
    const { roomId, roomCode, roomName, ownerId, ownerName } = data;
    currentUserId = ownerId;
    currentRoomCode = roomCode;

    if (roomWaitTimers.has(roomCode)) {
      clearTimeout(roomWaitTimers.get(roomCode));
      roomWaitTimers.delete(roomCode);
    }

    const roomState = {
      roomId,
      code: roomCode,
      name: roomName,
      ownerId,
      ownerName,
      isLocked: false,
      currentSong: null,
      state: {
        isPlaying: false,
        position: 0,
        timestamp: Date.now(),
        updatedBy: ownerName
      },
      messages: [],
      users: new Set([socket.id])
    };

    rooms.set(roomCode, roomState);
    socket.join(roomCode);
    console.log(`Room created: ${roomCode} by ${ownerName}`);
    socket.emit('room_created', { roomCode, roomId });
  });

  socket.on('join_room', (data) => {
    const { roomCode, userId, userName } = data;
    const room = rooms.get(roomCode);
    currentUserId = userId;
    currentRoomCode = roomCode;

    if (room) {
      if (room.isLocked && room.ownerId !== userId) {
        return socket.emit('error_msg', { message: 'Room is locked' });
      }

      if (room.ownerId === userId && roomWaitTimers.has(roomCode)) {
        clearTimeout(roomWaitTimers.get(roomCode));
        roomWaitTimers.delete(roomCode);
        console.log(`Re-connected owner: ${roomCode}`);
      }

      socket.join(roomCode);
      room.users.add(socket.id);
      
      console.log(`User ${userName} joined room: ${roomCode}`);
      socket.to(roomCode).emit('user_joined', { userId, userName, count: room.users.size });

      socket.emit('sync_state', {
        currentSong: room.currentSong,
        state: room.state,
        isLocked: room.isLocked,
        ownerName: room.ownerName,
        roomName: room.name,
        listenerCount: room.users.size,
        messages: room.messages
      });
      io.to(roomCode).emit('listener_count', { count: room.users.size });
    } else {
      socket.emit('error_msg', { message: 'Room not found' });
    }
  });

  socket.on('leave_room', (data) => {
    const { roomCode } = data;
    const room = rooms.get(roomCode);
    if (room) {
      room.users.delete(socket.id);
      socket.leave(roomCode);
      console.log(`User explicitly left room: ${roomCode}`);
      
      if (room.users.size === 0) {
        const timer = setTimeout(() => {
          rooms.delete(roomCode);
          roomWaitTimers.delete(roomCode);
          console.log(`Room ${roomCode} removed after empty leave`);
        }, 15000); // Shorter 15s for explicit leave
        roomWaitTimers.set(roomCode, timer);
      } else {
        io.to(roomCode).emit('listener_count', { count: room.users.size });
      }
    }
  });

  socket.on('playback_event', (data) => {
    const { type, position, timestamp, roomCode, userName } = data;
    const room = rooms.get(roomCode);
    if (room) {
      room.state.isPlaying = (type === 'PLAY' || (type === 'SEEK' && room.state.isPlaying));
      if (type === 'PAUSE') room.state.isPlaying = false;
      room.state.position = position;
      room.state.timestamp = timestamp || Date.now();
      room.state.updatedBy = userName;

      socket.to(roomCode).emit('playback_update', {
        type,
        position: room.state.position,
        timestamp: room.state.timestamp,
        isPlaying: room.state.isPlaying,
        userName
      });
    }
  });

  socket.on('sync_room', (data) => {
    const { roomCode, position, isPlaying, timestamp, userName, userId } = data;
    const room = rooms.get(roomCode);
    if (room && room.ownerId === userId) {
      room.state.position = position;
      room.state.isPlaying = isPlaying;
      room.state.timestamp = timestamp || Date.now();
      
      socket.to(roomCode).emit('playback_update', {
        type: 'SYNC',
        position: room.state.position,
        timestamp: room.state.timestamp,
        isPlaying: room.state.isPlaying,
        userName
      });
    }
  });

  socket.on('change_song', (data) => {
    const { song, roomCode, userName } = data;
    const room = rooms.get(roomCode);
    if (room) {
      room.currentSong = song;
      room.state.position = 0;
      room.state.timestamp = Date.now();
      room.state.isPlaying = true;

      socket.to(roomCode).emit('song_changed', {
        song,
        userName,
        timestamp: room.state.timestamp
      });
    }
  });

  socket.on('send_message', (data) => {
    const { roomCode, message, userName, userId, replyTo } = data;
    const room = rooms.get(roomCode);
    if (room) {
      const msg = {
        id: Math.random().toString(36).substr(2, 9),
        sender: userName,
        message,
        timestamp: Date.now(),
        userId,
        replyTo
      };
      
      room.messages.push(msg);
      if (room.messages.length > 100) room.messages.shift(); // Limit to 100
      
      io.to(roomCode).emit('new_message', msg);
    }
  });

  socket.on('edit_message', (data) => {
    const { roomCode, messageId, newMessage } = data;
    const room = rooms.get(roomCode);
    if (room) {
      const msg = room.messages.find(m => m.id === messageId);
      if (msg) {
        msg.message = newMessage;
        msg.isEdited = true;
      }
      io.to(roomCode).emit('message_edited', { messageId, newMessage });
    }
  });

  socket.on('delete_message', (data) => {
    const { roomCode, messageId } = data;
    const room = rooms.get(roomCode);
    if (room) {
      room.messages = room.messages.filter(m => m.id !== messageId);
      io.to(roomCode).emit('message_deleted', { messageId });
    }
  });

  socket.on('toggle_lock', (data) => {
    const { roomCode, isLocked, userId } = data;
    const room = rooms.get(roomCode);
    if (room && room.ownerId === userId) {
      room.isLocked = isLocked;
      io.to(roomCode).emit('room_lock_status', { isLocked });
    }
  });

  socket.on('delete_room', (data) => {
    const { roomCode, userId } = data;
    const room = rooms.get(roomCode);
    if (room && room.ownerId === userId) {
      io.to(roomCode).emit('room_deleted');
      rooms.delete(roomCode);
      console.log(`Room ${roomCode} deleted explicitly by owner`);
    }
  });

  socket.on('ping_alive', () => socket.emit('pong_alive'));

  socket.on('disconnecting', () => {
    for (const roomCode of socket.rooms) {
      if (rooms.has(roomCode)) {
        const room = rooms.get(roomCode);
        room.users.delete(socket.id);
        
        if (room.users.size === 0) {
          const timer = setTimeout(() => {
            rooms.delete(roomCode);
            roomWaitTimers.delete(roomCode);
            console.log(`Room ${roomCode} removed after timeout`);
          }, 30000); // 30s grace period
          roomWaitTimers.set(roomCode, timer);
        } else {
          io.to(roomCode).emit('listener_count', { count: room.users.size });
        }
      }
    }
  });
});

app.get('/', (req, res) => {
  res.send(getStatusPage());
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
