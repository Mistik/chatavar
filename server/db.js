const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'chatavar.db');

let db = null;
let saveTimer = null;

// Debounced disk write — avoids hammering disk on every query
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveToDisk();
  }, 500);
}

function saveToDisk() {
  try {
    const data = db.export();
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (err) {
    console.error('[DB] Failed to save to disk:', err.message);
  }
}

async function initDB() {
  const SQL = await initSqlJs();

  // Load existing DB from disk if it exists
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    
  } else {
    db = new SQL.Database();
    
  }

  // Run migrations
  migrate();

  // Save on process exit
  process.on('exit', saveToDisk);
  process.on('SIGINT', () => { saveToDisk(); process.exit(); });
  process.on('SIGTERM', () => { saveToDisk(); process.exit(); });

  return db;
}

function migrate() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      age INTEGER,
      gender TEXT,
      location TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      avatar TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS friendships (
      user_id TEXT NOT NULL,
      friend_id TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      PRIMARY KEY (user_id, friend_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS friend_requests (
      from_id TEXT NOT NULL,
      to_id TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      PRIMARY KEY (from_id, to_id)
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username COLLATE NOCASE)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_friend_requests_to ON friend_requests(to_id)`);

  // blocks table (safe to run every startup)
  db.run(`
    CREATE TABLE IF NOT EXISTS blocks (
      blocker_id TEXT NOT NULL,
      blocked_id TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      PRIMARY KEY (blocker_id, blocked_id)
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id)`);

  // group chat tables
  migrateGroups();
  migrateEmbedSettings();

  saveToDisk();
  
}

// ─── User queries ──────────────────────────────────────────────────────────────

function createUser({ id, username, passwordHash, age, gender, location, bio }) {
  db.run(
    `INSERT INTO users (id, username, password_hash, age, gender, location, bio)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, username, passwordHash, age || null, gender || null, location || '', bio || '']
  );
  scheduleSave();
}

