// backend/routes/avatar.js

const express   = require('express');
const multer    = require('multer');
const sharp     = require('sharp');
const path      = require('path');
const jwt       = require('jsonwebtoken');
const pool      = require('../db');
require('dotenv').config();

const router     = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// Multer en memoria para luego procesar con Sharp
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB máx
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Solo se permiten imágenes'), false);
    }
    cb(null, true);
  },
});

// Ruta: POST /api/users/:id/avatar
router.post(
  '/api/users/:id/avatar',
  upload.single('avatar'),
  async (req, res) => {
    const { id } = req.params;
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
    if (String(payload.id) !== String(id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      // Genera un nombre único y guarda como PNG 256×256
      const filename = `avatar-${id}-${Date.now()}.png`;
      const outPath  = path.join(__dirname, '../public/avatars', filename);

      await sharp(req.file.buffer)
        .resize(256, 256)
        .png()
        .toFile(outPath);

      const avatarUrl = `/avatars/${filename}`;

      // Actualiza la URL en la BD
      await pool.query(
        'UPDATE users SET avatar_url = $1 WHERE id = $2',
        [avatarUrl, id]
      );

      res.json({ avatar_url: avatarUrl });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error processing image' });
    }
  }
);

module.exports = router;