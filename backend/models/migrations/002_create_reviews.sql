-- 002_create_reviews.sql

CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  teacher_id  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text        TEXT    NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);