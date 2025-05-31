-- 001_add_timezone_and_video_url.sql

ALTER TABLE users
  ADD COLUMN timezone VARCHAR(100),
  ADD COLUMN video_url TEXT;