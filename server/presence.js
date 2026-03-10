// ─── Presence ─────────────────────────────────────────────────────────────────
// Tracks which sockets are connected. Pure in-memory — resets on restart,
// which is intentional (online presence is ephemeral by nature).

const db = require('./db');

// socketId → { userId, username }
const socketMeta = new Map();

// userId → Set<socketId>  (one user can have multiple tabs open)
const userSockets = new Map();

// ─── Internal helpers ─────────────────────────────────────────────────────────

function _addSocket(socketId, userId, username) {
  socketMeta.set(socketId, { userId, username });
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId).add(socketId);
}

function _removeSocket(socketId) {
  const meta = socketMeta.get(socketId);
  if (!meta) return;
  socketMeta.delete(socketId);
  const socks = userSockets.get(meta.userId);
  if (socks) {
    socks.delete(socketId);
    if (socks.size === 0) userSockets.delete(meta.userId);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Register a newly connected socket. */
function connect(socketId, userId, username) {
  _addSocket(socketId, userId, username);
}

/** Deregister a disconnected socket. */
function disconnect(socketId) {
  _removeSocket(socketId);
}

/** Returns true if the user has at least one active socket. */
function isOnline(userId) {
  const socks = userSockets.get(userId);
  return !!(socks && socks.size > 0);
}

/** Returns all socket IDs for a given userId (empty array if offline). */
function getSocketIds(userId) {
  const socks = userSockets.get(userId);
  return socks ? [...socks] : [];
}

/**
 * Returns an array of public profiles for every unique online user.
 * Pulls fresh profile data from the DB on each call.
 */
function getOnlineUsers() {
  const seen    = new Set();
  const results = [];
  for (const { userId } of socketMeta.values()) {
    if (seen.has(userId)) continue;
    seen.add(userId);
    const user = db.getUserById(userId);
    if (user) results.push(db.publicProfile(user));
  }
  return results;
}

/** How many unique users are currently connected. */
function onlineCount() {
  return new Set([...socketMeta.values()].map(m => m.userId)).size;
}

module.exports = { connect, disconnect, isOnline, getSocketIds, getOnlineUsers, onlineCount };
