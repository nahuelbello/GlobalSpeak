// backend/routes/follows.js

const express  = require('express');
const jwt      = require('jsonwebtoken');
const pool     = require('../db');
require('dotenv').config();

const router   = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// POST /api/follows  — toggle follow/unfollow
// Body: { followingId: number }
router.post('/', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  const token = auth.split(' ')[1];

  try {
    const { id: followerId } = jwt.verify(token, JWT_SECRET);
    const { followingId }      = req.body;
    if (!followingId) {
      return res.status(400).json({ error: 'Missing followingId' });
    }
    // Check if already following
    const exists = await pool.query(
      `SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2`,
      [followerId, followingId]
    );
    if (exists.rows.length) {
      // Unfollow
      await pool.query(
        `DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`,
        [followerId, followingId]
      );
      return res.json({ following: false });
    } else {
      // Follow
      await pool.query(
        `INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)`,
        [followerId, followingId]
      );
      // Notificación al seguido
      await pool.query(
        `INSERT INTO notifications (user_id, type, message, link, created_at)
         VALUES ($1, 'followed', 'Tienes un nuevo seguidor.', '/profile/${followerId}', NOW())`,
        [followingId]
      );
      return res.json({ following: true });
    }
  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: 'Invalid token or server error' });
  }
});
// GET /api/follows/followers/:userId — devuelve count y array de followers
router.get('/followers/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const result = await pool.query(
        `SELECT u.id, u.name, u.avatar_url
         FROM follows f
         JOIN users u ON f.follower_id = u.id
         WHERE f.following_id = $1`,
        [userId]
      );
      res.json({ count: result.rows.length, followers: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error fetching followers' });
    }
  });

module.exports = router;