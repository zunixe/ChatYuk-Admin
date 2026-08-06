require('dotenv').config();
const path = require('path');
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const server = express();
const PORT = process.env.PORT || 8090;

server.use(express.json());
server.use(express.static(path.join(__dirname, 'client', 'dist')));

const TS = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (v instanceof Date) return v.toISOString();
  return String(v);
};

const DEFAULT_ROOMS = [
  { id: 'general', name: 'General', description: 'Obrolan umum untuk semua', icon: '💬', order: 1 },
  { id: 'curhat', name: 'Curhat', description: 'Cerita dan curhat bareng', icon: '🤗', order: 2 },
  { id: 'pertemanan', name: 'Pertemanan', description: 'Cari temen baru di sini', icon: '🤝', order: 3 },
  { id: 'teknologi', name: 'Teknologi', description: 'Diskusi tech & gadget', icon: '💻', order: 4 },
  { id: 'gaming', name: 'Gaming', description: 'Main bareng & diskusi game', icon: '🎮', order: 5 },
  { id: 'musik', name: 'Musik', description: 'Sharing musik & lagu', icon: '🎵', order: 6 },
  { id: 'film', name: 'Film & TV', description: 'Rekomendasi & review film', icon: '🎬', order: 7 },
  { id: 'joke', name: 'Joke & Meme', description: 'Yang bikin ngakak', icon: '😂', order: 8 },
  { id: 'belajar', name: 'Belajar', description: 'Diskusi belajar & kuliah', icon: '📚', order: 9 },
  { id: 'flirt', name: 'Flirt', description: 'Ngobrol santai & asyik', icon: '😉', order: 10 },
];

