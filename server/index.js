'use strict';

const http   = require('http');
const db     = require('./db');
const config = require('./config');
const { createApp }          = require('./app');
const { createSocketServer } = require('./socket');

let _io = null; // global reference for announcement scheduler

async function main() {
  // 1. Init database
  await db.initDB();

  // 2. Express REST API on a standard Node http server
  const expressApp = createApp();
  const httpServer = http.createServer(expressApp);

  // 3. uWebSockets handles Socket.io (WebSocket transport)
  const { uwsApp, io } = createSocketServer();
  _io = io;

  // 4. Start both listeners
  await new Promise((resolve, reject) =>
    httpServer.listen(config.port, (err) => err ? reject(err) : resolve())
  );

  await new Promise((resolve, reject) =>
    uwsApp.listen(config.wsPort, (token) =>
      token ? resolve() : reject(new Error(`uWS failed to bind port ${config.wsPort}`))
    )
  );

  // 5. Start announcement scheduler (checks every 30s)
  startAnnouncementScheduler();
}

function startAnnouncementScheduler() {
  const mod = require('./moderation');

  setInterval(() => {
    if (!_io || !db.__rawDb) return;
    try {
      const due = mod.getDueAnnouncements(db.__rawDb);
      for (const ann of due) {
        const group = db.getGroupById(ann.group_id);
        if (!group) continue;

        // Broadcast as system message
        const message = {
          id: 'ann-' + Date.now() + '-' + ann.id,
          body: ann.message,
          createdAt: Date.now(),
          groupId: group.id,
          author: { id: null, username: '📢 Announcement', avatar: null, isRegistered: false },
          isAnnouncement: true,
        };
        _io.to(`group:${group.id}`).emit('group_message', message);
        mod.updateAnnouncementLastSent(db.__rawDb, ann.id);
      }
    } catch (err) {
      console.error('[announcements]', err.message);
    }
  }, 30000); // Check every 30 seconds
}

main().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
