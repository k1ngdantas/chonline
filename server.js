const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

function ensureDataFile() {
  const now = new Date().toISOString();

  // Se não existe, cria arquivo inicial
  if (!fs.existsSync(DATA_FILE)) {
    const seed = {
      tickets: [
        {
          id: 1,
          title: 'Acesso à VPN falhando',
          requesterId: 1,
          user: 'Usuário Alfa',
          priority: 'alta',
          status: 'em_progresso',
          technicianId: 3,
          agent: 'Maria Souza',
          description: '',
          createdAt: now,
          startedAt: now,
          resolvedAt: null,
          resolutionNote: '',
          updatedAt: now,
        },
        {
          id: 2,
          title: 'E-mail não sincroniza',
          requesterId: 2,
          user: 'Usuário Beta',
          priority: 'media',
          status: 'aberto',
          technicianId: null,
          agent: '',
          description: '',
          createdAt: now,
          startedAt: null,
          resolvedAt: null,
          resolutionNote: '',
          updatedAt: now,
        },
      ],
      users: [],
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2), 'utf-8');
  }

  // Atualiza estrutura existente (migração simples) e garante admin sti/1234@
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = raw ? JSON.parse(raw) : { tickets: [], users: [] };

    // Migração de usuários
    data.users = (data.users || []).map((u, index) => {
      const user = { ...u };
      if (!user.id) user.id = index + 1;
      if (!user.username && user.email) {
        user.username = String(user.email).split('@')[0];
      }
      if (!user.password) {
        user.password = '1234';
      }
      if (!user.role) {
        user.role = 'Usuario';
      }
      if (user.secao === undefined) user.secao = '';
      return user;
    });

    const adminsPadrao = [
      { username: 'sti', name: 'Administrador', password: '1234@' },
      { username: 'marcusdantas', name: 'Ten Marcus Dantas', password: '1234@' },
      { username: 'lantonio', name: 'Sgt L Antonio', password: '1234@' },
    ];
    const maxId = data.users.reduce((acc, u) => Math.max(acc, u.id || 0), 0);
    let nextId = maxId + 1;
    adminsPadrao.forEach((admin) => {
      const existe = data.users.some(
        (u) => u.username && u.username.toLowerCase() === admin.username.toLowerCase()
      );
      if (!existe) {
        data.users.push({
          id: nextId++,
          name: admin.name,
          email: '',
          username: admin.username,
          password: admin.password,
          role: 'Admin',
        });
      }
    });

    // Migração de tickets: garantir campos de datas e resolução
    data.tickets = (data.tickets || []).map((t, index) => {
      const ticket = { ...t };
      if (!ticket.id) ticket.id = index + 1;
      if (!ticket.createdAt) ticket.createdAt = now;
      if (ticket.startedAt === undefined) ticket.startedAt = null;
      if (ticket.resolvedAt === undefined) ticket.resolvedAt = null;
      if (ticket.resolutionNote === undefined) ticket.resolutionNote = '';
      if (ticket.secao === undefined) ticket.secao = '';
      if (ticket.messages === undefined) ticket.messages = [];
      // Fallback para chamados resolvidos antigos: usar updatedAt e createdAt
      if (ticket.status === 'resolvido') {
        if (!ticket.resolvedAt && ticket.updatedAt) ticket.resolvedAt = ticket.updatedAt;
        if (!ticket.startedAt && ticket.createdAt) ticket.startedAt = ticket.createdAt;
      }
      return ticket;
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
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
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
  req.on('data', (chunk) => {
    body += chunk.toString();
  });
  req.on('end', () => {
    if (!body) return callback(null, {});
    try {
      const json = JSON.parse(body);
      callback(null, json);
    } catch (err) {
      callback(err);
    }
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  // Login - verificado primeiro para garantir que funcione
  const pathname = url.pathname.replace(/\/$/, '') || '/';
  if (pathname === '/api/login' && req.method === 'POST') {
    const data = readData();
    return parseBody(req, (err, body) => {
      if (err) return sendJson(res, 400, { error: 'JSON inválido' });
      body = body || {};
      const identifier = String(body.username || body.email || '').trim().toLowerCase();
      const password = String(body.password || '').trim();
      if (!identifier || !password) {
        return sendJson(res, 400, { error: 'Preencha usuário e senha' });
      }
      const users = data.users || [];
      const user = users.find((u) => {
        const uUser = (u.username || '').toString().toLowerCase();
        const uMail = (u.email || '').toString().toLowerCase();
        const uPass = (u.password || '').toString();
        const ok = (uUser === identifier || uMail === identifier) && uPass === password;
        return ok;
      });
      if (!user) {
        return sendJson(res, 401, { error: 'Credenciais inválidas' });
      }
      const { password: _p, ...safeUser } = user;
      return sendJson(res, 200, safeUser);
    });
  }

  // API de tickets
  if (url.pathname.startsWith('/api/tickets')) {
    try {
      const data = readData();
      if (req.method === 'GET' && url.pathname === '/api/tickets') {
        const requesterId = url.searchParams.get('requesterId');
        const technicianId = url.searchParams.get('technicianId');
        const users = data.users || [];
        let tickets = (data.tickets || []).map((t) => {
          let secao = t.secao !== undefined && t.secao ? t.secao : '';
          if (!secao && t.requesterId) {
            const requester = users.find((u) => u.id === t.requesterId);
            if (requester && requester.secao) secao = requester.secao;
          }
          return {
            ...t,
            resolutionNote: t.resolutionNote !== undefined ? t.resolutionNote : '',
            secao: secao || '',
          };
        });
        if (requesterId) {
          const id = Number(requesterId);
          tickets = tickets.filter((t) => t.requesterId === id);
        }
        if (technicianId) {
          const id = Number(technicianId);
          tickets = tickets.filter((t) => t.technicianId === id);
        }
        return sendJson(res, 200, tickets);
      }

      if (req.method === 'POST' && url.pathname === '/api/tickets') {
        return parseBody(req, (err, body) => {
          if (err) return sendJson(res, 400, { error: 'JSON inválido' });
          const tickets = data.tickets || [];
          const users = data.users || [];
          const maxId = tickets.reduce((acc, t) => Math.max(acc, t.id || 0), 0);
          const now = new Date().toISOString();
          let secao = body.secao || '';
          if (!secao && body.requesterId) {
            const requester = users.find((u) => u.id === body.requesterId);
            if (requester && requester.secao) secao = requester.secao;
          }
          const ticket = {
            id: maxId + 1,
            title: body.title || 'Sem título',
            requesterId: body.requesterId || null,
            user: body.user || 'Usuário',
            secao: secao,
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
          tickets.push(ticket);
          data.tickets = tickets;
          writeData(data);
          return sendJson(res, 201, ticket);
        });
      }

      if ((req.method === 'PUT' || req.method === 'PATCH') && /^\/api\/tickets\/\d+$/.test(url.pathname)) {
        const id = Number(url.pathname.split('/').pop());
        const tickets = data.tickets || [];
        const ticket = tickets.find((t) => t.id === id);
        if (!ticket) {
          return sendJson(res, 404, { error: 'Chamado não encontrado' });
        }
        return parseBody(req, (err, body) => {
          if (err) return sendJson(res, 400, { error: 'JSON inválido' });
          if (body.title !== undefined) ticket.title = body.title;
          if (body.user !== undefined) ticket.user = body.user;
          if (body.requesterId !== undefined) ticket.requesterId = body.requesterId;
          if (body.priority !== undefined) ticket.priority = body.priority;
          if (body.startedAt !== undefined) ticket.startedAt = body.startedAt;
          if (body.resolvedAt !== undefined) ticket.resolvedAt = body.resolvedAt;
          if (body.status !== undefined) {
            // Regra: técnico só pode ter 1 chamado em progresso por vez
            if (body.status === 'em_progresso') {
              const techId = ticket.technicianId;
              if (techId) {
                const otherInProgress = (tickets || []).some(
                  (t) => t.id !== ticket.id && t.technicianId === techId && t.status === 'em_progresso'
                );
                if (otherInProgress) {
                  return sendJson(res, 409, { error: 'Você já possui um chamado em progresso.' });
                }
              }
              if (!ticket.startedAt) {
                ticket.startedAt = new Date().toISOString();
              }
            }

            ticket.status = body.status;

            if (body.status === 'resolvido') {
              ticket.resolvedAt = new Date().toISOString();
              ticket.resolutionNote = body.resolutionNote !== undefined ? String(body.resolutionNote) : (ticket.resolutionNote || '');
              ticket.messages = [];
            }
          }
          if (body.technicianId !== undefined) ticket.technicianId = body.technicianId;
          if (body.agent !== undefined) ticket.agent = body.agent;
          if (body.description !== undefined) ticket.description = body.description;
          if (body.secao !== undefined) ticket.secao = body.secao;
          if (body.resolutionNote !== undefined) ticket.resolutionNote = String(body.resolutionNote);
          ticket.updatedAt = new Date().toISOString();
          writeData(data);
          return sendJson(res, 200, ticket);
        });
      }

      const pathNorm = url.pathname.replace(/\/$/, '');
      if (/^\/api\/tickets\/\d+\/messages$/.test(pathNorm)) {
        const pathParts = pathNorm.split('/');
        const id = Number(pathParts[pathParts.length - 2]);
        const tickets = data.tickets || [];
        const ticket = tickets.find((t) => Number(t.id) === id);
        if (!ticket) {
          return sendJson(res, 404, { error: 'Chamado não encontrado' });
        }
        if (ticket.status !== 'em_progresso') {
          return sendJson(res, 400, { error: 'Chat disponível apenas para chamados em andamento' });
        }
        if (!Array.isArray(ticket.messages)) ticket.messages = [];

        if (req.method === 'GET') {
          return sendJson(res, 200, ticket.messages);
        }
        if (req.method === 'POST') {
          return parseBody(req, (err, body) => {
            if (err) return sendJson(res, 400, { error: 'JSON inválido' });
            const text = String(body && body.text || '').trim();
            if (!text) return sendJson(res, 400, { error: 'Mensagem não pode ser vazia' });
            const maxId = ticket.messages.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0);
            const msg = {
              id: maxId + 1,
              senderId: body.senderId,
              senderName: body.senderName || 'Anônimo',
              senderRole: body.senderRole || 'Usuario',
              text,
              createdAt: new Date().toISOString(),
            };
            ticket.messages.push(msg);
            ticket.updatedAt = new Date().toISOString();
            try {
              writeData(data);
            } catch (writeErr) {
              console.error('Erro ao salvar mensagem:', writeErr);
              return sendJson(res, 500, { error: 'Erro ao salvar mensagem' });
            }
            return sendJson(res, 201, msg);
          });
        }
        return sendJson(res, 405, { error: 'Método não permitido' });
      }

      if (req.method === 'DELETE' && /^\/api\/tickets\/\d+$/.test(url.pathname)) {
        const id = Number(url.pathname.split('/').pop());
        const tickets = data.tickets || [];
        const index = tickets.findIndex((t) => t.id === id);
        if (index === -1) {
          return sendJson(res, 404, { error: 'Chamado não encontrado' });
        }
        const removed = tickets.splice(index, 1)[0];
        data.tickets = tickets;
        writeData(data);
        return sendJson(res, 200, removed);
      }

      return sendJson(res, 405, { error: 'Método não permitido' });
    } catch (err) {
      console.error('Erro na API de tickets:', err);
      return sendJson(res, 500, { error: 'Erro interno no servidor' });
    }
  }

  // API de usuários (básica)
  if (url.pathname.startsWith('/api/users')) {
    try {
      const data = readData();

      if (req.method === 'GET' && url.pathname === '/api/users') {
        const role = url.searchParams.get('role');
        let users = data.users || [];
        if (role) {
          users = users.filter((u) => (u.role || '').toLowerCase() === role.toLowerCase());
        }
        return sendJson(res, 200, users);
      }

      if (req.method === 'POST' && url.pathname === '/api/users') {
        return parseBody(req, (err, body) => {
          if (err) return sendJson(res, 400, { error: 'JSON inválido' });
          const users = data.users || [];
          const maxId = users.reduce((acc, u) => Math.max(acc, u.id || 0), 0);
          const user = {
            id: maxId + 1,
            name: body.name || 'Usuário',
            email: body.email || '',
            username: body.username || (body.email ? body.email.split('@')[0] : `user${maxId + 1}`),
            password: body.password || '1234',
            role: body.role || 'Usuario',
            secao: body.secao || '',
          };
          users.push(user);
          data.users = users;
          writeData(data);
          return sendJson(res, 201, user);
        });
      }

      if ((req.method === 'PUT' || req.method === 'PATCH') && /^\/api\/users\/\d+$/.test(url.pathname)) {
        const id = Number(url.pathname.split('/').pop());
        const users = data.users || [];
        const user = users.find((u) => u.id === id);
        if (!user) {
          return sendJson(res, 404, { error: 'Usuário não encontrado' });
        }
        return parseBody(req, (err, body) => {
          if (err) return sendJson(res, 400, { error: 'JSON inválido' });
          if (body.name !== undefined) user.name = body.name;
          if (body.email !== undefined) user.email = body.email;
          if (body.role !== undefined) user.role = body.role;
          if (body.username !== undefined) user.username = body.username;
          if (body.password !== undefined) user.password = body.password;
          if (body.secao !== undefined) user.secao = body.secao;
          writeData(data);
          return sendJson(res, 200, user);
        });
      }

      if (req.method === 'DELETE' && /^\/api\/users\/\d+$/.test(url.pathname)) {
        const id = Number(url.pathname.split('/').pop());
        const users = data.users || [];
        const index = users.findIndex((u) => u.id === id);
        if (index === -1) {
          return sendJson(res, 404, { error: 'Usuário não encontrado' });
        }
        const removed = users.splice(index, 1)[0];
        data.users = users;
        writeData(data);
        return sendJson(res, 200, removed);
      }

      res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: 'Método não permitido' }));
    } catch (err) {
      console.error('Erro na API de usuários:', err);
      return sendJson(res, 500, { error: 'Erro interno no servidor' });
    }
  }

  // Arquivos estáticos (frontend)
  let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
  const ext = path.extname(filePath) || '.html';

  if (!path.extname(filePath)) {
    filePath += '.html';
  }

  const fullPath = path.join(__dirname, 'public', filePath);

  fs.readFile(fullPath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Página não encontrada');
      return;
    }

    const contentType =
      ext === '.css'
        ? 'text/css; charset=utf-8'
        : ext === '.js'
        ? 'text/javascript; charset=utf-8'
        : 'text/html; charset=utf-8';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, () => {
  ensureDataFile();
  console.log(`Servidor de chamados rodando em http://localhost:${PORT}`);
});

