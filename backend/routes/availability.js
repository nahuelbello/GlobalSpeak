const express   = require('express');
const jwt       = require('jsonwebtoken');
const pool      = require('../db');
require('dotenv').config();

const router     = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * GET /api/availability?teacherId=…
 * Lista las franjas puntuales de disponibilidad del profesor.
 */
router.get('/', async (req, res) => {
  const teacherId = req.query.teacherId;
  if (!teacherId) {
    return res.status(400).json({ error: 'Missing teacherId parameter' });
  }
  try {
    const result = await pool.query(
      `SELECT id, start_time, end_time
       FROM availability
       WHERE user_id = $1
         AND end_time >= NOW()              -- sólo futuras
       ORDER BY start_time`,
      [teacherId]
    );
    res.json({ availability: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching availability' });
  }
});

/**
 * POST /api/availability
 * Crea una nueva franja puntual. Sólo profesores.
 */
router.post('/', async (req, res) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  let payload;
  try {
    payload = jwt.verify(auth.split(' ')[1], JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (payload.role !== 'profesor') {
    return res.status(403).json({ error: 'Forbidden: only professors can set availability' });
  }

  const userId = payload.id;
  const { start_time, end_time } = req.body;
  if (!start_time || !end_time) {
    return res.status(400).json({ error: 'Missing start_time or end_time' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO availability (user_id, start_time, end_time)
       VALUES ($1, $2, $3)
       RETURNING id, start_time, end_time`,
      [userId, start_time, end_time]
    );
    res.status(201).json({ slot: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating availability slot' });
  }
});

/**
 * DELETE /api/availability/:id
 * Elimina una franja puntual. Sólo el profesor propietario.
 */
router.delete('/:id', async (req, res) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  let payload;
  try {
    payload = jwt.verify(auth.split(' ')[1], JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (payload.role !== 'profesor') {
    return res.status(403).json({ error: 'Forbidden: only professors can delete availability' });
  }

  const slotId = req.params.id;
  try {
    const check = await pool.query(
      'SELECT user_id FROM availability WHERE id = $1',
      [slotId]
    );
    if (!check.rows.length) {
      return res.status(404).json({ error: 'Slot not found' });
    }
    if (check.rows[0].user_id !== payload.id) {
      return res.status(403).json({ error: 'Forbidden: cannot delete others slots' });
    }

    await pool.query('DELETE FROM availability WHERE id = $1', [slotId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error deleting slot' });
  }
});

/**
 * GET /api/availability/weekly?teacherId=…
 * Lista las franjas semanales recurrentes del profesor.
 */
router.get('/weekly', async (req, res) => {
  const teacherId = req.query.teacherId;
  if (!teacherId) {
    return res.status(400).json({ error: 'Missing teacherId parameter' });
  }
  try {
    const result = await pool.query(
      `SELECT id, weekday, start_time, end_time
       FROM weekly_availability
       WHERE user_id = $1
       ORDER BY weekday, start_time`,
      [teacherId]
    );
    res.json({ slots: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching weekly availability' });
  }
});

/**
 * POST /api/availability/weekly
 * Crea una nueva franja semanal recurrente. Sólo profesores.
 */
router.post('/weekly', async (req, res) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  let payload;
  try {
    payload = jwt.verify(auth.split(' ')[1], JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (payload.role !== 'profesor') {
    return res.status(403).json({ error: 'Forbidden: only professors can set weekly availability' });
  }

  const userId = payload.id;
  const { weekday, start_time, end_time } = req.body;
  if (weekday == null || !start_time || !end_time) {
    return res.status(400).json({ error: 'Missing weekday, start_time or end_time' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO weekly_availability (user_id, weekday, start_time, end_time)
       VALUES ($1, $2, $3, $4)
       RETURNING id, weekday, start_time, end_time`,
      [userId, weekday, start_time, end_time]
    );
    res.status(201).json({ slot: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating weekly availability slot' });
  }
});

/**
 * DELETE /api/availability/weekly/:id
 * Elimina una franja semanal. Sólo el profesor propietario.
 */
router.delete('/weekly/:id', async (req, res) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  let payload;
  try {
    payload = jwt.verify(auth.split(' ')[1], JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (payload.role !== 'profesor') {
    return res.status(403).json({ error: 'Forbidden: only professors can delete weekly availability' });
  }

  const slotId = req.params.id;
  try {
    const check = await pool.query(
      'SELECT user_id FROM weekly_availability WHERE id = $1',
      [slotId]
    );
    if (!check.rows.length) {
      return res.status(404).json({ error: 'Slot not found' });
    }
    if (check.rows[0].user_id !== payload.id) {
      return res.status(403).json({ error: 'Forbidden: cannot delete others slots' });
    }

    await pool.query('DELETE FROM weekly_availability WHERE id = $1', [slotId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error deleting weekly slot' });
  }
});

module.exports = router;