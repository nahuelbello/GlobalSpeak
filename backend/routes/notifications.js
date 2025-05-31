// backend/routes/notifications.js
const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');
require('dotenv').config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// GET /api/notifications — lista notifs del user (p.ej. últimos 20)
router.get('/', async (req, res) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  let payload;
  try { payload = jwt.verify(auth.split(' ')[1], JWT_SECRET); }
  catch { return res.status(401).json({ error: 'Invalid token' }); }

  try {
    const result = await pool.query(
      `SELECT id, type, message, link, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [payload.id]
    );
    res.json({ notifications: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching notifications' });
  }
});

// PATCH /api/notifications/:id/read — marcar como leída
router.patch('/:id/read', async (req, res) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  let payload;
  try { payload = jwt.verify(auth.split(' ')[1], JWT_SECRET); }
  catch { return res.status(401).json({ error: 'Invalid token' }); }

  try {
    const result = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, payload.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ notification: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error updating notification' });
  }
});

module.exports = router;