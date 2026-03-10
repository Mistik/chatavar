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

module.exports = router;
