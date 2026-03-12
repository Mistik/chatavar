// ─── Moderation DB Layer ──────────────────────────────────────────────────────
// Handles: moderators, bans, mutes, banned words, chat restrictions,
//          mod log, message deletion, announcements

function migrateModeration(db) {
  db.run(`CREATE TABLE IF NOT EXISTS moderators (
    group_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'mod',
    permissions TEXT NOT NULL DEFAULT '{}', added_by TEXT,
    added_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
    PRIMARY KEY(group_id, user_id)
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_mods_group ON moderators(group_id)`);

  db.run(`CREATE TABLE IF NOT EXISTS group_bans (
    id TEXT PRIMARY KEY, group_id TEXT NOT NULL, user_id TEXT, ip_address TEXT,
    guest_name TEXT, reason TEXT DEFAULT '', banned_by TEXT NOT NULL,
    banned_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_gbans_group ON group_bans(group_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_gbans_user  ON group_bans(user_id)`);

  db.run(`CREATE TABLE IF NOT EXISTS group_mutes (
    group_id TEXT NOT NULL, user_id TEXT NOT NULL, until INTEGER NOT NULL,
    muted_by TEXT NOT NULL, muted_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
    PRIMARY KEY(group_id, user_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS banned_words (
    id INTEGER PRIMARY KEY AUTOINCREMENT, group_id TEXT NOT NULL,
    word TEXT NOT NULL, match_type TEXT NOT NULL DEFAULT 'part',
    UNIQUE(group_id, word, match_type)
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_bwords_group ON banned_words(group_id)`);

  db.run(`CREATE TABLE IF NOT EXISTS group_settings (
    group_id TEXT PRIMARY KEY, allow_anons INTEGER NOT NULL DEFAULT 1,
    broadcast_mode INTEGER NOT NULL DEFAULT 0, closed_without_mods INTEGER NOT NULL DEFAULT 0,
    slow_mode INTEGER NOT NULL DEFAULT 0, slow_mode_seconds INTEGER NOT NULL DEFAULT 30,
    slow_mode_exempt_mods INTEGER NOT NULL DEFAULT 1, ban_proxies INTEGER NOT NULL DEFAULT 0,
    ban_links INTEGER NOT NULL DEFAULT 0, ban_images INTEGER NOT NULL DEFAULT 0,
    censor_mode TEXT NOT NULL DEFAULT 'censor', profanity_filter INTEGER NOT NULL DEFAULT 0,
    easy_ban INTEGER NOT NULL DEFAULT 0, show_counter INTEGER NOT NULL DEFAULT 1,
    allow_pm INTEGER NOT NULL DEFAULT 1
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS mod_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT, group_id TEXT NOT NULL, actor_id TEXT NOT NULL,
    action TEXT NOT NULL, target_id TEXT, target_name TEXT, detail TEXT DEFAULT '',
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_modlog_group ON mod_log(group_id, created_at)`);

  db.run(`CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT, group_id TEXT NOT NULL,
    message TEXT NOT NULL, interval_ms INTEGER NOT NULL DEFAULT 900000,
    enabled INTEGER NOT NULL DEFAULT 1, last_sent INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_announce_group ON announcements(group_id)`);
}

// ── Moderators ────────────────────────────────────────────────────────────────
function addModerator(db, gid, uid, role, perms, addedBy) {
  db.run(`INSERT OR REPLACE INTO moderators (group_id,user_id,role,permissions,added_by) VALUES (?,?,?,?,?)`,
    [gid, uid, role||'mod', JSON.stringify(perms||{}), addedBy]);
}
function removeModerator(db, gid, uid) {
  db.run(`DELETE FROM moderators WHERE group_id=? AND user_id=?`, [gid, uid]);
}
function getModerators(db, gid) {
  const s = db.prepare(`SELECT m.*, u.username, u.avatar FROM moderators m LEFT JOIN users u ON u.id=m.user_id WHERE m.group_id=? ORDER BY m.added_at`);
  s.bind([gid]); const r=[]; while(s.step()) r.push(s.getAsObject()); s.free(); return r;
}
function isModerator(db, gid, uid) {
  const s = db.prepare(`SELECT role FROM moderators WHERE group_id=? AND user_id=?`);
  s.bind([gid, uid]); const row = s.step() ? s.getAsObject() : null; s.free(); return row;
}
function getModRole(db, gid, uid, ownerId) {
  if (uid === ownerId) return 'owner';
  const m = isModerator(db, gid, uid); return m ? m.role : null;
}

