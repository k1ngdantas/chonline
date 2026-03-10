# Configurar Supabase

## 1. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Crie um novo projeto
3. Aguarde a criação do banco de dados

## 2. Executar o schema SQL

1. No painel do Supabase, vá em **SQL Editor**
2. Crie uma nova query
3. Copie todo o conteúdo do arquivo `supabase/schema.sql`
4. Cole e execute (Run)

## 3. Obter as credenciais

1. Vá em **Settings** → **API**
2. Copie:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** (secret) → `SUPABASE_SERVICE_KEY`

⚠️ **Importante:** Use a `service_role` key, não a `anon` key. A service_role bypassa as políticas de segurança (RLS) e é necessária para o servidor.

## 4. Configurar o projeto

1. Copie o arquivo `.env.example` para `.env`:
   ```
   cp .env.example .env
   ```

2. Edite o `.env` e preencha:
   ```
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. Instale as dependências:
   ```
   npm install
   ```

4. Inicie o servidor:
   ```
   npm start
   ```

## 5. Carregar variáveis de ambiente

O Node.js não carrega `.env` automaticamente. Instale o `dotenv`:

```
npm install dotenv
```

E adicione no início do `server.js`:
```javascript
require('dotenv').config();
```

## Modo de fallback

Se `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` não estiverem definidos, o sistema usa o arquivo `data.json` (modo local).
