// backend/routes/weeklyAvailability.js
const express = require('express');
const jwt     = require('jsonwebtoken');
const pool    = require('../db');
require('dotenv').config();

const router     = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// GET /api/weeklyAvailability/:teacherId
router.get('/:teacherId', async (req, res) => {
  const { teacherId } = req.params;
  try {
    const result = await pool.query(
      `SELECT id, weekday, start_time, end_time
       FROM weekly_availability
       WHERE user_id = $1
       ORDER BY weekday, start_time`,
      [teacherId]
    );
    res.json({ rules: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching weekly availability' });
  }
});

// PUT /api/weeklyAvailability
// Body: { rules: [ { weekday, start_time, end_time }, ... ] }
router.put('/', async (req, res) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  let payload;
  try { payload = jwt.verify(auth.split(' ')[1], JWT_SECRET); }
  catch { return res.status(401).json({ error: 'Invalid token' }); }

  const userId = payload.id;
  const { rules } = req.body;
  if (!Array.isArray(rules)) {
    return res.status(400).json({ error: 'Invalid rules array' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Borramos las viejas
    await client.query(
      `DELETE FROM weekly_availability WHERE user_id = $1`,
      [userId]
    );
    // Insertamos las nuevas
    for (const { weekday, start_time, end_time } of rules) {
      await client.query(
        `INSERT INTO weekly_availability 
           (user_id, weekday, start_time, end_time)
         VALUES ($1, $2, $3, $4)`,
        [userId, weekday, start_time, end_time]
      );
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error updating weekly availability' });
  } finally {
    client.release();
  }
});

module.exports = router;