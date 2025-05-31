const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');
require('dotenv').config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// GET /api/posts?userId=
router.get('/', async (req, res) => {
  try {
    let result;
    if (req.query.userId) {
      result = await pool.query(`
        SELECT p.id, p.content, p.media_url, p.type, p.created_at,
               u.id AS user_id, u.name, u.avatar_url
        FROM posts p
        JOIN users u ON u.id = p.user_id
        WHERE p.user_id = $1
        ORDER BY p.created_at DESC
      `, [req.query.userId]);
    } else {
      result = await pool.query(`
        SELECT p.id, p.content, p.media_url, p.type, p.created_at,
               u.id AS user_id, u.name, u.avatar_url
        FROM posts p
        JOIN users u ON u.id = p.user_id
        ORDER BY p.created_at DESC
      `);
    }
    res.json({ posts: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching posts' });
  }
});

// POST /api/posts — creación de post (ya tenías este código)
router.post('/', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const { content, media_url = null, type = 'text' } = req.body;
    if (!content) return res.status(400).json({ error: 'Missing content' });
    const result = await pool.query(
      `INSERT INTO posts (user_id, content, media_url, type, created_at)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [payload.id, content, media_url, type]
    );
    res.status(201).json({ post: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;