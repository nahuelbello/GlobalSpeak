// backend/routes/search.js
const express = require('express');
const pool = require('../db');
const router = express.Router();

// GET /api/search?q=texto
router.get('/', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Falta el parámetro q' });

  try {
    // Buscamos usuarios por nombre
    const usersRes = await pool.query(
      `SELECT id, name, avatar_url
       FROM users
       WHERE name ILIKE $1
       ORDER BY name
       LIMIT 10`,
      [`%${q}%`]
    );

    // Buscamos posts por contenido
    const postsRes = await pool.query(
      `SELECT
         p.id,
         p.content,
         p.media_url,
         p.type,
         p.created_at,
         p.user_id   AS author_id,       -- aquí cambiamos author_id
         u.name      AS author_name,
         u.avatar_url AS author_avatar
       FROM posts p
       JOIN users u ON p.user_id = u.id   -- usamos user_id, no author_id
       WHERE p.content ILIKE $1
       ORDER BY p.created_at DESC
       LIMIT 20`,
      [`%${q}%`]
    );

    res.json({
      users: usersRes.rows,
      posts: postsRes.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;