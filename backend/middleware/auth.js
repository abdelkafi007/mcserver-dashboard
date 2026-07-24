const crypto = require('crypto');

// In-memory session store (fine for single-admin use)
const sessions = new Set();

function generateToken() {
  return crypto.randomBytes(48).toString('hex');
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  const token = authHeader.slice(7);
  if (!sessions.has(token)) {
    return res.status(401).json({ success: false, error: 'Invalid or expired session' });
  }
  next();
}

function createSession(password) {
  if (password === process.env.ADMIN_PASSWORD) {
    const token = generateToken();
    sessions.add(token);
    return token;
  }
  return null;
}

function destroySession(token) {
  sessions.delete(token);
}

module.exports = { authMiddleware, createSession, destroySession, sessions };
