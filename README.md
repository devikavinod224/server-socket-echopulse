# Echopulse Unified Backend 🚀

The unified music infrastructure powering Echopulse Sync and Discovery.

## 🌟 Features

-   **Triple-Source Home Screen**: Combines content from JioSaavn, YouTube Music, and YouTube Videos.
-   **Real-time Synchronization**: Powered by Socket.io for group listening and playback control.
-   **Automated Content Sync**: Daily updates via GitHub Actions to keep the home screen fresh.
-   **Play Tracking & Trending**: Atomic play count tracking and a dynamic trending algorithm.
-   **Multi-language Support**: Deep integration with Indian and Global languages.

## 🛠 Tech Stack

-   **Runtime**: Node.js
-   **Framework**: Express.js & Socket.IO
-   **Database**: Supabase (PostgreSQL)
-   **Scrapers**: Custom Node.js YouTube Music scraper & saavn.sumit.co API.
-   **Automation**: GitHub Actions (crontab scheduler).

## 🚀 Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Setup Database**:
   - Run the contents of `schema.sql` in your Supabase SQL Editor.
   - Run the additional RPC functions provided in the documentation for Play Tracking.

3. **Configure Environment**:
   Create a `.env` file from the template:
   ```env
   PORT=3000
   SUPABASE_URL=your_project_url
   SUPABASE_ANON_KEY=your_anon_key
   ```

4. **Sync Music**:
   ```bash
   node scripts/sync_music.js
   ```

5. **Start Server**:
   ```bash
   npm start
   ```

## 📡 API Endpoints

-   `GET /api/v1/home`: Fetches categorized discovery content from all three sources.
-   `GET /api/v1/trending`: Paginated list of top trending songs.
-   `POST /api/v1/songs/:id/play`: Records a play and updates trending statistics.

## 🤖 Automatic Updates
This project includes a GitHub Action at `.github/workflows/sync_music.yml` that automatically refreshes the database every day at 12 AM UTC.

## 📄 License
This project is licensed under the [MIT License](LICENSE).
