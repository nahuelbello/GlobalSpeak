-- migrations/2025xxxx_create_messages.sql
CREATE TABLE messages (
  id            SERIAL PRIMARY KEY,
  booking_id    INT     NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id     INT     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id   INT     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content       TEXT,
  type          VARCHAR(20) NOT NULL DEFAULT 'text',  -- 'text' | 'file'
  file_url      TEXT,                                 -- si type='file'
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at       TIMESTAMP WITH TIME ZONE              -- para doble check ✓✓
);
CREATE INDEX ON messages (booking_id);
CREATE INDEX ON messages (receiver_id, read_at);