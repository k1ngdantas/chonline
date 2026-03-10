CREATE TABLE IF NOT EXISTS ticket_assignments (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  technician_id BIGINT NOT NULL REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ticket_id)
);

CREATE INDEX IF NOT EXISTS idx_assignments_technician ON ticket_assignments(technician_id);
CREATE INDEX IF NOT EXISTS idx_assignments_ticket ON ticket_assignments(ticket_id);
