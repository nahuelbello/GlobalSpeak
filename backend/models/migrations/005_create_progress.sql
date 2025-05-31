-- 005_create_progress.sql

CREATE TABLE IF NOT EXISTS progress (
  student_id    INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  level         TEXT DEFAULT 'Principiante',
  streak        INT DEFAULT 0,
  minutes_total INT DEFAULT 0
);