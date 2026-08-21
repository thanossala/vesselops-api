const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool.js');
const { verifyToken } = require('../middleware/auth.js');

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  // Role is intentionally NOT accepted from the request body. Letting a client
  // self-assign role: 'admin' / 'captain' at signup would be a privilege
  // escalation — every new account starts as 'officer' and elevated roles
  // must be granted separately (e.g. by an admin), not chosen by the signer-upper.
  const role = 'officer';
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });
  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0)
      return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const r = await pool.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1,$2,$3) RETURNING id, email, role',
      [email, hash, role]
    );
    const token = jwt.sign(r.rows[0], process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: r.rows[0] });
  } catch (err) {
    console.error('REGISTER ERROR:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });

  try {
    const r = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = r.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me  — requires valid token
router.get('/me', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
