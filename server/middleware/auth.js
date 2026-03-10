// ─── Auth Middleware ──────────────────────────────────────────────────────────
const jwt  = require('jsonwebtoken');
const db   = require('../db');
const { jwtSecret } = require('../config');

/**
 * Verifies the Bearer token and attaches req.user (public profile).
 * Returns 401 if missing/invalid/user-not-found.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  let decoded;
  try {
    decoded = jwt.verify(token, jwtSecret);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const user = db.getUserById(decoded.userId);
  if (!user) return res.status(401).json({ error: 'User no longer exists' });

  req.user   = db.publicProfile(user);
  req.userId = user.id;
  next();
}

/**
 * Verify a raw JWT string (used by socket auth).
 * Returns the decoded payload or null.
 */
function verifyToken(token) {
  try { return jwt.verify(token, jwtSecret); }
  catch { return null; }
}

module.exports = { requireAuth, verifyToken };