// ── Bans ──────────────────────────────────────────────────────────────────────
function banUser(db, { id, groupId, userId, ipAddress, guestName, reason, bannedBy }) {
  db.run(`INSERT INTO group_bans (id,group_id,user_id,ip_address,guest_name,reason,banned_by) VALUES (?,?,?,?,?,?,?)`,
    [id, groupId, userId||null, ipAddress||null, guestName||null, reason||'', bannedBy]);
}
function unbanUser(db, gid, banId) {
  db.run(`DELETE FROM group_bans WHERE group_id=? AND id=?`, [gid, banId]);
}
function getBans(db, gid) {
  const s = db.prepare(`SELECT gb.*, u.username as banned_username, u2.username as banned_by_name FROM group_bans gb LEFT JOIN users u ON u.id=gb.user_id LEFT JOIN users u2 ON u2.id=gb.banned_by WHERE gb.group_id=? ORDER BY gb.banned_at DESC`);
  s.bind([gid]); const r=[]; while(s.step()) r.push(s.getAsObject()); s.free(); return r;
}
function isUserBanned(db, gid, uid, ip) {
  const conds=[]; const params=[gid];
  if (uid) { conds.push(`user_id=?`); params.push(uid); }
  if (ip)  { conds.push(`ip_address=?`); params.push(ip); }
  if (!conds.length) return false;
  const s = db.prepare(`SELECT 1 FROM group_bans WHERE group_id=? AND (${conds.join(' OR ')})`);
  s.bind(params); const r=s.step(); s.free(); return r;
}

// ── Mutes ─────────────────────────────────────────────────────────────────────
function muteUser(db, gid, uid, durationMs, mutedBy) {
  db.run(`INSERT OR REPLACE INTO group_mutes (group_id,user_id,until,muted_by) VALUES (?,?,?,?)`,
    [gid, uid, Date.now()+durationMs, mutedBy]);
}
function unmuteUser(db, gid, uid) {
  db.run(`DELETE FROM group_mutes WHERE group_id=? AND user_id=?`, [gid, uid]);
}
function isUserMuted(db, gid, uid) {
  const s = db.prepare(`SELECT until FROM group_mutes WHERE group_id=? AND user_id=?`);
  s.bind([gid, uid]); const row = s.step() ? s.getAsObject() : null; s.free();
  if (!row) return false;
  if (row.until < Date.now()) { unmuteUser(db, gid, uid); return false; }
  return row.until;
}

// ── Banned words ──────────────────────────────────────────────────────────────
function setBannedWords(db, gid, words, matchType) {
  db.run(`DELETE FROM banned_words WHERE group_id=? AND match_type=?`, [gid, matchType]);
  for (const w of words) {
    if (w.trim()) db.run(`INSERT OR IGNORE INTO banned_words (group_id,word,match_type) VALUES (?,?,?)`, [gid, w.trim().toLowerCase(), matchType]);
  }
}
function getBannedWords(db, gid) {
  const s = db.prepare(`SELECT * FROM banned_words WHERE group_id=?`);
  s.bind([gid]); const r=[]; while(s.step()) r.push(s.getAsObject()); s.free(); return r;
}
function censorMessage(db, gid, text) {
  const words = getBannedWords(db, gid);
  if (!words.length) return null;
  let censored = text, hasBanned = false;
  for (const w of words) {
    const esc = w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let regex;
    if (w.match_type === 'exact') { regex = new RegExp(`\\b${esc}\\b`, 'gi'); }
    else {
      const leet = esc.replace(/a/gi,'[a@4]').replace(/e/gi,'[e3]').replace(/i/gi,'[i1!]')
        .replace(/o/gi,'[o0]').replace(/s/gi,'[s5$]').replace(/t/gi,'[t7]');
      regex = new RegExp(leet.split('').join('[.\\s]*'), 'gi');
    }
    if (regex.test(censored)) { hasBanned = true; censored = censored.replace(regex, m => '*'.repeat(m.length)); }
  }
  return hasBanned ? censored : null;
}

