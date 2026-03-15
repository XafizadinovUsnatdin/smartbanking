ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(32);
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_user_id BIGINT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_users_telegram_user_id ON users(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_users_telegram_username_lower ON users(lower(telegram_username));
