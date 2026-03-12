# Chatavar

A Chatango-style embeddable chat platform — group chat rooms, private messaging, moderation tools, and embeddable widgets for any website.

## Features

### Core
- Registration & login with JWT auth
- Private messaging (stored in browser localStorage, not on server)
- Group chat rooms with persistent SQLite message history
- Friends system with send/accept/decline requests
- Real-time online presence across multiple tabs
- Profile with avatar upload, bio, age, gender, location
- Embeddable group widget (Box, Ticker, Tab layouts) via `embed.js`
- Embeddable PM widget (mini chat box for personal sites) via `pm-embed.js`

### Moderation
- Moderator roles — owner / admin / mod permission levels
- Ban, IP ban, easy ban (ban + delete all messages in one click)
- Timed mutes (5 min, 1 hour, custom)
- Delete single messages or all messages by a user
- Banned words — word parts + exact match with leet-speak resilience
- Shadow blocking — "only to author" mode (sender sees message, nobody else does)
- Chat restrictions — no anons, broadcast mode, closed without mods, slow mode, ban links/images
- Moderation log — full audit trail
- Periodic announcements — auto-posting system messages at set intervals
- 6-tab mod admin panel (Restrictions, Banned Words, Moderators, Announcements, Ban List, Mod Log)

### User Settings (7-tab panel)
- Blocked users management
- Privacy — hide from Members, control who can PM, allow/block anon messages
- Colored messages — custom text and background colour per user
- B&W toggle — disable other users' colours
- Notification sounds — ping / pop / chime / none (Web Audio API, no files)
- Volume control
- PM Embed — generate embed code for personal site chat widget
- Password change with current password verification
- Account deletion with two-step confirmation and cascading cleanup

### Safety
- Block/unblock users (also blocks their IP)
- Report abuse with reason selector, auto-restricts after 5 unique reports
- Restricted users system

### Help Center
- `/help` — Chatango-identical layout with Site owners / Users tabs and 45+ help articles

## Setup

```bash
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
cp .env.example .env
cp server/.env.example server/.env

# Run both
npm run dev
```

## Tech Stack
- **Server:** Node.js, Express, Socket.io, uWebSockets.js, sql.js (SQLite), bcryptjs, JWT
- **Client:** React, Zustand, Webpack, Lucide icons, date-fns
- **Real-time:** WebSocket via Socket.io over uWebSockets.js
- **Database:** SQLite via sql.js, file-backed with debounced writes