// ── Group settings ────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  group_id:'', allow_anons:1, broadcast_mode:0, closed_without_mods:0,
  slow_mode:0, slow_mode_seconds:30, slow_mode_exempt_mods:1, ban_proxies:0,
  ban_links:0, ban_images:0, censor_mode:'censor', profanity_filter:0,
  easy_ban:0, show_counter:1, allow_pm:1,
};
function getGroupSettings(db, gid) {
  const s = db.prepare(`SELECT * FROM group_settings WHERE group_id=?`);
  s.bind([gid]); const row = s.step() ? s.getAsObject() : null; s.free();
  return row || { ...DEFAULT_SETTINGS, group_id: gid };
}
function updateGroupSettings(db, gid, settings) {
  const cur = getGroupSettings(db, gid);
  const m = { ...cur, ...settings, group_id: gid };
  const s = db.prepare(`SELECT 1 FROM group_settings WHERE group_id=?`);
  s.bind([gid]); const exists = s.step(); s.free();
  if (exists) {
    db.run(`UPDATE group_settings SET allow_anons=?,broadcast_mode=?,closed_without_mods=?,slow_mode=?,slow_mode_seconds=?,slow_mode_exempt_mods=?,ban_proxies=?,ban_links=?,ban_images=?,censor_mode=?,profanity_filter=?,easy_ban=?,show_counter=?,allow_pm=? WHERE group_id=?`,
      [m.allow_anons,m.broadcast_mode,m.closed_without_mods,m.slow_mode,m.slow_mode_seconds,m.slow_mode_exempt_mods,m.ban_proxies,m.ban_links,m.ban_images,m.censor_mode,m.profanity_filter,m.easy_ban,m.show_counter,m.allow_pm,gid]);
  } else {
    db.run(`INSERT INTO group_settings (group_id,allow_anons,broadcast_mode,closed_without_mods,slow_mode,slow_mode_seconds,slow_mode_exempt_mods,ban_proxies,ban_links,ban_images,censor_mode,profanity_filter,easy_ban,show_counter,allow_pm) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [gid,m.allow_anons,m.broadcast_mode,m.closed_without_mods,m.slow_mode,m.slow_mode_seconds,m.slow_mode_exempt_mods,m.ban_proxies,m.ban_links,m.ban_images,m.censor_mode,m.profanity_filter,m.easy_ban,m.show_counter,m.allow_pm]);
  }
}

// ── Mod log ───────────────────────────────────────────────────────────────────
function addModLog(db, { groupId, actorId, action, targetId, targetName, detail }) {
  db.run(`INSERT INTO mod_log (group_id,actor_id,action,target_id,target_name,detail) VALUES (?,?,?,?,?,?)`,
    [groupId, actorId, action, targetId||null, targetName||null, detail||'']);
}
function getModLog(db, gid, limit=50) {
  const s = db.prepare(`SELECT ml.*, u.username as actor_name FROM mod_log ml LEFT JOIN users u ON u.id=ml.actor_id WHERE ml.group_id=? ORDER BY ml.created_at DESC LIMIT ?`);
  s.bind([gid, limit]); const r=[]; while(s.step()) r.push(s.getAsObject()); s.free(); return r;
}

// ── Message deletion ──────────────────────────────────────────────────────────
function deleteMessage(db, msgId) { db.run(`DELETE FROM group_messages WHERE id=?`, [msgId]); }
function deleteMessagesByUser(db, gid, authorId) { db.run(`DELETE FROM group_messages WHERE group_id=? AND author_id=?`, [gid, authorId]); }

// ── Announcements ─────────────────────────────────────────────────────────────
function getAnnouncements(db, gid) {
  const s = db.prepare(`SELECT * FROM announcements WHERE group_id=? ORDER BY created_at`);
  s.bind([gid]); const r=[]; while(s.step()) r.push(s.getAsObject()); s.free(); return r;
}
function addAnnouncement(db, gid, msg, intervalMs) {
  db.run(`INSERT INTO announcements (group_id,message,interval_ms) VALUES (?,?,?)`, [gid, msg, intervalMs||900000]);
}
function deleteAnnouncement(db, id) { db.run(`DELETE FROM announcements WHERE id=?`, [id]); }
function getDueAnnouncements(db) {
  const s = db.prepare(`SELECT a.*, gc.name as group_name FROM announcements a INNER JOIN group_chats gc ON gc.id=a.group_id WHERE a.enabled=1 AND (a.last_sent+a.interval_ms) < ?`);
  s.bind([Date.now()]); const r=[]; while(s.step()) r.push(s.getAsObject()); s.free(); return r;
}
function updateAnnouncementLastSent(db, id) { db.run(`UPDATE announcements SET last_sent=? WHERE id=?`, [Date.now(), id]); }

module.exports = {
  migrateModeration,
  addModerator, removeModerator, getModerators, isModerator, getModRole,
  banUser, unbanUser, getBans, isUserBanned,
  muteUser, unmuteUser, isUserMuted,
  setBannedWords, getBannedWords, censorMessage,
  getGroupSettings, updateGroupSettings,
  addModLog, getModLog,
  deleteMessage, deleteMessagesByUser,
  getAnnouncements, addAnnouncement, deleteAnnouncement, getDueAnnouncements, updateAnnouncementLastSent,
};
