ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS phone_number VARCHAR(32),
  ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(120),
  ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;

CREATE INDEX IF NOT EXISTS ix_departments_phone_number ON departments(phone_number);
CREATE INDEX IF NOT EXISTS ix_departments_telegram_username ON departments(lower(telegram_username));
CREATE INDEX IF NOT EXISTS ix_departments_telegram_chat_id ON departments(telegram_chat_id);