// ── SEED ROOMS ──
server.get('/api/seed-rooms', async (req, res) => {
  try {
    const { error } = await supabase.from('rooms').upsert(DEFAULT_ROOMS, { onConflict: 'id' });
    if (error) throw error;
    res.json({ ok: true, seeded: DEFAULT_ROOMS.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── SUMMARY ──
server.get('/api/summary', async (req, res) => {
  try {
    const [profilesRes, chatsRes, roomsRes, presenceRes] = await Promise.all([
      supabase.from('profiles').select('id, status', { count: 'exact' }),
      supabase.from('private_chats').select('chat_id', { count: 'exact' }),
      supabase.from('rooms').select('id, name, icon, order').order('order'),
      supabase.from('room_presence').select('room_id, user_id'),
    ]);

    if (profilesRes.error) throw profilesRes.error;
    if (chatsRes.error) throw chatsRes.error;
    if (roomsRes.error) throw roomsRes.error;
    if (presenceRes.error) throw presenceRes.error;

    const statusCounts = { online: 0, idle: 0, offline: 0 };
    (profilesRes.data || []).forEach((p) => {
      const s = p.status || 'offline';
      if (statusCounts[s] != null) statusCounts[s]++;
    });

    // Count online per room
    const roomOnlineMap = {};
    (presenceRes.data || []).forEach((rp) => {
      roomOnlineMap[rp.room_id] = (roomOnlineMap[rp.room_id] || 0) + 1;
    });

    const rooms = (roomsRes.data || []).map((r) => ({
      id: r.id,
      name: r.name,
      online: roomOnlineMap[r.id] || 0,
    }));

    res.json({
      users: profilesRes.count || 0,
      registered: profilesRes.count || 0,
      statusCounts,
      privateChats: chatsRes.count || 0,
      rooms,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── USERS ──
server.get('/api/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const users = (data || []).map((u) => ({
      uid: u.id,
      nickname: u.nickname || 'Anon',
      gender: u.gender || '',
      age: u.age || 0,
      country: u.country || '',
      city: u.city || '',
      ipAddress: u.ip_address || '',
      loginAt: TS(u.login_at),
      createdAt: TS(u.created_at),
      status: u.status || 'offline',
      online: u.status === 'online',
      presenceLastSeen: TS(u.last_seen),
      hasAvatar: !!(u.avatar && u.avatar.length > 0),
    }));
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── USER DETAIL ──
server.get('/api/users/:uid', async (req, res) => {
  try {
    const uid = req.params.uid;
    const [profileRes, chatsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).single(),
      supabase
        .from('private_chats')
        .select('*')
        .contains('participants', [uid]),
    ]);

    if (profileRes.error) throw profileRes.error;
    if (!profileRes.data) return res.status(404).json({ error: 'User tidak ditemukan' });

    const u = profileRes.data;
    const chats = [];

    for (const c of chatsRes.data || []) {
      const parts = c.participants || [];
      const otherId = parts.find((x) => x !== uid);
      const otherName = (c.participant_names || {})[otherId] || otherId;

      // Get last message
      const { data: lastMsg } = await supabase
        .from('private_messages')
        .select('text, type, created_at')
        .eq('chat_id', c.chat_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Count messages
      const { count } = await supabase
        .from('private_messages')
        .select('id', { count: 'exact', head: true })
        .eq('chat_id', c.chat_id);

      chats.push({
        chatId: c.chat_id,
        otherId,
        otherName,
        lastMessage: lastMsg ? (lastMsg.type === 'image' ? '[Foto]' : lastMsg.text || '') : c.last_message || '',
        lastMessageAt: lastMsg ? TS(lastMsg.created_at) : TS(c.last_message_at),
        messageCount: count || 0,
      });
    }

    chats.sort((a, b) => (b.lastMessageAt || '').localeCompare(a.lastMessageAt || ''));

    res.json({
      uid,
      nickname: u.nickname || 'Anon',
      gender: u.gender || '',
      age: u.age || 0,
      country: u.country || '',
      city: u.city || '',
      ipAddress: u.ip_address || '',
      loginAt: TS(u.login_at),
      createdAt: TS(u.created_at),
      status: u.status || 'offline',
      online: u.status === 'online',
      presenceLastSeen: TS(u.last_seen),
      hasAvatar: !!(u.avatar && u.avatar.length > 0),
      avatar: u.avatar || '',
      chats,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── PRIVATE CHATS ──
server.get('/api/private-chats', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('private_chats')
      .select('*')
      .order('last_message_at', { ascending: false });
    if (error) throw error;

    const chats = [];
    for (const c of data || []) {
      const { count } = await supabase
        .from('private_messages')
        .select('id', { count: 'exact', head: true })
        .eq('chat_id', c.chat_id);

      chats.push({
        chatId: c.chat_id,
        participants: c.participants || [],
        participantNames: c.participant_names || {},
        lastMessage: c.last_message || '',
        lastMessageAt: TS(c.last_message_at),
        messageCount: count || 0,
      });
    }
    res.json(chats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── PRIVATE CHAT MESSAGES ──
server.get('/api/private-chats/:chatId/messages', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '200'), 500);
    const chatId = req.params.chatId;

    const [chatRes, msgsRes] = await Promise.all([
      supabase.from('private_chats').select('*').eq('chat_id', chatId).single(),
      supabase
        .from('private_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .limit(limit),
    ]);

    if (chatRes.error) throw chatRes.error;
    if (!chatRes.data) return res.status(404).json({ error: 'Chat tidak ditemukan' });

    const messages = (msgsRes.data || [])
      .map((m) => ({
        id: m.id,
        senderId: m.sender_id || '',
        senderName: m.sender_name || '',
        text: m.text || '',
        type: m.type || 'text',
        imageData: m.image_data || '',
        timestamp: TS(m.created_at),
      }))
      .reverse();

    res.json({ chatId, meta: chatRes.data, messages });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── ROOMS ──
server.get('/api/rooms', async (req, res) => {
  try {
    const [roomsRes, presenceRes] = await Promise.all([
      supabase.from('rooms').select('*').order('order'),
      supabase.from('room_presence').select('room_id'),
    ]);

    if (roomsRes.error) throw roomsRes.error;
    if (presenceRes.error) throw presenceRes.error;

    const onlineMap = {};
    (presenceRes.data || []).forEach((rp) => {
      onlineMap[rp.room_id] = (onlineMap[rp.room_id] || 0) + 1;
    });

    const rooms = (roomsRes.data || []).map((r) => ({
      id: r.id,
      name: r.name || r.id,
      description: r.description || '',
      icon: r.icon || '💬',
      order: r.order || 0,
      online: onlineMap[r.id] || 0,
    }));
    res.json(rooms);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── ROOM MESSAGES ──
server.get('/api/rooms/:roomId/messages', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '200'), 500);
    const roomId = req.params.roomId;

    const [roomRes, msgsRes] = await Promise.all([
      supabase.from('rooms').select('*').eq('id', roomId).single(),
      supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(limit),
    ]);

    if (roomRes.error) throw roomRes.error;
    if (!roomRes.data) return res.status(404).json({ error: 'Room tidak ditemukan' });

    const messages = (msgsRes.data || [])
      .map((m) => ({
        id: m.id,
        senderId: m.sender_id || '',
        senderName: m.sender_name || '',
        senderGender: m.sender_gender || '',
        text: m.text || '',
        type: m.type || 'text',
        imageData: m.image_data || '',
        timestamp: TS(m.created_at),
      }))
      .reverse();

    res.json({ roomId, meta: roomRes.data, messages });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── REPORTS ──
server.get('/api/reports', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;

    const reports = (data || []).map((r) => ({
      id: r.id,
      reporterId: r.reporter_id || '',
      reportedId: r.reported_id || '',
      reason: r.reason || '',
      timestamp: TS(r.created_at),
    }));
    res.json(reports);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── HEALTH ──
server.get('/api/health', (req, res) => res.json({ ok: true, db: 'supabase' }));

// ── SPA FALLBACK ──
server.use((req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

server.listen(PORT, '127.0.0.1', () =>
  console.log(`ChatYuk Admin running at http://localhost:${PORT} (Supabase)`)
);
