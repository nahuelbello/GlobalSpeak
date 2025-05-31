// backend/routes/progress.js

const express = require('express');
const jwt     = require('jsonwebtoken');
const pool    = require('../db');
require('dotenv').config();

const router     = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * GET /api/progress
 * Devuelve el progreso (level, streak, minutes_total) del alumno autenticado.
 */
router.get('/', async (req, res) => {
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
  if (payload.role !== 'alumno') {
    return res.status(403).json({ error: 'Forbidden: only students' });
  }

  try {
    const result = await pool.query(
      `SELECT level, streak, minutes_total
       FROM progress
       WHERE student_id = $1`,
      [payload.id]
    );
    if (!result.rows.length) {
      // Si aún no existe, inicializamos
      await pool.query(
        `INSERT INTO progress (student_id) VALUES ($1)`,
        [payload.id]
      );
      return res.json({ progress: { level:1, streak:0, minutes_total:0 } });
    }
    const p = result.rows[0];
    res.json({
      progress: {
        level:          p.level,
        streak:         p.streak,
        minutesStudied: p.minutes_total
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching progress' });
  }
});

module.exports = router;