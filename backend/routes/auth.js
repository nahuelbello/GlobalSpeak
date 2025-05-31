// backend/routes/auth.js

const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const pool    = require('../db');
require('dotenv').config();

const router     = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * POST /api/auth/signup
 * Crea un nuevo usuario (alumno o profesor), guardando timezone opcional.
 */
router.post('/signup', async (req, res) => {
  const { name, email, password, role, timezone } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  try {
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users
         (name, email, password, role, timezone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, timezone`,
      [name, email, hashed, role, timezone || null]
    );
    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ user, token });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/auth/signin
 * Autentica y devuelve usuario + token.
 */
router.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  try {
    const result = await pool.query(
      `SELECT id, name, email, password, role, timezone, video_url
       FROM users
       WHERE email = $1`,
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    // No devolvemos la contraseña
    delete user.password;
    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/auth/me
 * Devuelve el usuario logueado a partir del token.
 */
router.get('/me', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const result = await pool.query(
      `SELECT id, name, email, role, bio, avatar_url,
              nationality, timezone, video_url
       FROM users
       WHERE id = $1`,
      [payload.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;