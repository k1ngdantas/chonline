-- Migração: garantir que a tabela tickets existe com technician_id
-- Execute no SQL Editor do Supabase se a atribuição de técnicos não funcionar

-- Criar tabela tickets se não existir
CREATE TABLE IF NOT EXISTS tickets (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Sem título',
  requester_id BIGINT REFERENCES users(id),
  requester_name TEXT NOT NULL DEFAULT 'Usuário',
  secao TEXT DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'baixa',
  status TEXT NOT NULL DEFAULT 'aberto',
  technician_id BIGINT REFERENCES users(id),
  agent TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar technician_id se a tabela já existir sem essa coluna
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' AND column_name = 'technician_id'
  ) THEN
    ALTER TABLE tickets ADD COLUMN technician_id BIGINT REFERENCES users(id);
  END IF;
END $$;

-- Adicionar agent se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' AND column_name = 'agent'
  ) THEN
    ALTER TABLE tickets ADD COLUMN agent TEXT DEFAULT '';
  END IF;
END $$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tickets_technician ON tickets(technician_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_requester ON tickets(requester_id);
