'use strict';

const http   = require('http');
const db     = require('./db');
const config = require('./config');
const { createApp }          = require('./app');
const { createSocketServer } = require('./socket');

async function main() {
  // 1. Init database
  await db.initDB();

  // 2. Express REST API on a standard Node http server
  const expressApp = createApp();
  const httpServer = http.createServer(expressApp);

  // 3. uWebSockets handles Socket.io (WebSocket transport)
  //    Express handles all REST — no bridging needed, no fragile shims.
  const { uwsApp } = createSocketServer();

  // 4. Start both listeners
  await new Promise((resolve, reject) =>
    httpServer.listen(config.port, (err) => err ? reject(err) : resolve())
  );

  await new Promise((resolve, reject) =>
    uwsApp.listen(config.wsPort, (token) =>
      token ? resolve() : reject(new Error(`uWS failed to bind port ${config.wsPort}`))
    )
  );
}

main().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
