// backend/routes/bookings.js

const express = require('express');
const jwt     = require('jsonwebtoken');
const pool    = require('../db');
require('dotenv').config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * GET /api/bookings?alumnoId=…&profesorId=…
 * Lista reservas filtrando por alumno o profesor.
 * Requiere token válido.
 */
router.get('/', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  let payload;
  try {
    payload = jwt.verify(auth.split(' ')[1], JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { alumnoId, profesorId } = req.query;
  let sql = `
    SELECT 
      b.id,
      b.alumno_id,
      b.profesor_id,
      b.start_time AS start_time,
      b.end_time   AS end_time,
      b.status,
      u.name AS alumno_name,
      p.name AS profesor_name
    FROM bookings b
    JOIN users u ON u.id = b.alumno_id
    JOIN users p ON p.id = b.profesor_id
  `;
  const params = [];
  const conditions = [];

  if (alumnoId) {
    params.push(alumnoId);
    conditions.push(`b.alumno_id = $${params.length}`);
  }
  if (profesorId) {
    params.push(profesorId);
    conditions.push(`b.profesor_id = $${params.length}`);
  }
  if (conditions.length) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY b.start_time';

  try {
    const result = await pool.query(sql, params);
    res.json({ bookings: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching bookings' });
  }
});

/**
 * POST /api/bookings
 * Crea una reserva directamente con start_time/end_time y la auto-acepta.
 * Body: { profesor_id, start_time, end_time }
 * Solo alumnos pueden reservar.
 */
router.post('/', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let payload;
  try {
    payload = jwt.verify(auth.split(' ')[1], JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (payload.role !== 'alumno') {
    return res.status(403).json({ error: 'Forbidden: only students can book' });
  }

  const studentId = payload.id;
  const { profesor_id, start_time, end_time } = req.body;

  if (!profesor_id || !start_time || !end_time) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    // 1) Creamos el booking y lo auto-aceptamos
    const bookingRes = await pool.query(
      `INSERT INTO bookings
         (alumno_id, profesor_id, start_time, end_time, status)
       VALUES ($1, $2, $3, $4, 'accepted')
       RETURNING id, alumno_id, profesor_id, start_time, end_time, status`,
      [studentId, profesor_id, start_time, end_time]
    );
    const booking = bookingRes.rows[0];

    // 2) Notificación para el profesor
    await pool.query(
      `INSERT INTO notifications
         (user_id, type, message, link, created_at)
       VALUES
         ($1, 'booking_created', 'Tienes una nueva reserva de un alumno.', '/profile/${studentId}', NOW())`,
      [profesor_id]
    );

    // 3) Notificación para el alumno
    await pool.query(
      `INSERT INTO notifications
         (user_id, type, message, link, created_at)
       VALUES
         ($1, 'booking_confirmed', 'Tu reserva ha sido confirmada.', '/profile/${profesor_id}', NOW())`,
      [studentId]
    );

    res.status(201).json({ booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating booking' });
  }
});

/**
 * PATCH /api/bookings/:id
 * Actualiza el estado de una reserva (pending, accepted, cancelled).
 * Además, al aceptar, crea (si no existía) una sala de chat única
 * para esa pareja alumno–profesor.
 */
router.patch('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'accepted', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Obtener booking previo
    const prevBooking = await pool.query(
      'SELECT * FROM bookings WHERE id = $1',
      [req.params.id]
    );
    if (!prevBooking.rows.length) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    const booking = prevBooking.rows[0];

    // Actualiza el estado
    const result = await pool.query(
      'UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    const updated = result.rows[0];

    // Notificaciones según cambio de estado
    if (status === 'cancelled') {
      // Notificar a ambos
      await pool.query(
        `INSERT INTO notifications
           (user_id, type, message, link, created_at)
         VALUES
           ($1, 'booking_cancelled', 'Tu clase fue cancelada.', '/profile/${booking.profesor_id}', NOW()),
           ($2, 'booking_cancelled', 'Una clase fue cancelada.', '/profile/${booking.alumno_id}', NOW())`,
        [booking.alumno_id, booking.profesor_id]
      );
    }

    if (status === 'accepted') {
      // Notificar alumno
      await pool.query(
        `INSERT INTO notifications
           (user_id, type, message, link, created_at)
         VALUES
           ($1, 'booking_accepted', 'El profesor aceptó tu clase.', '/profile/${booking.profesor_id}', NOW())`,
        [booking.alumno_id]
      );
      // Crear sala de chat (si no existe)
      await pool.query(
        `INSERT INTO chat_rooms (alumno_id, profesor_id)
         VALUES ($1, $2)
         ON CONFLICT (alumno_id, profesor_id) DO NOTHING`,
        [booking.alumno_id, booking.profesor_id]
      );
    }

    res.json({ booking: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error updating booking' });
  }
});

module.exports = router;