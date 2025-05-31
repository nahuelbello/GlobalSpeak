// backend/routes/chat_rooms.js
const express = require('express');
const jwt     = require('jsonwebtoken');
const pool    = require('../db');
require('dotenv').config();
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * GET /api/chat_rooms/:bookingId
 * Devuelve el chatRoomId asociado a esa reserva.
 */
router.get('/:bookingId', async (req, res) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    jwt.verify(auth.split(' ')[1], JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const bookingId = req.params.bookingId;
  try {
    // 1) Saco alumno y profe de la reserva
    const bk = await pool.query(
      `SELECT alumno_id, profesor_id FROM bookings WHERE id = $1`,
      [bookingId]
    );
    if (!bk.rows.length) return res.status(404).json({ error: 'Booking not found' });
    const { alumno_id, profesor_id } = bk.rows[0];

    // 2) Busco (o creo) el chat_room
    const chat = await pool.query(
      `INSERT INTO chat_rooms (alumno_id, profesor_id)
         VALUES ($1,$2)
       ON CONFLICT (alumno_id, profesor_id) DO UPDATE SET alumno_id=EXCLUDED.alumno_id
       RETURNING id`,
      [alumno_id, profesor_id]
    );

    res.json({ chatRoomId: chat.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching chat room' });
  }
});

module.exports = router;