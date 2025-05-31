// backend/routes/windows.js
const express  = require('express');
const jwt      = require('jsonwebtoken');
const pool     = require('../db');
require('dotenv').config();
const router   = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * GET /api/windows?teacherId=…
 * Devuelve las ventanas de un profesor.
 */
router.get('/', async (req, res) => {
  const teacherId = req.query.teacherId;
  if (!teacherId) {
    return res.status(400).json({ error: 'Missing teacherId parameter' });
  }
  try {
    const result = await pool.query(
      `SELECT id, weekday, start_time, end_time, duration
       FROM windows
       WHERE user_id = $1
       ORDER BY weekday, start_time`,
      [teacherId]
    );
    res.json({ windows: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching windows' });
  }
});

/**
 * POST /api/windows
 * Crea una nueva ventana (profesores sólo).
 * Body: { weekday, start_time, end_time, duration }
 */
router.post('/', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  let payload;
  try {
    payload = jwt.verify(auth.split(' ')[1], JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (payload.role !== 'profesor') {
    return res.status(403).json({ error: 'Forbidden: only professors' });
  }

  const userId    = payload.id;
  const { weekday, start_time, end_time, duration } = req.body;
  if (
    weekday === undefined ||
    !start_time ||
    !end_time ||
    !duration
  ) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO windows (user_id, weekday, start_time, end_time, duration)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, weekday, start_time, end_time, duration`,
      [userId, weekday, start_time, end_time, duration]
    );
    res.status(201).json({ window: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating window' });
  }
});

/**
 * DELETE /api/windows/:id
 * Elimina una ventana (sólo su dueño profesor).
 */
router.delete('/:id', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  let payload;
  try {
    payload = jwt.verify(auth.split(' ')[1], JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (payload.role !== 'profesor') {
    return res.status(403).json({ error: 'Forbidden: only professors' });
  }

  const winId = req.params.id;
  try {
    // Verificar que la ventana exista y sea del profesor
    const chk = await pool.query(
      'SELECT user_id FROM windows WHERE id = $1',
      [winId]
    );
    if (!chk.rows.length) {
      return res.status(404).json({ error: 'Window not found' });
    }
    if (chk.rows[0].user_id !== payload.id) {
      return res.status(403).json({ error: 'Forbidden: not your window' });
    }

    await pool.query('DELETE FROM windows WHERE id = $1', [winId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error deleting window' });
  }
});

module.exports = router;