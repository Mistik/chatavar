// ─── Group Chat Routes ────────────────────────────────────────────────────────
const router      = require('express').Router();
const { v4: uuid } = require('uuid');
const db           = require('../db');
const { requireAuth, verifyToken } = require('../middleware/auth');

// Optional auth helper
function optionalAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (t) { const d = verifyToken(t); if (d) { req.userId = d.userId; req.username = d.username; } }
  next();
}

// Validate group name: lowercase alphanumeric + hyphens, 3-32 chars
function validName(n) { return /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(n); }

// ── GET /api/groups/mine  ─── groups I own ────────────────────────────────────
router.get('/mine', requireAuth, (req, res) => {
  const groups = db.getGroupsByOwner(req.userId).map(g => ({
    ...g, isOwner: true,
    unread: db.getGroupUnreadCount(g.id, req.userId, 0),
  }));
  res.json({ groups });
});

// ── GET /api/groups/recent  ── groups I've participated in ────────────────────
router.get('/recent', requireAuth, (req, res) => {
  const groups = db.getRecentGroupsForUser(req.userId).map(g => ({
    ...g,
    isOwner: g.owner_id === req.userId,
    unread: db.getGroupUnreadCount(g.id, req.userId, g.last_read || 0),
  }));
  res.json({ groups });
});

// ── POST /api/groups  ─── create a group ──────────────────────────────────────
router.post('/', requireAuth, (req, res) => {
  const { name, title, description, accentColor, ownerMessage } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Group name required' });
  const slug = name.trim().toLowerCase().replace(/\s+/g, '-');
  if (!validName(slug)) return res.status(400).json({ error: 'Name must be 3-32 chars, letters/numbers/hyphens only' });
  if (db.getGroupByName(slug)) return res.status(409).json({ error: 'That name is already taken' });

  const id = uuid();
  db.createGroup({ id, name: slug, title: title?.trim() || slug, ownerId: req.userId, description, accentColor, ownerMessage });
  res.status(201).json({ group: db.getGroupById(id) });
});

// ── GET /api/groups/:name  ─── get group info ─────────────────────────────────
router.get('/:name', optionalAuth, (req, res) => {
  const group = db.getGroupByName(req.params.name);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  const isMember = req.userId ? db.isMember(group.id, req.userId) : false;
  res.json({ group, isMember, isOwner: req.userId === group.owner_id });
});

// ── PUT /api/groups/:name  ─── update group (owner only) ─────────────────────
router.put('/:name', requireAuth, (req, res) => {
  const group = db.getGroupByName(req.params.name);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (group.owner_id !== req.userId) return res.status(403).json({ error: 'Not the owner' });
  const { title, description, accentColor, ownerMessage } = req.body;
  db.updateGroup(group.id, { title, description, accentColor, ownerMessage });
  res.json({ group: db.getGroupById(group.id) });
});

// ── DELETE /api/groups/:name  ─── delete group (owner only) ──────────────────
router.delete('/:name', requireAuth, (req, res) => {
  const group = db.getGroupByName(req.params.name);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (group.owner_id !== req.userId) return res.status(403).json({ error: 'Not the owner' });
  db.deleteGroup(group.id);
  res.json({ ok: true });
});

// ── POST /api/groups/:name/join  ──────────────────────────────────────────────
router.post('/:name/join', requireAuth, (req, res) => {
  const group = db.getGroupByName(req.params.name);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  db.joinGroup(group.id, req.userId);
  res.json({ ok: true, group });
});

// ── POST /api/groups/:name/leave  ─────────────────────────────────────────────
router.post('/:name/leave', requireAuth, (req, res) => {
  const group = db.getGroupByName(req.params.name);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (group.owner_id === req.userId) return res.status(400).json({ error: 'Owner cannot leave; delete the group instead' });
  db.leaveGroup(group.id, req.userId);
  res.json({ ok: true });
});

// ── GET /api/groups/:name/messages  ──────────────────────────────────────────
router.get('/:name/messages', optionalAuth, (req, res) => {
  const group = db.getGroupByName(req.params.name);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  const before = req.query.before ? parseInt(req.query.before) : null;
  const limit  = Math.min(parseInt(req.query.limit) || 100, 200);
  const msgs   = db.getGroupMessages(group.id, limit, before);

  const messages = msgs.map(m => ({
    id:        m.id,
    body:      m.body,
    createdAt: m.created_at,
    author: m.author_id
      ? { id: m.author_id, username: m.username, avatar: m.avatar || null, isRegistered: true }
      : { id: null, username: m.guest_name || 'Anonymous', avatar: null, isRegistered: false },
  }));

  // Mark as read for authenticated members
  if (req.userId && db.isMember(group.id, req.userId)) {
    db.updateLastRead(group.id, req.userId);
  }

  res.json({ messages, groupId: group.id, hasMore: msgs.length === limit });
});

module.exports = router;

// ── GET /api/groups/:name/embed  ─── get embed settings ──────────────────────
router.get('/:name/embed', requireAuth, (req, res) => {
  const group = db.getGroupByName(req.params.name);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (group.owner_id !== req.userId) return res.status(403).json({ error: 'Not the owner' });
  const settings = db.getEmbedSettings(group.id) || {
    embed_type: 'box', width: 250, height: 350, accent_color: 'CC0000',
    ticker_enabled: 1, ticker_width: 200, ticker_height: 30,
    corner: 'bottom-right', show_url: 1,
  };
  res.json({ settings });
});

// ── PUT /api/groups/:name/embed  ─── save embed settings ─────────────────────
router.put('/:name/embed', requireAuth, (req, res) => {
  const group = db.getGroupByName(req.params.name);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (group.owner_id !== req.userId) return res.status(403).json({ error: 'Not the owner' });
  db.upsertEmbedSettings(group.id, req.body);
  const settings = db.getEmbedSettings(group.id);
  res.json({ settings });
});
