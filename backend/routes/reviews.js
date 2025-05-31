// backend/routes/reviews.js
const express = require('express');
const pool = require('../db');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * GET /api/reviews?teacherId=…
 * Devuelve las reseñas de un profesor.
 */
router.get('/', async (req, res) => {
  const { teacherId } = req.query;
  if (!teacherId) {
    return res.status(400).json({ error: 'Missing teacherId parameter' });
  }
  try {
    const result = await pool.query(`
      SELECT r.id,
             r.rating,
             r.text,
             r.created_at,
             u.id   AS student_id,
             u.name AS student_name
      FROM reviews r
      JOIN users u ON u.id = r.student_id
      WHERE r.teacher_id = $1
      ORDER BY r.created_at DESC
    `, [teacherId]);
    res.json({ reviews: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching reviews' });
  }
});

/**
 * POST /api/reviews
 * Crea una nueva reseña. Body: { teacherId, rating, text }
 * El alumno se extrae del token JWT.
 */
router.post('/', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let studentId;
  try {
    const payload = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    studentId = payload.id;
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { teacherId, rating, text } = req.body;
  if (!teacherId || !rating) {
    return res.status(400).json({ error: 'teacherId and rating are required' });
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  try {
    const insertRes = await pool.query(
      `INSERT INTO reviews (teacher_id, student_id, rating, text)
       VALUES ($1, $2, $3, $4)
       RETURNING id, teacher_id, student_id, rating, text, created_at`,
      [teacherId, studentId, rating, text || null]
    );
    const review = insertRes.rows[0];

    // También devolver nombre del alumno
    const userRes = await pool.query(
      `SELECT name FROM users WHERE id = $1`,
      [studentId]
    );
    review.student_name = userRes.rows[0].name;

    // Notificación al profesor
    await pool.query(
      `INSERT INTO notifications (user_id, type, message, link, created_at)
       VALUES ($1, 'review_received', 'Has recibido una nueva reseña de un alumno.', '/profile/${studentId}', NOW())`,
      [teacherId]
    );

    res.status(201).json({ review });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating review' });
  }
});

module.exports = router;