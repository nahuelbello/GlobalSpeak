const express = require('express');
const jwt     = require('jsonwebtoken');
const pool    = require('../db');
const multer  = require('multer');
const path    = require('path');
const sharp   = require('sharp');
require('dotenv').config();

const router     = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const upload     = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

// GET /api/messages?chatRoomId=…
router.get('/', async (req, res) => {
  const { chatRoomId } = req.query;
  if (!chatRoomId) return res.status(400).json({ error: 'Missing chatRoomId' });
  try {
    const result = await pool.query(
      `SELECT 
         id,
         booking_id   AS "bookingId",
         chat_room_id AS "chatRoomId",
         sender_id    AS "senderId",
         content,
         file_url     AS "fileUrl",
         type,
         created_at,
         read_at
       FROM messages
       WHERE chat_room_id = $1
       ORDER BY created_at`,
      [chatRoomId]
    );
    res.json({ messages: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching messages' });
  }
});

// POST /api/messages
router.post('/', upload.single('file'), async (req, res) => {
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
  const senderId = payload.id;

  // Ahora esperamos tanto bookingId como chatRoomId en el body
  const { bookingId, chatRoomId, content } = req.body;
  if (!bookingId)   return res.status(400).json({ error: 'Missing bookingId' });
  if (!chatRoomId)  return res.status(400).json({ error: 'Missing chatRoomId' });

  // Procesar adjunto si lo hay
  let fileUrl = null, type = 'text';
  if (req.file) {
    const filename = `chat-${chatRoomId}-${Date.now()}.png`;
    const outPath  = path.join(__dirname, '../public/chat', filename);
    try {
      await sharp(req.file.buffer)
        .resize(512, 512, { fit: 'inside' })
        .png()
        .toFile(outPath);
      fileUrl = `/chat/${filename}`;
      type    = 'file';
    } catch (err) {
      console.error('Sharp error:', err);
      return res.status(500).json({ error: 'Error processing file' });
    }
  }

  try {
    const insert = await pool.query(
      `INSERT INTO messages
         (booking_id, chat_room_id, sender_id, content, file_url, type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING
         id,
         booking_id   AS "bookingId",
         chat_room_id AS "chatRoomId",
         sender_id    AS "senderId",
         content,
         file_url     AS "fileUrl",
         type,
         created_at`,
      [bookingId, chatRoomId, senderId, content || null, fileUrl, type]
    );
    const msg = insert.rows[0];

    // Emitir por socket al canal correspondiente
    const io = req.app.get('io');
    io.to(`chat_room:${chatRoomId}`).emit('message', msg);

    res.status(201).json({ message: msg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error saving message' });
  }
});

// PATCH /api/messages/:id/read
router.patch('/:id/read', async (req, res) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    jwt.verify(auth.split(' ')[1], JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    const upd = await pool.query(
      `UPDATE messages
         SET read_at = NOW()
       WHERE id = $1
       RETURNING chat_room_id AS "chatRoomId"`,
      [req.params.id]
    );
    if (!upd.rows.length) {
      return res.status(404).json({ error: 'Message not found' });
    }
    const { chatRoomId } = upd.rows[0];
    const io = req.app.get('io');
    io.to(`chat_room:${chatRoomId}`).emit('messageRead', { id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error marking message as read' });
  }
});

module.exports = router;