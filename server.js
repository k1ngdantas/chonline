try { require('dotenv').config(); } catch (_) { /* dotenv opcional */ }
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const db = require('./lib/db');
const useSupabase = db.isSupabase();

const PORT = process.env.PORT || 3000;

// Chat em memória: mensagens temporárias, excluídas ao finalizar o chamado
const ticketMessages = new Map();
const DATA_FILE = path.join(__dirname, 'data.json');

function ensureDataFile() {
  if (useSupabase) return;
  const now = new Date().toISOString();
  if (!fs.existsSync(DATA_FILE)) {
    const seed = { tickets: [], users: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2), 'utf-8');
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = raw ? JSON.parse(raw) : { tickets: [], users: [] };
    data.users = data.users || [];
    data.tickets = data.tickets || [];
    const admins = [
      { username: 'sti', name: 'Administrador', password: '1234@', role: 'Admin' },
      { username: 'marcusdantas', name: 'Ten Marcus Dantas', password: '1234@', role: 'Admin' },
      { username: 'lantonio', name: 'Sgt L Antonio', password: '1234@', role: 'Admin' },
    ];
    admins.forEach((a) => {
      if (!data.users.some((u) => (u.username || '').toLowerCase() === a.username.toLowerCase())) {
        const maxId = data.users.reduce((acc, u) => Math.max(acc, u.id || 0), 0);
        data.users.push({ id: maxId + 1, ...a, email: '', secao: '' });
      }
    });
    data.tickets = (data.tickets || []).map((t) => {
      const { messages, ...rest } = t;
      return { ...rest, secao: rest.secao || '' };
    });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erro ao garantir arquivo de dados:', err);
  }
}

function readData() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
}

function writeData(data) {
  const toWrite = {
    ...data,
    tickets: (data.tickets || []).map((t) => {
      const { messages, ...rest } = t;
      return rest;
    }),
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(toWrite, null, 2), 'utf-8');
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    ...CORS_HEADERS,
  });
  res.end(JSON.stringify(payload));
}

function parseBody(req, callback) {
  let body = '';
  req.on('data', (chunk) => { body += chunk.toString(); });
  req.on('end', () => {
    if (!body) return callback(null, {});
    try {
      callback(null, JSON.parse(body));
    } catch (err) {
      callback(err);
    }
  });
}

