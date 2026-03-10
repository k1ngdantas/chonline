# Criar tabelas no Supabase (manual)

O script automático pode falhar por rede. Use o **SQL Editor** do Supabase:

## Passo a passo

1. Acesse: **https://supabase.com/dashboard/project/mkckwlosxunrcvhjadvi/sql**

2. Clique em **New query**

3. **Copie todo o SQL abaixo** e cole no editor

4. Clique em **Run** (ou Ctrl+Enter)

---

```sql
-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Usuário',
  email TEXT DEFAULT '',
  username TEXT NOT NULL,
  password TEXT NOT NULL DEFAULT '1234',
  role TEXT NOT NULL DEFAULT 'Usuario',
  secao TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(LOWER(username));
CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));

-- Tabela de chamados
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

CREATE INDEX IF NOT EXISTS idx_tickets_requester ON tickets(requester_id);
CREATE INDEX IF NOT EXISTS idx_tickets_technician ON tickets(technician_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

-- Tabela de mensagens do chat
CREATE TABLE IF NOT EXISTS ticket_messages (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  sender_id BIGINT,
  sender_name TEXT DEFAULT 'Anônimo',
  sender_role TEXT DEFAULT 'Usuario',
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_ticket ON ticket_messages(ticket_id);

-- Usuários admin padrão (senha: 1234@)
INSERT INTO users (name, username, password, role)
SELECT 'Administrador', 'sti', '1234@', 'Admin'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'sti');
INSERT INTO users (name, username, password, role)
SELECT 'Ten Marcus Dantas', 'marcusdantas', '1234@', 'Admin'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'marcusdantas');
INSERT INTO users (name, username, password, role)
SELECT 'Sgt L Antonio', 'lantonio', '1234@', 'Admin'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'lantonio');
```

---

Pronto! As tabelas `users`, `tickets` e `ticket_messages` serão criadas.
