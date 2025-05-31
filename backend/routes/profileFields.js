// backend/routes/profileFields.js

const express = require('express');
const pool = require('../db');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// PATCH /api/users/:id/fields
router.patch('/users/:id/fields', async (req, res) => {
  const { id } = req.params;
  const { interests, languages, specialties, certifications, price, level } = req.body;
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

  let payload;
  try { payload = jwt.verify(auth.split(' ')[1], JWT_SECRET); }
  catch { return res.status(401).json({ error: 'Invalid token' }); }
  if (String(payload.id) !== String(id)) return res.status(403).json({ error: 'Forbidden' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Intereses (alumno)
    if (interests) {
      await client.query(`DELETE FROM user_interests WHERE user_id = $1`, [id]);
      for (const interest of interests) {
        await client.query(`INSERT INTO user_interests (user_id, interest) VALUES ($1, $2)`, [id, interest]);
      }
    }

    // Idiomas (profesor)
    if (languages) {
      await client.query(`DELETE FROM user_languages WHERE user_id = $1`, [id]);
      for (const lang of languages) {
        await client.query(`INSERT INTO user_languages (user_id, language) VALUES ($1, $2)`, [id, lang]);
      }
    }

    // Especialidades (profesor)
    if (specialties) {
      await client.query(`DELETE FROM user_specialties WHERE user_id = $1`, [id]);
      for (const sp of specialties) {
        await client.query(`INSERT INTO user_specialties (user_id, specialty) VALUES ($1, $2)`, [id, sp]);
      }
    }

    // Certificaciones (profesor)
    if (certifications) {
      await client.query(`DELETE FROM user_certifications WHERE user_id = $1`, [id]);
      for (const cert of certifications) {
        await client.query(`INSERT INTO user_certifications (user_id, certification) VALUES ($1, $2)`, [id, cert]);
      }
    }

    // Precio (profesor)
    if (price !== undefined) {
      await client.query(`UPDATE users SET price = $1 WHERE id = $2`, [price, id]);
    }

    // Nivel (alumno)
    if (level !== undefined) {
      // En progreso (table), si existe actualizá, si no insertá
      const exists = await client.query(`SELECT 1 FROM progress WHERE student_id = $1`, [id]);
      if (exists.rows.length) {
        await client.query(`UPDATE progress SET level = $1 WHERE student_id = $2`, [level, id]);
      } else {
        await client.query(`INSERT INTO progress (student_id, level) VALUES ($1, $2)`, [id, level]);
      }
    }

    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error updating fields' });
  } finally {
    client.release();
  }
});

module.exports = router;