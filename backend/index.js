// backend/index.js

require('dotenv').config();

// Forzar a Node a preferir IPv4 sobre IPv6 (evita ENETUNREACH en IPv6)
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const path    = require('path');
const cors    = require('cors');
const http    = require('http');
const { Server } = require('socket.io');

const { webhookHandler, router: stripeRouter } = require('./routes/stripe');
const authRoutes               = require('./routes/auth');
const userRoutes               = require('./routes/users');
const postRoutes               = require('./routes/posts');
const availabilityRouter       = require('./routes/availability');
const bookingRoutes            = require('./routes/bookings');
const followsRoutes            = require('./routes/follows');
const reviewsRoutes            = require('./routes/reviews');
const searchRoutes             = require('./routes/search');
const windowsRoutes            = require('./routes/windows');
const notificationsRouter      = require('./routes/notifications');
const progressRoutes           = require('./routes/progress');
const weeklyAvailabilityRoutes = require('./routes/weeklyAvailability');
const slotsRoutes              = require('./routes/slots');
const avatarRouter             = require('./routes/avatar');
const chatRoomsRouter          = require('./routes/chat_rooms');
const messagesRouter           = require('./routes/messages');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });
app.set('io', io);

const PORT = process.env.PORT || 4000;

// ——————————————————————————————————
// CORS dinámico
// ——————————————————————————————————
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // herramientas sin origen
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`Origen ${origin} no permitido por CORS`));
  },
  credentials: true
}));

// ——————————————————————————————————
// 1) Webhook de Stripe (raw body)
// ——————————————————————————————————
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  webhookHandler
);

// ——————————————————————————————————
// 2) JSON parser para todas las demás rutas
// ——————————————————————————————————
app.use(express.json());

// ——————————————————————————————————
// 3) Logging middleware
// ——————————————————————————————————
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ▶ ${req.method} ${req.url}`);
  next();
});

// ——————————————————————————————————
// 4) Archivos estáticos
// ——————————————————————————————————
app.use(express.static(path.join(__dirname, 'public')));

// ——————————————————————————————————
// 5) Montaje de rutas API
// ——————————————————————————————————
app.use('/api/stripe', stripeRouter);  // create-account y demás
app.use('/api/auth',     authRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/posts',    postRoutes);
app.use('/api/availability', availabilityRouter);
app.use('/api/bookings', bookingRoutes);
app.use('/api/follows',  followsRoutes);
app.use('/api/reviews',  reviewsRoutes);
app.use('/api/search',   searchRoutes);
app.use('/api/windows',  windowsRoutes);
app.use('/api/notifications', notificationsRouter);
app.use('/api/progress',        progressRoutes);
app.use('/api/weeklyAvailability', weeklyAvailabilityRoutes);
app.use('/api/slots',           slotsRoutes);
app.use(avatarRouter);          // POST /api/users/:id/avatar
app.use('/api/chat_rooms', chatRoomsRouter);
app.use('/api/messages',   messagesRouter);

// Health check
app.get('/api/ping', (req, res) => {
  res.json({ pong: true });
});

// ——————————————————————————————————
// WebSocket para chat
// ——————————————————————————————————
io.on('connection', socket => {
  socket.on('join', ({ chatRoomId, userId }) => {
    socket.join(`chat_room:${chatRoomId}`);
    socket.join(`user:${userId}`);
  });
  socket.on('typing', ({ chatRoomId, userId }) => {
    socket.to(`chat_room:${chatRoomId}`).emit('typing', { userId });
  });
  socket.on('message', msg => {
    io.to(`chat_room:${msg.chatRoomId}`).emit('message', msg);
  });
  socket.on('messageRead', ({ messageId, chatRoomId }) => {
    io.to(`chat_room:${chatRoomId}`).emit('messageRead', { messageId });
  });
});

// ——————————————————————————————————
// Manejo de errores del servidor
// ——————————————————————————————————
server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Puerto ${PORT} en uso, intenta con otro (ej.: PORT=4001 npm run dev)`);
    process.exit(1);
  }
  console.error(err);
});

// ——————————————————————————————————
// Levantando servidor
// ——————————————————————————————————
server.listen(PORT, () => console.log(`Backend running on ${PORT}`));