function enrichTicketWithSecao(ticket, users) {
  let secao = ticket.secao || '';
  if (!secao && ticket.requesterId) {
    const req = users.find((u) => u.id === ticket.requesterId);
    if (req && req.secao) secao = req.secao;
  }
  return { ...ticket, secao: secao || '', resolutionNote: ticket.resolutionNote || '' };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  const pathname = url.pathname.replace(/\/$/, '') || '/';

  if (pathname === '/api/login' && req.method === 'POST') {
    return parseBody(req, async (err, body) => {
      if (err) return sendJson(res, 400, { error: 'JSON inválido' });
      body = body || {};
      const identifier = String(body.username || body.email || '').trim().toLowerCase();
      const password = String(body.password || '').trim();
      if (!identifier || !password) {
        return sendJson(res, 400, { error: 'Preencha usuário e senha' });
      }
      try {
        let user;
        if (useSupabase) {
          user = await db.findUserByLogin(identifier, password);
        } else {
          const data = readData();
          user = (data.users || []).find((u) => {
            const uu = (u.username || '').toString().toLowerCase();
            const ue = (u.email || '').toString().toLowerCase();
            return (uu === identifier || ue === identifier) && String(u.password || '') === password;
          });
        }
        if (!user) return sendJson(res, 401, { error: 'Credenciais inválidas' });
        const { password: _p, ...safeUser } = user;
        return sendJson(res, 200, safeUser);
      } catch (e) {
        console.error(e);
        return sendJson(res, 500, { error: 'Erro ao fazer login' });
      }
    });
  }

  if (url.pathname.startsWith('/api/tickets')) {
    try {
      if (req.method === 'GET' && url.pathname === '/api/tickets') {
        const requesterId = url.searchParams.get('requesterId');
        const technicianId = url.searchParams.get('technicianId');
        const handler = async () => {
          let tickets, users;
          if (useSupabase) {
            users = await db.getUsers();
            const techId = technicianId != null && technicianId !== '' ? Number(technicianId) : null;
            if (techId) {
              tickets = (await db.getAssignedTickets(techId)) || [];
            } else {
              tickets = await db.getTickets({ requesterId: requesterId ? Number(requesterId) : null });
            }
          } else {
            const data = readData();
            users = data.users || [];
            tickets = data.tickets || [];
            if (requesterId) tickets = tickets.filter((t) => t.requesterId === Number(requesterId));
            if (technicianId != null && technicianId !== '') tickets = tickets.filter((t) => Number(t.technicianId) === Number(technicianId));
          }
          tickets = tickets.map((t) => enrichTicketWithSecao(t, users));
          return sendJson(res, 200, tickets);
        };
        return handler().catch((e) => {
          console.error(e);
          sendJson(res, 500, { error: 'Erro ao carregar chamados' });
        });
      }

      if (req.method === 'POST' && url.pathname === '/api/tickets') {
        return parseBody(req, async (err, body) => {
          if (err) return sendJson(res, 400, { error: 'JSON inválido' });
          try {
            let users, secao = body.secao || '';
            if (useSupabase) {
              users = await db.getUsers();
              if (!secao && body.requesterId) {
                const req = await db.getUserById(body.requesterId);
                if (req && req.secao) secao = req.secao;
              }
            } else {
              const data = readData();
              users = data.users || [];
              if (!secao && body.requesterId) {
                const req = users.find((u) => u.id === body.requesterId);
                if (req && req.secao) secao = req.secao;
              }
            }
            const now = new Date().toISOString();
            const ticket = {
              title: body.title || 'Sem título',
              requesterId: body.requesterId || null,
              user: body.user || 'Usuário',
              secao,
              priority: body.priority || 'baixa',
              status: body.status || 'aberto',
              technicianId: body.technicianId || null,
              agent: body.agent || '',
              description: body.description || '',
              createdAt: now,
              startedAt: body.startedAt || null,
              resolvedAt: null,
              resolutionNote: '',
              updatedAt: now,
              messages: [],
            };
            if (useSupabase) {
              const created = await db.createTicket(ticket);
              if (created && created.technicianId) {
                await db.assignTicket(created.id, created.technicianId, created.agent);
                const refreshed = await db.getTicketById(created.id);
                if (refreshed) return sendJson(res, 201, refreshed);
              }
              return sendJson(res, 201, created);
            }
            const data = readData();
            const maxId = (data.tickets || []).reduce((acc, t) => Math.max(acc, t.id || 0), 0);
            ticket.id = maxId + 1;
            data.tickets.push(ticket);
            writeData(data);
            return sendJson(res, 201, ticket);
          } catch (e) {
            console.error(e);
            return sendJson(res, 500, { error: 'Erro ao criar chamado' });
          }
        });
      }

      if ((req.method === 'PUT' || req.method === 'PATCH') && /^\/api\/tickets\/\d+$/.test(url.pathname)) {
        const id = Number(url.pathname.split('/').pop());
        return parseBody(req, async (err, body) => {
          if (err) return sendJson(res, 400, { error: 'JSON inválido' });
          try {
            let ticket, tickets;
            if (useSupabase) {
              ticket = await db.getTicketById(id);
              if (!ticket) return sendJson(res, 404, { error: 'Chamado não encontrado' });
              tickets = await db.getTickets();
            } else {
              const data = readData();
              tickets = data.tickets || [];
              ticket = tickets.find((t) => Number(t.id) === id);
              if (!ticket) return sendJson(res, 404, { error: 'Chamado não encontrado' });
            }
            if (body.title !== undefined) ticket.title = body.title;
            if (body.user !== undefined) ticket.user = body.user;
            if (body.requesterId !== undefined) ticket.requesterId = body.requesterId;
            if (body.priority !== undefined) ticket.priority = body.priority;
            if (body.startedAt !== undefined) ticket.startedAt = body.startedAt;
            if (body.resolvedAt !== undefined) ticket.resolvedAt = body.resolvedAt;
            if (body.status !== undefined) {
              if (body.status === 'em_progresso') {
                const techId = ticket.technicianId;
                if (techId) {
                  const other = tickets.filter((t) => Number(t.id) !== id && Number(t.technicianId) === Number(techId) && t.status === 'em_progresso');
                  if (other.length > 0) return sendJson(res, 409, { error: 'Você já possui um chamado em progresso.' });
                }
                if (!ticket.startedAt) ticket.startedAt = new Date().toISOString();
              }
              ticket.status = body.status;
              if (body.status === 'resolvido') {
                ticket.resolvedAt = new Date().toISOString();
                ticket.resolutionNote = body.resolutionNote !== undefined ? String(body.resolutionNote) : (ticket.resolutionNote || '');
                ticketMessages.delete(id);
                if (useSupabase) await db.clearTicketMessages(id);
                else ticket.messages = [];
              }
            }
            if (body.technicianId !== undefined) ticket.technicianId = body.technicianId != null ? Number(body.technicianId) : null;
            if (body.agent !== undefined) ticket.agent = body.agent;
            if (body.description !== undefined) ticket.description = body.description;
            if (body.secao !== undefined) ticket.secao = body.secao;
            if (body.resolutionNote !== undefined) ticket.resolutionNote = String(body.resolutionNote);
            ticket.updatedAt = new Date().toISOString();

            if (useSupabase && body.technicianId !== undefined) {
              const techId = body.technicianId != null ? Number(body.technicianId) : null;
              const agent = body.agent !== undefined ? body.agent : ticket.agent;
              const updated = await db.assignTicket(id, techId, agent);
              if (updated) {
                const users = await db.getUsers();
                return sendJson(res, 200, enrichTicketWithSecao(updated, users));
              }
            }
            if (useSupabase) {
              const updated = await db.updateTicket(id, ticket);
              return sendJson(res, 200, updated);
            }
            const data = readData();
            const idx = data.tickets.findIndex((t) => Number(t.id) === id);
            if (idx >= 0) data.tickets[idx] = ticket;
            writeData(data);
            return sendJson(res, 200, ticket);
          } catch (e) {
            console.error(e);
            return sendJson(res, 500, { error: 'Erro ao atualizar chamado' });
          }
        });
      }

      if (/^\/api\/tickets\/\d+\/messages$/.test(pathname)) {
        const pathParts = pathname.split('/');
        const id = Number(pathParts[pathParts.length - 2]);
        const handler = async () => {
          let ticket;
          if (useSupabase) {
            ticket = await db.getTicketById(id);
          } else {
            const data = readData();
            ticket = (data.tickets || []).find((t) => Number(t.id) === id);
          }
          if (!ticket) return sendJson(res, 404, { error: 'Chamado não encontrado' });
          if (ticket.status !== 'em_progresso') return sendJson(res, 400, { error: 'Chat disponível apenas para chamados em andamento' });

          if (req.method === 'GET') {
            const msgs = ticketMessages.get(id) || [];
            return sendJson(res, 200, msgs);
          }
          if (req.method === 'POST') {
            return parseBody(req, async (err, body) => {
              if (err) return sendJson(res, 400, { error: 'JSON inválido' });
              const text = String(body && body.text || '').trim();
              if (!text) return sendJson(res, 400, { error: 'Mensagem não pode ser vazia' });
              try {
                const list = ticketMessages.get(id) || [];
                const maxId = list.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0);
                const msg = {
                  id: maxId + 1,
                  senderId: body.senderId,
                  senderName: body.senderName || 'Anônimo',
                  senderRole: body.senderRole || 'Usuario',
                  text,
                  createdAt: new Date().toISOString(),
                };
                list.push(msg);
                ticketMessages.set(id, list);
                if (useSupabase) await db.updateTicket(id, { updatedAt: new Date().toISOString() });
                else {
                  const data = readData();
                  const t = data.tickets.find((x) => Number(x.id) === id);
                  if (t) t.updatedAt = new Date().toISOString();
                  writeData(data);
                }
                return sendJson(res, 201, msg);
              } catch (e) {
                console.error(e);
                return sendJson(res, 500, { error: 'Erro ao salvar mensagem' });
              }
            });
          }
          return sendJson(res, 405, { error: 'Método não permitido' });
        };
        return handler().catch((e) => {
          console.error(e);
          sendJson(res, 500, { error: 'Erro ao carregar mensagens' });
        });
      }

      if (req.method === 'DELETE' && /^\/api\/tickets\/\d+$/.test(url.pathname)) {
        const id = Number(url.pathname.split('/').pop());
        const handler = async () => {
          ticketMessages.delete(id);
          if (useSupabase) {
            const removed = await db.deleteTicket(id);
            return removed ? sendJson(res, 200, removed) : sendJson(res, 404, { error: 'Chamado não encontrado' });
          }
          const data = readData();
          const idx = data.tickets.findIndex((t) => t.id === id);
          if (idx === -1) return sendJson(res, 404, { error: 'Chamado não encontrado' });
          const removed = data.tickets.splice(idx, 1)[0];
          writeData(data);
          return sendJson(res, 200, removed);
        };
        return handler().catch((e) => {
          console.error(e);
          sendJson(res, 500, { error: 'Erro ao excluir chamado' });
        });
      }

      return sendJson(res, 405, { error: 'Método não permitido' });
    } catch (err) {
      console.error('Erro na API de tickets:', err);
      return sendJson(res, 500, { error: 'Erro interno no servidor' });
    }
  }

  if (url.pathname.startsWith('/api/users')) {
    try {
      if (req.method === 'GET' && url.pathname === '/api/users') {
        const role = url.searchParams.get('role');
        const handler = async () => {
          let users;
          if (useSupabase) {
            users = await db.getUsers(role || undefined);
          } else {
            const data = readData();
            users = data.users || [];
            if (role) users = users.filter((u) => (u.role || '').toLowerCase() === role.toLowerCase());
          }
          return sendJson(res, 200, users);
        };
        return handler().catch((e) => {
          console.error(e);
          sendJson(res, 500, { error: 'Erro ao carregar usuários' });
        });
      }

      if (req.method === 'POST' && url.pathname === '/api/users') {
        return parseBody(req, async (err, body) => {
          if (err) return sendJson(res, 400, { error: 'JSON inválido' });
          try {
            if (useSupabase) {
              const user = await db.createUser(body);
              return sendJson(res, 201, user);
            }
            const data = readData();
            const maxId = (data.users || []).reduce((acc, u) => Math.max(acc, u.id || 0), 0);
            const user = {
              id: maxId + 1,
              name: body.name || 'Usuário',
              email: body.email || '',
              username: body.username || (body.email ? body.email.split('@')[0] : `user${maxId + 1}`),
              password: body.password || '1234',
              role: body.role || 'Usuario',
              secao: body.secao || '',
            };
            data.users.push(user);
            writeData(data);
            return sendJson(res, 201, user);
          } catch (e) {
            console.error(e);
            return sendJson(res, 500, { error: 'Erro ao criar usuário' });
          }
        });
      }

      if ((req.method === 'PUT' || req.method === 'PATCH') && /^\/api\/users\/\d+$/.test(url.pathname)) {
        const id = Number(url.pathname.split('/').pop());
        return parseBody(req, async (err, body) => {
          if (err) return sendJson(res, 400, { error: 'JSON inválido' });
          try {
            if (useSupabase) {
              const user = await db.updateUser(id, body);
              return user ? sendJson(res, 200, user) : sendJson(res, 404, { error: 'Usuário não encontrado' });
            }
            const data = readData();
            const user = data.users.find((u) => u.id === id);
            if (!user) return sendJson(res, 404, { error: 'Usuário não encontrado' });
            if (body.name !== undefined) user.name = body.name;
            if (body.email !== undefined) user.email = body.email;
            if (body.role !== undefined) user.role = body.role;
            if (body.username !== undefined) user.username = body.username;
            if (body.password !== undefined) user.password = body.password;
            if (body.secao !== undefined) user.secao = body.secao;
            writeData(data);
            return sendJson(res, 200, user);
          } catch (e) {
            console.error(e);
            return sendJson(res, 500, { error: 'Erro ao atualizar usuário' });
          }
        });
      }

      if (req.method === 'DELETE' && /^\/api\/users\/\d+$/.test(url.pathname)) {
        const id = Number(url.pathname.split('/').pop());
        const handler = async () => {
          if (useSupabase) {
            const removed = await db.deleteUser(id);
            return removed ? sendJson(res, 200, removed) : sendJson(res, 404, { error: 'Usuário não encontrado' });
          }
          const data = readData();
          const idx = data.users.findIndex((u) => u.id === id);
          if (idx === -1) return sendJson(res, 404, { error: 'Usuário não encontrado' });
          const removed = data.users.splice(idx, 1)[0];
          writeData(data);
          return sendJson(res, 200, removed);
        };
        return handler().catch((e) => {
          console.error(e);
          sendJson(res, 500, { error: 'Erro ao excluir usuário' });
        });
      }

      return sendJson(res, 405, { error: 'Método não permitido' });
    } catch (err) {
      console.error('Erro na API de usuários:', err);
      return sendJson(res, 500, { error: 'Erro interno no servidor' });
    }
  }

  let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
  const ext = path.extname(filePath) || '.html';
  if (!path.extname(filePath)) filePath += '.html';
  const fullPath = path.join(__dirname, 'public', filePath);

  fs.readFile(fullPath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Página não encontrada');
      return;
    }
    const contentType = ext === '.css' ? 'text/css; charset=utf-8' : ext === '.js' ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, () => {
  ensureDataFile();
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  if (useSupabase) {
    console.log('Banco: Supabase (usuários, técnicos e chamados)');
  } else {
    console.log('Banco: data.json (usuários, técnicos e chamados em arquivo)');
  }
});
