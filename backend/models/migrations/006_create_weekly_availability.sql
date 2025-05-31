-- 006_create_weekly_availability.sql
CREATE TABLE weekly_availability (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday       SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- 0 = lunes, 6 = domingo
  start_time    TIME    NOT NULL,
  end_time      TIME    NOT NULL,
  UNIQUE(user_id, weekday, start_time, end_time)
);