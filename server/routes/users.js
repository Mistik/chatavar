// ─── User Lookup Routes ───────────────────────────────────────────────────────
const router   = require('express').Router();
const db       = require('../db');
const presence = require('../presence');

// GET /api/users/:username — public profile + online status
router.get('/:username', (req, res) => {
  const user = db.getUserByUsername(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({
    user: { ...db.publicProfile(user), online: presence.isOnline(user.id) },
  });
});

module.exports = router;

const { requireAuth } = require('../middleware/auth');

// GET /api/users/me/blocked — list my blocked users
router.get('/me/blocked', requireAuth, (req, res) => {
  const blocked = db.getBlockedUsers(req.userId);
  res.json({ blocked });
});
