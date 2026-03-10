/**
 * Camada de dados - Supabase
 * Converte snake_case (DB) <-> camelCase (API)
 */
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;
if (url && key) {
  supabase = createClient(url, key);
}

function toCamel(obj) {
  if (!obj) return obj;
  const map = {
    requester_id: 'requesterId',
    requester_name: 'user',
    technician_id: 'technicianId',
    resolution_note: 'resolutionNote',
    created_at: 'createdAt',
    started_at: 'startedAt',
    resolved_at: 'resolvedAt',
    updated_at: 'updatedAt',
    sender_id: 'senderId',
    sender_name: 'senderName',
    sender_role: 'senderRole',
    ticket_id: 'ticketId',
  };
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[map[k] || k] = v;
  }
  return out;
}

function toSnake(obj) {
  if (!obj) return obj;
  const map = {
    requesterId: 'requester_id',
    user: 'requester_name',
    technicianId: 'technician_id',
    resolutionNote: 'resolution_note',
    createdAt: 'created_at',
    startedAt: 'started_at',
    resolvedAt: 'resolved_at',
    updatedAt: 'updated_at',
    senderId: 'sender_id',
    senderName: 'sender_name',
    senderRole: 'sender_role',
    ticketId: 'ticket_id',
  };
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[map[k] || k] = v;
  }
  return out;
}

async function getUsers(role = null) {
  if (!supabase) return null;
  let q = supabase.from('users').select('*');
  if (role) { q = q.ilike('role', role); }
  const { data, error } = await q.order('id');
  if (error) throw error;
  return (data || []).map(toCamel);
}

async function getUserById(id) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
  if (error || !data) return null;
  return toCamel(data);
}

async function findUserByLogin(identifier, password) {
  if (!supabase) return null;
  const idLower = identifier.toLowerCase();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .or(`username.ilike.${idLower},email.ilike.${idLower}`);
  if (error || !data) return null;
  const user = data.find((u) => String(u.password || '') === password);
  return user ? toCamel(user) : null;
}

async function createUser(user) {
  if (!supabase) return null;
  const row = toSnake({
    name: user.name || 'Usuário',
    email: user.email || '',
    username: user.username || (user.email ? user.email.split('@')[0] : `user${Date.now()}`),
    password: user.password || '1234',
    role: user.role || 'Usuario',
    secao: user.secao || '',
  });
  const { data, error } = await supabase.from('users').insert(row).select().single();
  if (error) throw error;
  return toCamel(data);
}

async function updateUser(id, updates) {
  if (!supabase) return null;
  const row = toSnake(updates);
  const { data, error } = await supabase.from('users').update(row).eq('id', id).select().single();
  if (error) throw error;
  return toCamel(data);
}

async function deleteUser(id) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('users').delete().eq('id', id).select().single();
  if (error) throw error;
  return toCamel(data);
}

async function getTickets(filters = {}) {
  if (!supabase) return null;
  let q = supabase.from('tickets').select('*');
  if (filters.requesterId != null) q = q.eq('requester_id', filters.requesterId);
  const techId = filters.technicianId != null && filters.technicianId !== '' ? Number(filters.technicianId) : null;
  if (techId != null && !isNaN(techId)) q = q.eq('technician_id', techId);
  const { data, error } = await q.order('id', { ascending: false });
  if (error) throw error;
  return (data || []).map(toCamel);
}

async function getTicketById(id) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('tickets').select('*').eq('id', id).single();
  if (error || !data) return null;
  return toCamel(data);
}

async function createTicket(ticket) {
  if (!supabase) return null;
  const row = toSnake({
    title: ticket.title || 'Sem título',
    requesterId: ticket.requesterId || null,
    user: ticket.user || 'Usuário', // mapeia para requester_name
    secao: ticket.secao || '',
    priority: ticket.priority || 'baixa',
    status: ticket.status || 'aberto',
    technicianId: ticket.technicianId || null,
    agent: ticket.agent || '',
    description: ticket.description || '',
    startedAt: ticket.startedAt || null,
    resolutionNote: '',
  });
  const { data, error } = await supabase.from('tickets').insert(row).select().single();
  if (error) throw error;
  return toCamel(data);
}

const TICKET_COLUMNS = ['title', 'requester_id', 'requester_name', 'secao', 'priority', 'status', 'technician_id', 'agent', 'description', 'started_at', 'resolved_at', 'resolution_note', 'updated_at'];

async function updateTicket(id, updates) {
  if (!supabase) return null;
  const row = toSnake({ ...updates, updatedAt: new Date().toISOString() });
  const filtered = {};
  for (const col of TICKET_COLUMNS) {
    if (row[col] !== undefined) filtered[col] = row[col];
  }
  const { data, error } = await supabase.from('tickets').update(filtered).eq('id', id).select().single();
  if (error) throw error;
  return toCamel(data);
}

async function deleteTicket(id) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('tickets').delete().eq('id', id).select().single();
  if (error) throw error;
  return toCamel(data);
}

async function getTicketMessages(ticketId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('ticket_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('id');
  if (error) throw error;
  return (data || []).map(toCamel);
}

async function createTicketMessage(ticketId, msg) {
  if (!supabase) return null;
  const row = toSnake({
    ticketId,
    senderId: msg.senderId,
    senderName: msg.senderName || 'Anônimo',
    senderRole: msg.senderRole || 'Usuario',
    text: msg.text,
  });
  const { data, error } = await supabase.from('ticket_messages').insert(row).select().single();
  if (error) throw error;
  return toCamel(data);
}

async function clearTicketMessages(ticketId) {
  if (!supabase) return;
  await supabase.from('ticket_messages').delete().eq('ticket_id', ticketId);
}

async function assignTicket(ticketId, technicianId, agent) {
  if (!supabase) return null;
  const techId = technicianId != null ? Number(technicianId) : null;
  const now = new Date().toISOString();
  const upd = techId
    ? { technician_id: techId, agent: agent || '', status: 'na_fila', updated_at: now }
    : { technician_id: null, agent: '', status: 'aberto', updated_at: now };
  const { error: errUpd } = await supabase.from('tickets').update(upd).eq('id', ticketId);
  if (errUpd) throw errUpd;
  await supabase.from('ticket_assignments').delete().eq('ticket_id', ticketId);
  if (techId) {
    await supabase.from('ticket_assignments').insert({ ticket_id: ticketId, technician_id: techId });
  }
  return getTicketById(ticketId);
}

async function getAssignedTickets(technicianId) {
  if (!supabase) return [];
  const techId = Number(technicianId);
  if (techId == null || isNaN(techId)) return [];
  const { data: assignments, error: errA } = await supabase
    .from('ticket_assignments')
    .select('ticket_id')
    .eq('technician_id', techId);
  if (errA || !assignments || assignments.length === 0) {
    return (await getTickets({ technicianId: techId })) || [];
  }
  const ticketIds = assignments.map((a) => a.ticket_id);
  const { data: ticketRows, error: errT } = await supabase
    .from('tickets')
    .select('*')
    .in('id', ticketIds)
    .order('id', { ascending: false });
  if (errT) return (await getTickets({ technicianId: techId })) || [];
  return (ticketRows || []).map(toCamel);
}

function isSupabase() {
  return !!supabase;
}

module.exports = {
  isSupabase,
  getUsers,
  getUserById,
  findUserByLogin,
  createUser,
  updateUser,
  deleteUser,
  getTickets,
  getTicketById,
  createTicket,
  updateTicket,
  deleteTicket,
  getTicketMessages,
  createTicketMessage,
  clearTicketMessages,
  assignTicket,
  getAssignedTickets,
};
