// ─── Socket.io Setup ─────────────────────────────────────────────────────────
// Uses uWebSockets.js as the transport layer for significantly better
// performance (lower latency, much higher concurrency) vs the default
// Node.js http/ws implementation.

const { Server }   = require('socket.io');
const uWS          = require('uWebSockets.js');
const { createAdapter } = require('@socket.io/cluster-adapter'); // optional, tree-shaken if unused
const db           = require('../db');
const presence     = require('../presence');
const { verifyToken } = require('../middleware/auth');
const { registerAll }  = require('./handlers');
const config       = require('../config');

/**
 * Creates and configures the uWS app + Socket.io server.
 * Returns { uwsApp, io } so index.js can call uwsApp.listen().
 */
function createSocketServer() {
  // uWebSockets app — handles raw HTTP and WebSocket transport
  const uwsApp = uWS.App();

  const io = new Server({
    cors: {
      origin:      config.allowedOrigins,
      methods:     ['GET', 'POST'],
      credentials: true,
    },
    // Tune for chat workload: small pings, generous timeout
    pingTimeout:  20000,
    pingInterval: 25000,
    transports:   ['websocket', 'polling'],
  });

  // Attach Socket.io to the uWS app
  io.attachApp(uwsApp);

  // ── Socket auth middleware ─────────────────────────────────────────────────
  // Guests are allowed (for group chat) — bad/missing token = guest, not error
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) { socket.userId = null; socket.username = null; return next(); }
    const decoded = verifyToken(token);
    if (!decoded) { socket.userId = null; socket.username = null; return next(); }
    const user = db.getUserById(decoded.userId);
    if (!user) { socket.userId = null; socket.username = null; return next(); }
    socket.userId   = user.id;
    socket.username = user.username;
    next();
  });

  // ── Connection ─────────────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const { userId, username } = socket;

    if (userId) {
      // Registered user — full presence + init data
      presence.connect(socket.id, userId, username);
      io.emit('online_users', presence.getOnlineUsers());
      socket.emit('init', {
        onlineUsers:    presence.getOnlineUsers(),
        friends:        db.getFriends(userId).map(f => ({
                          ...f, online: presence.isOnline(f.id),
                        })),
        friendRequests: db.getFriendRequestsFor(userId),
      });
    }

    // Register all event handlers (group handlers work for guests too)
    registerAll(socket, io);
  });

  return { uwsApp, io };
}

module.exports = { createSocketServer };
