// ─── Auth & Profile Routes ────────────────────────────────────────────────────
const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db      = require('../db');
const { requireAuth, verifyToken } = require('../middleware/auth');
const { jwtSecret, jwtExpiry, bcryptRounds } = require('../config');

// ─── Register ─────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { username, password, age, location, gender, bio } = req.body;

    // Validation
    if (!username || !password)
      return res.status(400).json({ error: 'Username and password required' });
    if (username.length < 3 || username.length > 20)
      return res.status(400).json({ error: 'Username must be 3–20 characters' });
    if (!/^[a-zA-Z0-9_]+$/.test(username))
      return res.status(400).json({ error: 'Username: letters, numbers and underscores only' });
    if (password.length < 4)
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    if (db.getUserByUsername(username))
      return res.status(409).json({ error: 'Username already taken' });

    const passwordHash = await bcrypt.hash(password, bcryptRounds);
    const id = uuidv4();

    db.createUser({
      id, username, passwordHash,
      age:      age      ? parseInt(age, 10) : null,
      gender:   gender   || null,
      location: location || '',
      bio:      bio      || '',
    });

    const token = jwt.sign({ userId: id, username }, jwtSecret, { expiresIn: jwtExpiry });
    const user  = db.getUserById(id);
    res.status(201).json({ token, user: db.publicProfile(user) });

  } catch (err) {
    console.error('[register]', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ─── Login ────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Username and password required' });

    const user = db.getUserByUsername(username);
    if (!user) return res.status(401).json({ error: 'Invalid username or password' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid username or password' });

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      jwtSecret, { expiresIn: jwtExpiry }
    );
    res.json({ token, user: db.publicProfile(user) });

  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─── Current user ─────────────────────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ─── Update profile ───────────────────────────────────────────────────────────
router.put('/profile', requireAuth, (req, res) => {
  const { age, location, gender, bio, avatar } = req.body;
  db.updateUser(req.userId, {
    age:    age ? parseInt(age, 10) : null,
    location, gender, bio, avatar,
  });
  const updated = db.getUserById(req.userId);
  res.json({ user: db.publicProfile(updated) });
});

// ─── Change password ──────────────────────────────────────────────────────────
router.put('/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: 'Current and new password required' });
    if (newPassword.length < 4)
      return res.status(400).json({ error: 'New password must be at least 4 characters' });

    const user = db.getUserById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const newHash = await bcrypt.hash(newPassword, bcryptRounds);
    // Direct DB update for password
    const rawDb = db.__rawDb;
    if (rawDb) {
      rawDb.run(`UPDATE users SET password_hash = ? WHERE id = ?`, [newHash, req.userId]);
    }
    res.json({ ok: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('[password]', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ─── Delete account ───────────────────────────────────────────────────────────
router.delete('/account', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required to confirm deletion' });

    const user = db.getUserById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Incorrect password' });

    const rawDb = db.__rawDb;
    if (rawDb) {
      // Delete user's groups
      const groups = db.getGroupsByOwner(req.userId);
      for (const g of groups) db.deleteGroup(g.id);
      // Remove friendships, friend requests, blocks
      rawDb.run(`DELETE FROM friendships WHERE user_id = ? OR friend_id = ?`, [req.userId, req.userId]);
      rawDb.run(`DELETE FROM friend_requests WHERE from_id = ? OR to_id = ?`, [req.userId, req.userId]);
      rawDb.run(`DELETE FROM blocks WHERE blocker_id = ? OR blocked_id = ?`, [req.userId, req.userId]);
      // Remove from group memberships and moderator roles
      rawDb.run(`DELETE FROM group_members WHERE user_id = ?`, [req.userId]);
      rawDb.run(`DELETE FROM moderators WHERE user_id = ?`, [req.userId]);
      // Delete the user
      rawDb.run(`DELETE FROM users WHERE id = ?`, [req.userId]);
    }
    res.json({ ok: true, message: 'Account deleted' });
  } catch (err) {
    console.error('[delete-account]', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

module.exports = router;
