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

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });
app.set('io', io);

// Declaración del puerto antes de cualquier uso
const PORT = process.env.PORT || 4000;

// ——————————————————————————————————
// Rutas ya existentes
// ——————————————————————————————————
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

// ——————————————————————————————————
// Nueva ruta de Stripe (antes de express.json())
// ——————————————————————————————————
const stripeRouter = require('./routes/stripe');

// ——————————————————————————————————
// Middlewares globales
// ——————————————————————————————————
// CORS dinámico
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);           // curl, Postman, etc.
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`Origen ${origin} no permitido por CORS`));
  },
  credentials: true
}));

// **MUST**: Webhook de Stripe necesita raw body antes de JSON parser
app.post('/api/stripe/webhook', stripeRouter);

// Parse JSON para el resto
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ▶ ${req.method} ${req.url}`);
  next();
});

// Sirve archivos estáticos de /public
app.use(express.static(path.join(__dirname, 'public')));

// ——————————————————————————————————
// Montaje de rutas API
// ——————————————————————————————————
app.use('/api/auth',               authRoutes);
app.use('/api/users',              userRoutes);
app.use('/api/posts',              postRoutes);
app.use('/api/availability',       availabilityRouter);
app.use('/api/bookings',           bookingRoutes);
app.use('/api/follows',            followsRoutes);
app.use('/api/reviews',            reviewsRoutes);
app.use('/api/search',             searchRoutes);
app.use('/api/windows',            windowsRoutes);
app.use('/api/notifications',      notificationsRouter);
app.use('/api/progress',           progressRoutes);
app.use('/api/weeklyAvailability', weeklyAvailabilityRoutes);
app.use('/api/slots',              slotsRoutes);
app.use(avatarRouter);             // POST /api/users/:id/avatar
app.use('/api/chat_rooms',         chatRoomsRouter);
app.use('/api/messages',           messagesRouter);

// Montamos las rutas de Stripe (excepto el webhook, que ya montamos arriba)
app.use('/api/stripe', stripeRouter);

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

// Manejo de errores del servidor
server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Puerto ${PORT} en uso, intenta con otro (ej.: PORT=4001 npm run dev)`);
    process.exit(1);
  }
  console.error(err);
});

// Levantando servidor
server.listen(PORT, () => console.log(`Backend running on ${PORT}`));