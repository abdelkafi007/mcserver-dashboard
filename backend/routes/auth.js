const express = require('express');
const router = express.Router();
const { createSession, destroySession, authMiddleware, sessions } = require('../middleware/auth');

// POST /api/auth/login — no auth required
router.post('/login', (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ success: false, error: 'Password is required' });
  }

  const token = createSession(password);

  if (!token) {
    return res.status(401).json({ success: false, error: 'Invalid password' });
  }

  res.json({ success: true, token });
});

// POST /api/auth/verify — requires valid token
router.post('/verify', authMiddleware, (req, res) => {
  res.json({ success: true });
});

// POST /api/auth/logout — requires valid token
router.post('/logout', authMiddleware, (req, res) => {
  const token = req.headers.authorization.slice(7);
  destroySession(token);
  res.json({ success: true, message: 'Logged out' });
});

module.exports = router;
