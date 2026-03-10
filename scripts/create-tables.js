#!/usr/bin/env node
/**
 * Script para criar as tabelas no banco Supabase.
 * Usuários e técnicos são armazenados na tabela users (campo role: Admin, Tecnico, Usuario).
 *
 * Uso: node scripts/create-tables.js
 * Requer: DATABASE_URL no .env (string de conexão do Supabase)
 *
 * Obter em: Supabase Dashboard > Settings > Database > Connection string (URI)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;

async function run() {
  if (!DATABASE_URL) {
    console.error('Erro: DATABASE_URL não definido no .env');
    console.error('');
    console.error('Obtenha a string de conexão em:');
    console.error('  Supabase Dashboard > Settings > Database > Connection string');
    console.error('  Use o formato URI (ex: postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres)');
    console.error('');
    console.error('Adicione ao .env:');
    console.error('  DATABASE_URL=postgresql://...');
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, '..', 'supabase', 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error('Erro: supabase/schema.sql não encontrado');
    process.exit(1);
  }

  let sql = fs.readFileSync(schemaPath, 'utf-8');
  sql = sql
    .replace(/--[^\n]*/g, '')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('Conectado ao banco de dados.');

    for (const stmt of sql) {
      if (!stmt) continue;
      try {
        await client.query(stmt + ';');
        const preview = stmt.substring(0, 60).replace(/\s+/g, ' ');
        console.log('  OK:', preview + (stmt.length > 60 ? '...' : ''));
      } catch (err) {
        if (err.code === '42P07') {
          console.log('  (tabela já existe)');
        } else {
          throw err;
        }
      }
    }

    console.log('');
    console.log('Tabelas criadas com sucesso!');
    console.log('');
    console.log('Estrutura:');
    console.log('  - users: usuários, técnicos e admins (role: Usuario, Tecnico, Admin)');
    console.log('  - tickets: chamados');
    console.log('  - ticket_messages: mensagens do chat (temporárias)');
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
