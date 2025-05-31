-- 007_create_availability_exceptions.sql
CREATE TABLE availability_exceptions (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exception_date DATE   NOT NULL,
  is_available  BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(user_id, exception_date)
);