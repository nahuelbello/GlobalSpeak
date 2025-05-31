// backend/routes/users.js

const express   = require('express');
const pool      = require('../db');
const jwt       = require('jsonwebtoken');
require('dotenv').config();

const router     = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * GET /api/users/:id
 * Devuelve detalles de un usuario, sus followersCount, isFollowing,
 * + campos extra (price, languages, specialties, certifications, interests, video_url)
 * + stats (según rol) y progress si es alumno.
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  // 1) Extraer currentUserId (opcional)
  let currentUserId = null;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
      currentUserId = payload.id;
    } catch {
      /* token inválido: ignoramos */
    }
  }

  try {
    // 2) Datos básicos (incluye video_url en users)
    const userRes = await pool.query(
      `SELECT id, name, email, role, bio, avatar_url, nationality,
              price, level, video_url
       FROM users
       WHERE id = $1`,
      [id]
    );
    if (!userRes.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userRes.rows[0];

    // 3) Followers count
    const followersRes = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM follows
       WHERE following_id = $1`,
      [id]
    );
    const followersCount = followersRes.rows[0].count;

    // 4) isFollowing
    let isFollowing = false;
    if (currentUserId) {
      const existRes = await pool.query(
        `SELECT 1
         FROM follows
         WHERE follower_id = $1 AND following_id = $2`,
        [currentUserId, id]
      );
      isFollowing = existRes.rows.length > 0;
    }

    // 5) Campos extra en tablas auxiliares
    const [ langsRes, specsRes, certsRes, intsRes ] = await Promise.all([
      pool.query(`SELECT language      FROM user_languages      WHERE user_id = $1`, [id]),
      pool.query(`SELECT specialty     FROM user_specialties    WHERE user_id = $1`, [id]),
      pool.query(`SELECT certification FROM user_certifications WHERE user_id = $1`, [id]),
      pool.query(`SELECT interest      FROM user_interests     WHERE user_id = $1`, [id]),
    ]);
    const languages      = langsRes.rows.map(r => r.language);
    const specialties    = specsRes.rows.map(r => r.specialty);
    const certifications = certsRes.rows.map(r => r.certification);
    const interests      = intsRes.rows.map(r => r.interest);

    // 6) Stats y progress según rol
    let stats    = {};
    let progress = null;
    if (user.role === 'profesor') {
      const [ studentsRes, lessonsRes ] = await Promise.all([
        pool.query(
          `SELECT COUNT(DISTINCT alumno_id)::int AS studentsCount
           FROM bookings
           WHERE profesor_id = $1
             AND status = 'accepted'`,
          [id]
        ),
        pool.query(
          `SELECT COUNT(*)::int AS lessonsCount
           FROM bookings
           WHERE profesor_id = $1
             AND status = 'accepted'`,
          [id]
        )
      ]);
      stats = {
        studentsCount: studentsRes.rows[0].studentscount,
        lessonsCount:  lessonsRes.rows[0].lessonscount
      };
    } else {
      const [ bookingsRes, progressRes ] = await Promise.all([
        pool.query(
          `SELECT COUNT(*)::int AS bookingsCount
           FROM bookings
           WHERE alumno_id = $1
             AND start_time >= NOW()`,
          [id]
        ),
        pool.query(
          `SELECT level, streak, minutes_total
           FROM progress
           WHERE student_id = $1`,
          [id]
        )
      ]);
      stats = { bookingsCount: bookingsRes.rows[0].bookingscount };
      if (progressRes.rows.length) {
        const p = progressRes.rows[0];
        progress = {
          level:          p.level,
          streak:         p.streak,
          minutesStudied: p.minutes_total
        };
      } else {
        progress = { level: 1, streak: 0, minutesStudied: 0 };
      }
    }

    // 7) Respuesta final
    res.json({
      user,
      followersCount,
      isFollowing,
      languages,
      specialties,
      certifications,
      interests,
      price:    user.price,
      level:    user.level,
      videoUrl: user.video_url,
      stats,
      progress
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching user details' });
  }
});

/**
 * PATCH /api/users/:id
 * Actualiza biografía y nacionalidad (solo esos dos campos).
 */
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { bio, nationality } = req.body;

  // Autorización
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  let payload;
  try {
    payload = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (String(payload.id) !== String(id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    await pool.query(
      `UPDATE users
         SET bio = COALESCE($1, bio),
             nationality = COALESCE($2, nationality)
       WHERE id = $3`,
      [bio, nationality, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error updating user' });
  }
});

/**
 * PATCH /api/users/:id/fields
 * Actualiza campos avanzados: bio, nationality, price, level, video_url
 * + tablas auxiliares (user_languages, user_interests, user_specialties, user_certifications)
 */
router.patch('/:id/fields', async (req, res) => {
  const { id }   = req.params;
  const auth     = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Verificar token
  let payload;
  try {
    payload = jwt.verify(auth.split(' ')[1], JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (payload.id.toString() !== id) {
    return res.status(403).json({ error: 'Forbidden: sólo puedes modificar tu propio perfil' });
  }

  // Campos posibles en el body
  const {
    nationality,
    price,
    level,
    bio,
    videoUrl,
    specialties,
    certifications,
    languages: rawLanguages,
    interests: rawInterests,
    objectives
  } = req.body;

  // Si viene objectives (alumno), lo tratamos como intereses
  const interestsArr = Array.isArray(objectives)
    ? objectives
    : rawInterests;

  // Normalizar idiomas (pueden venir strings o {lang,level})
  let languagesArr;
  if (Array.isArray(rawLanguages)) {
    languagesArr = rawLanguages.map(item =>
      typeof item === 'object' && item.lang ? item.lang : item
    );
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) Actualizar columnas simples
    const updates = [];
    const values  = [];
    let idx = 1;

    if (nationality !== undefined) { updates.push(`nationality = $${idx}`);  values.push(nationality); idx++; }
    if (price       !== undefined) { updates.push(`price       = $${idx}`);  values.push(price);       idx++; }
    if (level       !== undefined) { updates.push(`level       = $${idx}`);  values.push(level);       idx++; }
    if (bio         !== undefined) { updates.push(`bio         = $${idx}`);  values.push(bio);         idx++; }
    if (videoUrl    !== undefined) { updates.push(`video_url   = $${idx}`);  values.push(videoUrl);    idx++; }

    if (updates.length) {
      values.push(id);
      const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`;
      await client.query(sql, values);
    }

    // 2) Tablas auxiliares
    const upsertArray = async (table, column, arr) => {
      if (!Array.isArray(arr)) return;
      await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [id]);
      for (const item of arr) {
        await client.query(
          `INSERT INTO ${table} (user_id, ${column}) VALUES ($1, $2)`,
          [id, item]
        );
      }
    };

    await upsertArray('user_specialties',    'specialty',     specialties);
    await upsertArray('user_certifications', 'certification', certifications);
    await upsertArray('user_languages',      'language',      languagesArr);
    await upsertArray('user_interests',      'interest',      interestsArr);

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error updating fields' });
  } finally {
    client.release();
  }
});

module.exports = router;