function getUserByUsername(username) {
  const stmt = db.prepare(`SELECT * FROM users WHERE username = ? COLLATE NOCASE`);
  stmt.bind([username]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function getUserById(id) {
  const stmt = db.prepare(`SELECT * FROM users WHERE id = ?`);
  stmt.bind([id]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function updateUser(id, { age, gender, location, bio, avatar }) {
  db.run(
    `UPDATE users SET age = ?, gender = ?, location = ?, bio = ?, avatar = ? WHERE id = ?`,
    [age ?? null, gender ?? null, location ?? '', bio ?? '', avatar ?? null, id]
  );
  scheduleSave();
}

function publicProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    age: row.age || null,
    gender: row.gender || null,
    location: row.location || '',
    bio: row.bio || '',
    avatar: row.avatar || null,
    createdAt: row.created_at,
  };
}

// ─── Friendship queries ────────────────────────────────────────────────────────

function getFriends(userId) {
  const stmt = db.prepare(`
    SELECT u.* FROM users u
    INNER JOIN friendships f ON f.friend_id = u.id
    WHERE f.user_id = ?
    ORDER BY u.username COLLATE NOCASE
  `);
  stmt.bind([userId]);
  const friends = [];
  while (stmt.step()) friends.push(publicProfile(stmt.getAsObject()));
  stmt.free();
  return friends;
}

function areFriends(userIdA, userIdB) {
  const stmt = db.prepare(`SELECT 1 FROM friendships WHERE user_id = ? AND friend_id = ?`);
  stmt.bind([userIdA, userIdB]);
  const exists = stmt.step();
  stmt.free();
  return exists;
}

function addFriendship(userIdA, userIdB) {
  // Mutual
  db.run(`INSERT OR IGNORE INTO friendships (user_id, friend_id) VALUES (?, ?)`, [userIdA, userIdB]);
  db.run(`INSERT OR IGNORE INTO friendships (user_id, friend_id) VALUES (?, ?)`, [userIdB, userIdA]);
  scheduleSave();
}

function removeFriendship(userIdA, userIdB) {
  db.run(`DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`,
    [userIdA, userIdB, userIdB, userIdA]);
  scheduleSave();
}

// ─── Friend request queries ────────────────────────────────────────────────────

function createFriendRequest(fromId, toId) {
  db.run(`INSERT OR IGNORE INTO friend_requests (from_id, to_id) VALUES (?, ?)`, [fromId, toId]);
  scheduleSave();
}

function deleteFriendRequest(fromId, toId) {
  db.run(`DELETE FROM friend_requests WHERE from_id = ? AND to_id = ?`, [fromId, toId]);
  scheduleSave();
}

function getFriendRequestsFor(userId) {
  const stmt = db.prepare(`
    SELECT u.* FROM users u
    INNER JOIN friend_requests fr ON fr.from_id = u.id
    WHERE fr.to_id = ?
    ORDER BY fr.created_at DESC
  `);
  stmt.bind([userId]);
  const reqs = [];
  while (stmt.step()) reqs.push(publicProfile(stmt.getAsObject()));
  stmt.free();
  return reqs;
}

function hasFriendRequest(fromId, toId) {
  const stmt = db.prepare(`SELECT 1 FROM friend_requests WHERE from_id = ? AND to_id = ?`);
  stmt.bind([fromId, toId]);
  const exists = stmt.step();
  stmt.free();
  return exists;
}

module.exports = {
  initDB,
  // users
  createUser, getUserByUsername, getUserById, updateUser, publicProfile,
  // friends
  getFriends, areFriends, addFriendship, removeFriendship,
  // friend requests
  createFriendRequest, deleteFriendRequest, getFriendRequestsFor, hasFriendRequest,
};

// ─── Block queries ─────────────────────────────────────────────────────────────

function migrateBlocks() {
  db.run(`
    CREATE TABLE IF NOT EXISTS blocks (
      blocker_id TEXT NOT NULL,
      blocked_id TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      PRIMARY KEY (blocker_id, blocked_id)
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id)`);
  scheduleSave();
}

function blockUser(blockerId, blockedId) {
  // Also remove friendship if exists
  removeFriendship(blockerId, blockedId);
  db.run(`INSERT OR IGNORE INTO blocks (blocker_id, blocked_id) VALUES (?, ?)`, [blockerId, blockedId]);
  scheduleSave();
}

function unblockUser(blockerId, blockedId) {
  db.run(`DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?`, [blockerId, blockedId]);
  scheduleSave();
}

function isBlocked(blockerId, blockedId) {
  const stmt = db.prepare(`SELECT 1 FROM blocks WHERE blocker_id = ? AND blocked_id = ?`);
  stmt.bind([blockerId, blockedId]);
  const exists = stmt.step();
  stmt.free();
  return exists;
}

function getBlockedUsers(userId) {
  const stmt = db.prepare(`
    SELECT u.* FROM users u
    INNER JOIN blocks b ON b.blocked_id = u.id
    WHERE b.blocker_id = ?
    ORDER BY u.username COLLATE NOCASE
  `);
  stmt.bind([userId]);
  const blocked = [];
  while (stmt.step()) blocked.push(publicProfile(stmt.getAsObject()));
  stmt.free();
  return blocked;
}

module.exports = Object.assign(module.exports, {
  migrateBlocks, blockUser, unblockUser, isBlocked, getBlockedUsers,
});

// ─── Group Chat DB ─────────────────────────────────────────────────────────────

function migrateGroups() {
  db.run(`
    CREATE TABLE IF NOT EXISTS group_chats (
      id          TEXT PRIMARY KEY,
      name        TEXT UNIQUE NOT NULL COLLATE NOCASE,
      title       TEXT NOT NULL DEFAULT '',
      owner_id    TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      accent_color TEXT NOT NULL DEFAULT '5865f2',
      owner_message TEXT NOT NULL DEFAULT '',
      member_count INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS group_messages (
      id          TEXT PRIMARY KEY,
      group_id    TEXT NOT NULL,
      author_id   TEXT,
      guest_name  TEXT,
      body        TEXT NOT NULL,
      created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
      FOREIGN KEY(group_id) REFERENCES group_chats(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS group_members (
      group_id    TEXT NOT NULL,
      user_id     TEXT NOT NULL,
      last_read   INTEGER NOT NULL DEFAULT 0,
      joined_at   INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
      PRIMARY KEY(group_id, user_id)
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_gmsgs_group ON group_messages(group_id, created_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_gchats_owner ON group_chats(owner_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_gmembers_user ON group_members(user_id)`);
  scheduleSave();
}

// ── Group CRUD ────────────────────────────────────────────────────────────────

function createGroup({ id, name, title, ownerId, description, accentColor, ownerMessage }) {
  db.run(
    `INSERT INTO group_chats (id, name, title, owner_id, description, accent_color, owner_message)
     VALUES (?,?,?,?,?,?,?)`,
    [id, name.toLowerCase(), title || '', ownerId, description || '', accentColor || '5865f2', ownerMessage || '']
  );
  // Owner is auto-member
  db.run(`INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?,?)`, [id, ownerId]);
  updateGroupMemberCount(id);
  scheduleSave();
}

function getGroupByName(name) {
  const stmt = db.prepare(`SELECT * FROM group_chats WHERE name = ? COLLATE NOCASE`);
  stmt.bind([name.toLowerCase()]);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

function getGroupById(id) {
  const stmt = db.prepare(`SELECT * FROM group_chats WHERE id = ?`);
  stmt.bind([id]);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

function getGroupsByOwner(ownerId) {
  const stmt = db.prepare(`SELECT * FROM group_chats WHERE owner_id = ? ORDER BY created_at DESC`);
  stmt.bind([ownerId]);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function updateGroup(id, { title, description, accentColor, ownerMessage }) {
  db.run(
    `UPDATE group_chats SET title=?, description=?, accent_color=?, owner_message=? WHERE id=?`,
    [title || '', description || '', accentColor || '5865f2', ownerMessage || '', id]
  );
  scheduleSave();
}

function deleteGroup(id) {
  db.run(`DELETE FROM group_messages WHERE group_id=?`, [id]);
  db.run(`DELETE FROM group_members WHERE group_id=?`, [id]);
  db.run(`DELETE FROM group_chats WHERE id=?`, [id]);
  scheduleSave();
}

function updateGroupMemberCount(groupId) {
  db.run(
    `UPDATE group_chats SET member_count=(SELECT COUNT(*) FROM group_members WHERE group_id=?) WHERE id=?`,
    [groupId, groupId]
  );
}

// ── Membership ────────────────────────────────────────────────────────────────

function joinGroup(groupId, userId) {
  db.run(`INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?,?)`, [groupId, userId]);
  updateGroupMemberCount(groupId);
  scheduleSave();
}

function leaveGroup(groupId, userId) {
  db.run(`DELETE FROM group_members WHERE group_id=? AND user_id=?`, [groupId, userId]);
  updateGroupMemberCount(groupId);
  scheduleSave();
}

function isMember(groupId, userId) {
  const stmt = db.prepare(`SELECT 1 FROM group_members WHERE group_id=? AND user_id=?`);
  stmt.bind([groupId, userId]);
  const r = stmt.step();
  stmt.free();
  return r;
}

function getGroupsForUser(userId) {
  const stmt = db.prepare(`
    SELECT gc.*, gm.last_read, gm.joined_at
    FROM group_chats gc
    INNER JOIN group_members gm ON gm.group_id = gc.id
    WHERE gm.user_id = ?
    ORDER BY gc.created_at DESC
  `);
  stmt.bind([userId]);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function updateLastRead(groupId, userId) {
  db.run(`UPDATE group_members SET last_read=? WHERE group_id=? AND user_id=?`,
    [Date.now(), groupId, userId]);
  scheduleSave();
}

// ── Messages ─────────────────────────────────────────────────────────────────

function addGroupMessage({ id, groupId, authorId, guestName, body }) {
  db.run(
    `INSERT INTO group_messages (id, group_id, author_id, guest_name, body) VALUES (?,?,?,?,?)`,
    [id, groupId, authorId || null, guestName || null, body]
  );
  scheduleSave();
}

function getGroupMessages(groupId, limit = 100, before = null) {
  let query, params;
  if (before) {
    query = `
      SELECT gm.*, u.username, u.avatar FROM group_messages gm
      LEFT JOIN users u ON u.id = gm.author_id
      WHERE gm.group_id = ? AND gm.created_at < ?
      ORDER BY gm.created_at DESC LIMIT ?
    `;
    params = [groupId, before, limit];
  } else {
    query = `
      SELECT gm.*, u.username, u.avatar FROM group_messages gm
      LEFT JOIN users u ON u.id = gm.author_id
      WHERE gm.group_id = ?
      ORDER BY gm.created_at DESC LIMIT ?
    `;
    params = [groupId, limit];
  }
  const stmt = db.prepare(query);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows.reverse(); // chronological order
}

function getGroupUnreadCount(groupId, userId, lastRead) {
  const stmt = db.prepare(
    `SELECT COUNT(*) as n FROM group_messages WHERE group_id=? AND created_at > ? AND author_id != ?`
  );
  stmt.bind([groupId, lastRead || 0, userId]);
  const row = stmt.step() ? stmt.getAsObject() : { n: 0 };
  stmt.free();
  return row.n || 0;
}

function getRecentGroupsForUser(userId, limit = 20) {
  // Groups user is a member of, sorted by most recent message
  const stmt = db.prepare(`
    SELECT gc.*,
           gm2.last_read,
           MAX(gmsgs.created_at) as last_message_at,
           (SELECT body FROM group_messages WHERE group_id=gc.id ORDER BY created_at DESC LIMIT 1) as last_body,
           (SELECT username FROM users u2 INNER JOIN group_messages gmx ON gmx.author_id=u2.id WHERE gmx.group_id=gc.id ORDER BY gmx.created_at DESC LIMIT 1) as last_author
    FROM group_chats gc
    INNER JOIN group_members gm2 ON gm2.group_id=gc.id AND gm2.user_id=?
    LEFT JOIN group_messages gmsgs ON gmsgs.group_id=gc.id
    GROUP BY gc.id
    ORDER BY last_message_at DESC NULLS LAST
    LIMIT ?
  `);
  stmt.bind([userId, limit]);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

module.exports = Object.assign(module.exports, {
  migrateGroups,
  createGroup, getGroupByName, getGroupById, getGroupsByOwner, updateGroup, deleteGroup,
  joinGroup, leaveGroup, isMember, getGroupsForUser, updateLastRead,
  addGroupMessage, getGroupMessages, getGroupUnreadCount, getRecentGroupsForUser,
});

// ─── Embed Settings ────────────────────────────────────────────────────────────

function migrateEmbedSettings() {
  db.run(`
    CREATE TABLE IF NOT EXISTS embed_settings (
      group_id      TEXT PRIMARY KEY,
      embed_type    TEXT NOT NULL DEFAULT 'box',
      width         INTEGER NOT NULL DEFAULT 250,
      height        INTEGER NOT NULL DEFAULT 350,
      accent_color  TEXT NOT NULL DEFAULT 'CC0000',
      ticker_enabled INTEGER NOT NULL DEFAULT 1,
      ticker_width  INTEGER NOT NULL DEFAULT 200,
      ticker_height INTEGER NOT NULL DEFAULT 30,
      corner        TEXT NOT NULL DEFAULT 'bottom-right',
      show_url      INTEGER NOT NULL DEFAULT 1,
      updated_at    INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
      FOREIGN KEY(group_id) REFERENCES group_chats(id)
    )
  `);
  scheduleSave();
}

function getEmbedSettings(groupId) {
  const stmt = db.prepare(`SELECT * FROM embed_settings WHERE group_id = ?`);
  stmt.bind([groupId]);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

function upsertEmbedSettings(groupId, settings) {
  const existing = getEmbedSettings(groupId);
  const { embedType, width, height, accentColor, tickerEnabled, tickerWidth, tickerHeight, corner, showUrl } = settings;
  if (existing) {
    db.run(`UPDATE embed_settings SET embed_type=?,width=?,height=?,accent_color=?,ticker_enabled=?,ticker_width=?,ticker_height=?,corner=?,show_url=?,updated_at=? WHERE group_id=?`,
      [embedType||existing.embed_type, width||existing.width, height||existing.height,
       accentColor||existing.accent_color, tickerEnabled!=null?tickerEnabled:existing.ticker_enabled,
       tickerWidth||existing.ticker_width, tickerHeight||existing.ticker_height,
       corner||existing.corner, showUrl!=null?showUrl:existing.show_url,
       Date.now(), groupId]);
  } else {
    db.run(`INSERT INTO embed_settings (group_id,embed_type,width,height,accent_color,ticker_enabled,ticker_width,ticker_height,corner,show_url,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [groupId, embedType||'box', width||250, height||350,
       accentColor||'CC0000', tickerEnabled!=null?tickerEnabled:1,
       tickerWidth||200, tickerHeight||30, corner||'bottom-right',
       showUrl!=null?showUrl:1, Date.now()]);
  }
  scheduleSave();
}

module.exports = Object.assign(module.exports, {
  migrateEmbedSettings, getEmbedSettings, upsertEmbedSettings,
});
