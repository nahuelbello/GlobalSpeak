-- models/init.sql

-- Usuarios
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,          -- 'alumno' o 'profesor'
  bio TEXT,
  avatar_url TEXT,
  nationality TEXT,            -- añadida para guardar la nacionalidad
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seguir / seguidores
CREATE TABLE IF NOT EXISTS follows (
  follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (follower_id, following_id)
);

-- Reseñas
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Posts (feed)
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_url TEXT,
  type TEXT,   -- 'text' | 'image' | 'video'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Disponibilidad puntual (timestamps)
CREATE TABLE IF NOT EXISTS availability (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_time TIMESTAMP NOT NULL,
  end_time   TIMESTAMP NOT NULL
);

-- Ventanas semanales (fixed-duration slots)
CREATE TABLE IF NOT EXISTS windows (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- 0=Dom, …,6=Sáb
  start_time TIME NOT NULL,
  end_time   TIME NOT NULL,
  duration   INTEGER NOT NULL CHECK (duration > 0),         -- duración en minutos
  created_at TIMESTAMP DEFAULT NOW()
);

-- Reservas de clases
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  alumno_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profesor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_time  TIMESTAMP NOT NULL,
  end_time    TIMESTAMP NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','cancelled')),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Progreso (opcional)
CREATE TABLE IF NOT EXISTS progress (
  student_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  level         INTEGER DEFAULT 1,
  streak        INTEGER DEFAULT 0,
  minutes_total INTEGER DEFAULT 0
);

-- Notificaciones
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,            -- e.g. 'booking_created', 'booking_cancelled'
  message TEXT NOT NULL,         -- texto a mostrar
  link TEXT,                     -- ruta a la que lleva la notificación
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);