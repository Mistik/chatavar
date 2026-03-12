// ─── Moderation API Routes ────────────────────────────────────────────────────
const router = require('express').Router();
const { v4: uuid } = require('uuid');
const db  = require('../db');
const mod = require('../moderation');
const { requireAuth } = require('../middleware/auth');

function rawDb() { return db.__rawDb; }

function requireMod(req, res, next) {
  const group = db.getGroupByName(req.params.name);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  req.group = group;
  const role = mod.getModRole(rawDb(), group.id, req.userId, group.owner_id);
  if (!role) return res.status(403).json({ error: 'Not a moderator' });
  req.modRole = role;
  next();
}
function requireOwner(req, res, next) {
  const group = db.getGroupByName(req.params.name);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (group.owner_id !== req.userId) return res.status(403).json({ error: 'Owner only' });
  req.group = group;
  next();
}

// ── Moderators ────────────────────────────────────────────────────────────────
router.get('/:name/moderators', requireAuth, requireMod, (req, res) => {
  res.json({ moderators: mod.getModerators(rawDb(), req.group.id) });
});
router.post('/:name/moderators', requireAuth, requireOwner, (req, res) => {
  const user = db.getUserByUsername(req.body.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  mod.addModerator(rawDb(), req.group.id, user.id, req.body.role||'mod', req.body.permissions||{}, req.userId);
  mod.addModLog(rawDb(), { groupId:req.group.id, actorId:req.userId, action:'add_mod', targetId:user.id, targetName:user.username });
  res.json({ ok:true, moderators: mod.getModerators(rawDb(), req.group.id) });
});
router.delete('/:name/moderators/:username', requireAuth, requireOwner, (req, res) => {
  const user = db.getUserByUsername(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  mod.removeModerator(rawDb(), req.group.id, user.id);
  mod.addModLog(rawDb(), { groupId:req.group.id, actorId:req.userId, action:'remove_mod', targetId:user.id, targetName:user.username });
  res.json({ ok:true });
});

// ── Bans ──────────────────────────────────────────────────────────────────────
router.get('/:name/bans', requireAuth, requireMod, (req, res) => {
  res.json({ bans: mod.getBans(rawDb(), req.group.id) });
});
router.post('/:name/ban', requireAuth, requireMod, (req, res) => {
  const { username, reason, deleteMessages } = req.body;
  const user = username ? db.getUserByUsername(username) : null;
  if (username && !user) return res.status(404).json({ error:'User not found' });
  if (user && user.id === req.group.owner_id) return res.status(400).json({ error:"Can't ban owner" });
  mod.banUser(rawDb(), { id:uuid(), groupId:req.group.id, userId:user?.id, reason:reason||'', bannedBy:req.userId });
  if (deleteMessages && user) mod.deleteMessagesByUser(rawDb(), req.group.id, user.id);
  if (user) mod.removeModerator(rawDb(), req.group.id, user.id);
  mod.addModLog(rawDb(), { groupId:req.group.id, actorId:req.userId, action:deleteMessages?'easy_ban':'ban', targetId:user?.id, targetName:username, detail:reason||'' });
  res.json({ ok:true });
});
router.post('/:name/unban/:banId', requireAuth, requireMod, (req, res) => {
  mod.unbanUser(rawDb(), req.group.id, req.params.banId);
  mod.addModLog(rawDb(), { groupId:req.group.id, actorId:req.userId, action:'unban', detail:req.params.banId });
  res.json({ ok:true });
});

// ── Mutes ─────────────────────────────────────────────────────────────────────
router.post('/:name/mute', requireAuth, requireMod, (req, res) => {
  const user = db.getUserByUsername(req.body.username);
  if (!user) return res.status(404).json({ error:'User not found' });
  const dur = (req.body.duration||300)*1000;
  mod.muteUser(rawDb(), req.group.id, user.id, dur, req.userId);
  mod.addModLog(rawDb(), { groupId:req.group.id, actorId:req.userId, action:'mute', targetId:user.id, targetName:user.username, detail:`${req.body.duration||300}s` });
  res.json({ ok:true, until:Date.now()+dur });
});
router.post('/:name/unmute', requireAuth, requireMod, (req, res) => {
  const user = db.getUserByUsername(req.body.username);
  if (!user) return res.status(404).json({ error:'User not found' });
  mod.unmuteUser(rawDb(), req.group.id, user.id);
  res.json({ ok:true });
});

// ── Delete messages ───────────────────────────────────────────────────────────
router.delete('/:name/messages/:messageId', requireAuth, requireMod, (req, res) => {
  mod.deleteMessage(rawDb(), req.params.messageId);
  mod.addModLog(rawDb(), { groupId:req.group.id, actorId:req.userId, action:'delete_msg', detail:req.params.messageId });
  res.json({ ok:true });
});
router.delete('/:name/messages/by-user/:username', requireAuth, requireMod, (req, res) => {
  const user = db.getUserByUsername(req.params.username);
  if (!user) return res.status(404).json({ error:'User not found' });
  mod.deleteMessagesByUser(rawDb(), req.group.id, user.id);
  mod.addModLog(rawDb(), { groupId:req.group.id, actorId:req.userId, action:'delete_all_msgs', targetId:user.id, targetName:user.username });
  res.json({ ok:true });
});

// ── Banned words ──────────────────────────────────────────────────────────────
router.get('/:name/banned-words', requireAuth, requireOwner, (req, res) => {
  const words = mod.getBannedWords(rawDb(), req.group.id);
  res.json({ parts: words.filter(w=>w.match_type==='part').map(w=>w.word), exact: words.filter(w=>w.match_type==='exact').map(w=>w.word) });
});
router.put('/:name/banned-words', requireAuth, requireOwner, (req, res) => {
  if (Array.isArray(req.body.parts)) mod.setBannedWords(rawDb(), req.group.id, req.body.parts, 'part');
  if (Array.isArray(req.body.exact)) mod.setBannedWords(rawDb(), req.group.id, req.body.exact, 'exact');
  res.json({ ok:true });
});

// ── Group settings ────────────────────────────────────────────────────────────
router.get('/:name/settings', requireAuth, requireMod, (req, res) => {
  res.json({ settings: mod.getGroupSettings(rawDb(), req.group.id) });
});
router.put('/:name/settings', requireAuth, requireOwner, (req, res) => {
  mod.updateGroupSettings(rawDb(), req.group.id, req.body);
  res.json({ settings: mod.getGroupSettings(rawDb(), req.group.id) });
});

// ── Mod log ───────────────────────────────────────────────────────────────────
router.get('/:name/mod-log', requireAuth, requireMod, (req, res) => {
  res.json({ log: mod.getModLog(rawDb(), req.group.id, Math.min(parseInt(req.query.limit)||50, 200)) });
});

// ── Announcements ─────────────────────────────────────────────────────────────
router.get('/:name/announcements', requireAuth, requireOwner, (req, res) => {
  res.json({ announcements: mod.getAnnouncements(rawDb(), req.group.id) });
});
router.post('/:name/announcements', requireAuth, requireOwner, (req, res) => {
  if (!req.body.message?.trim()) return res.status(400).json({ error:'Message required' });
  mod.addAnnouncement(rawDb(), req.group.id, req.body.message.trim(), (req.body.intervalMinutes||15)*60000);
  res.json({ announcements: mod.getAnnouncements(rawDb(), req.group.id) });
});
router.delete('/:name/announcements/:id', requireAuth, requireOwner, (req, res) => {
  mod.deleteAnnouncement(rawDb(), parseInt(req.params.id));
  res.json({ ok:true });
});

// ── Get my mod role for a group ───────────────────────────────────────────────
router.get('/:name/my-role', requireAuth, (req, res) => {
  const group = db.getGroupByName(req.params.name);
  if (!group) return res.status(404).json({ error:'Group not found' });
  const role = mod.getModRole(rawDb(), group.id, req.userId, group.owner_id);
  const settings = mod.getGroupSettings(rawDb(), group.id);
  res.json({ role: role || null, settings });
});

module.exports = router;
