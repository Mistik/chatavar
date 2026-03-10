# Chatavar

Open source Chatango clone. Create group chats and embed them on any website.

---

## Features

- Group chats with embeddable chatboxes (Box, Tab, or floating button)
- Private messaging between registered users
- Guest chat — no account needed, just pick a name
- Friend requests and blocking
- Live embed configurator with color picker and mobile preview
- Widget iframe that runs on external sites via a single script tag

## Tech

Server: Node.js + Express + Socket.io + uWebSockets.js + SQLite  
Client: React + Zustand + Webpack

## Running locally

```bash
git clone https://github.com/yourname/chatavar
cd chatavar
npm install
npm run dev
```

Client → `localhost:3000`, API → `localhost:3001`, WebSocket → `localhost:3002`

## Environment

Create `server/.env`:

```
PORT=3001
WS_PORT=3002
JWT_SECRET=something_secret
JWT_EXPIRY=30d
CLIENT_URL=http://localhost:3000
DB_PATH=./data/chatavar.db
```

## Production

```bash
npm run build
npm start
```

Server serves the built client from `client/dist/`. Works fine behind nginx or on a bare VPS with PM2.

## Embedding

After creating a group, drop this on your site:

```html
<script>
  window.chatavar_group = "your-group-name";
  window.chatavar_color = "CC0000";
</script>
<script src="https://yourdomain.com/embed.js" async></script>
```

## Caveats

- SQLite is fine for low traffic. For anything bigger, swap out `server/db.js` for Postgres.
- DMs are stored in localStorage and relayed in memory — they don't sync across devices.
- No image uploads yet, avatars are URLs only.
- Change `JWT_SECRET` before deploying, it defaults to a plaintext string in dev.

## License

MIT
