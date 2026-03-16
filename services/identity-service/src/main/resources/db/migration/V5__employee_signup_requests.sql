CREATE TABLE employee_signup_requests (
  id UUID PRIMARY KEY,
  full_name VARCHAR(200) NOT NULL,
  job_title VARCHAR(120) NOT NULL,
  phone_number VARCHAR(32) NOT NULL,
  telegram_username VARCHAR(120),
  telegram_user_id BIGINT NOT NULL,
  telegram_chat_id BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  decided_at TIMESTAMPTZ NULL,
  decided_by VARCHAR(200) NULL,
  decision_note VARCHAR(1000) NULL,
  created_user_id UUID NULL
);

CREATE INDEX idx_employee_signup_requests_status_created_at
  ON employee_signup_requests(status, created_at DESC);

CREATE INDEX idx_employee_signup_requests_tg_user_id
  ON employee_signup_requests(telegram_user_id);

CREATE INDEX idx_employee_signup_requests_tg_chat_id
  ON employee_signup_requests(telegram_chat_id);

CREATE UNIQUE INDEX ux_employee_signup_requests_tg_user_pending
  ON employee_signup_requests(telegram_user_id)
  WHERE status = 'PENDING';

CREATE UNIQUE INDEX ux_employee_signup_requests_tg_chat_pending
  ON employee_signup_requests(telegram_chat_id)
  WHERE status = 'PENDING';

