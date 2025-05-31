-- migrations/2025xxxx_create_chat_rooms.sql

CREATE TABLE IF NOT EXISTS chat_rooms (
  id            SERIAL PRIMARY KEY,
  alumno_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profesor_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(alumno_id, profesor_id)
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_chat_rooms_alumno ON chat_rooms(alumno_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_profesor ON chat_rooms(profesor_id);