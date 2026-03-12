// ─── User Routes ──────────────────────────────────────────────────────────────
const router   = require('express').Router();
const db       = require('../db');
const presence = require('../presence');
const { requireAuth } = require('../middleware/auth');

// GET /api/users/me/blocked — list my blocked users
router.get('/me/blocked', requireAuth, (req, res) => {
  const blocked = db.getBlockedUsers(req.userId);
  res.json({ blocked });
});

// GET /api/users/me/settings — get my settings
router.get('/me/settings', requireAuth, (req, res) => {
  res.json({ settings: db.getUserSettings(req.userId) });
});

// PUT /api/users/me/settings — update my settings
router.put('/me/settings', requireAuth, (req, res) => {
  db.updateUserSettings(req.userId, req.body);
  res.json({ settings: db.getUserSettings(req.userId) });
});

// POST /api/users/:username/report — report a user
router.post('/:username/report', requireAuth, (req, res) => {
  const target = db.getUserByUsername(req.params.username);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.id === req.userId) return res.status(400).json({ error: "Can't report yourself" });

  const result = db.reportUser(req.userId, target.id, req.body.reason || '', req.body.context || '');
  if (result.alreadyReported) {
    return res.json({ ok: true, message: 'You have already reported this user' });
  }
  res.json({ ok: true, message: 'Report submitted. Thank you.' });
});

// GET /api/users/:username — public profile + online status
router.get('/:username', (req, res) => {
  const user = db.getUserByUsername(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Check if user is hidden from members
  const settings = db.getUserSettings(user.id);
  const profile = db.publicProfile(user);

  res.json({
    user: {
      ...profile,
      online: presence.isOnline(user.id),
      restricted: db.isRestricted(user.id) || false,
    },
  });
});

module.exports = router;
