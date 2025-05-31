-- backend/models/migrations/004_create_user_fields.sql

-- Para almacenar las especialidades
CREATE TABLE IF NOT EXISTS user_specialties (
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  specialty   TEXT NOT NULL,
  PRIMARY KEY (user_id, specialty)
);

-- Para almacenar las certificaciones
CREATE TABLE IF NOT EXISTS user_certifications (
  user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  certification TEXT NOT NULL,
  PRIMARY KEY (user_id, certification)
);

-- Para almacenar los idiomas adicionales
CREATE TABLE IF NOT EXISTS user_languages (
  user_id  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  PRIMARY KEY (user_id, language)
);

-- Para almacenar los intereses de alumnos
CREATE TABLE IF NOT EXISTS user_interests (
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interest TEXT NOT NULL,
  PRIMARY KEY (user_id, interest)
);

-- Añadir columnas price (para profesores) y level (para alumnos) en users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS price       NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS level       TEXT;