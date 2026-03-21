# Echopulse All-In-One Backend

This server handles both **Real-time Music Synchronization** (Group Listening) and the **Dynamic Discovery API** (Home Screen, Trending, Latest).

---

## 🚀 Features

### 1. Music Discovery (REST API)
Provides high-quality, auto-updating music content for the Flutter app's home screen.
-   **Endpoints**:
    -   `GET /api/v1/home?lang=Malayalam`: Fetches Carousel and Language-specific sections.
    -   `GET /api/v1/trending`: Paginated list of top trending songs.
-   **Data Sync**: Automated script to fetch from JioSaavn API.

### 2. Live Sync (Socket.io)
Handles real-time room creation, shared playback, and group chat.
-   **Core Events**:
    -   `create_room` / `join_room` / `leave_room`
    -   `playback_event`: Syncs PLAY, PAUSE, SEEK across all users in a room.
    -   `change_song`: Instantly updates the song for everyone.
    -   `send_message`: Real-time group chat with edit/delete support.
    -   `toggle_lock`: Restricts control to the room owner.

---

## 🛠️ Setup & Hosting

### 1. Database (Supabase)
- Run `schema.sql` in your Supabase SQL Editor to prepare the tables.

### 2. Configuration (`.env`)
Create a `.env` file in this folder:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
PORT=3000
```

### 3. Installation & Data Sync
```bash
npm install
node scripts/sync_music.js  # Runs once to populate your DB
```

### 4. Running Local
```bash
npm run dev
```

### 5. Deployment (Render / Railway)
-   **Platform**: Any Node.js host (Render is free-forever, Railway is faster).
-   **Build Command**: `npm install`
-   **Start Command**: `node server.js`
-   **Environment Variables**: Ensure you copy all `.env` values to your host's dashboard.

---

## 📱 Flutter Integration
Update the `baseUrl` in your Flutter code to match your hosted URL:
-   **REST API**: `YOUR_URL/api/v1/home`
-   **Live Sync**: `YOUR_URL` (passed to Socket.io client)
