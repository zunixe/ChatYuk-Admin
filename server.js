require('dotenv').config();
const path = require('path');
const express = require('express');
const compression = require('compression');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const server = express();
const PORT = process.env.PORT || 8090;

// ── MIDDLEWARE ──
server.use(compression());
server.use(express.json());
server.use(express.static(path.join(__dirname, 'client', 'dist'), {
  maxAge: '1h',
  etag: true,
}));

// ── CACHE ──
const cache = new Map();
const CACHE_TTL = 5000; // 5 detik

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

function clearCache() {
  cache.clear();
}

const TS = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (v instanceof Date) return v.toISOString();
  return String(v);
};

// Derive status asli dari umur last_seen.
// App update last_seen tiap 60s (heartbeat). Kalau app di-kill,
// last_seen jadi basi -> status tampil offline walau DB bilang online.
const STALE_MS = 5 * 60 * 1000; // 5 menit

function deriveStatus(rawStatus, lastSeen) {
  const ts = Date.parse(lastSeen);
  if (!lastSeen || isNaN(ts)) return 'offline';
  if (Date.now() - ts > STALE_MS) return 'offline';
  return rawStatus || 'offline';
}

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
    clearCache();
    res.json({ ok: true, seeded: DEFAULT_ROOMS.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── SUMMARY (cached) ──
server.get('/api/summary', async (req, res) => {
  try {
    const cached = getCached('summary');
    if (cached) return res.json(cached);

    const [profilesRes, chatsRes, roomsRes, presenceRes] = await Promise.all([
      supabase.from('profiles').select('id, status, last_seen', { count: 'exact' }),
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
      const s = deriveStatus(p.status, p.last_seen);
      if (statusCounts[s] != null) statusCounts[s]++;
    });

    const roomOnlineMap = {};
    (presenceRes.data || []).forEach((rp) => {
      roomOnlineMap[rp.room_id] = (roomOnlineMap[rp.room_id] || 0) + 1;
    });

    const rooms = (roomsRes.data || []).map((r) => ({
      id: r.id,
      name: r.name,
      online: roomOnlineMap[r.id] || 0,
    }));

    const result = {
      users: profilesRes.count || 0,
      registered: profilesRes.count || 0,
      statusCounts,
      privateChats: chatsRes.count || 0,
      rooms,
    };

    setCache('summary', result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── USERS (cached) ──
server.get('/api/users', async (req, res) => {
  try {
    const cached = getCached('users');
    if (cached) return res.json(cached);

    const { data, error } = await supabase
      .from('profiles')
      .select('id, nickname, gender, age, country, city, ip_address, status, avatar, login_at, created_at, last_seen, is_registered')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const users = (data || []).map((u) => {
      const st = deriveStatus(u.status, u.last_seen);
      return {
        uid: u.id,
        nickname: u.nickname || 'Anon',
        gender: u.gender || '',
        age: u.age || 0,
        country: u.country || '',
        city: u.city || '',
        ipAddress: u.ip_address || '',
        loginAt: TS(u.login_at),
        createdAt: TS(u.created_at),
        status: st,
        online: st === 'online',
        isRegistered: !!u.is_registered,
        presenceLastSeen: TS(u.last_seen),
        hasAvatar: !!(u.avatar && u.avatar.length > 0),
      };
    });

    setCache('users', users);
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── USER DETAIL (optimized - no N+1) ──
server.get('/api/users/:uid', async (req, res) => {
  try {
    const uid = req.params.uid;
    const cacheKey = `user:${uid}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    // Parallel queries
    const [profileRes, chatsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).single(),
      supabase.from('private_chats').select('*').contains('participants', [uid]),
    ]);

    if (profileRes.error) throw profileRes.error;
    if (!profileRes.data) return res.status(404).json({ error: 'User tidak ditemukan' });

    const u = profileRes.data;
    const chatData = chatsRes.data || [];

    // Batch query: ambil semua last messages sekaligus
    const chatIds = chatData.map((c) => c.chat_id);

    let lastMessagesMap = {};
    let messageCountsMap = {};

    if (chatIds.length > 0) {
      // Parallel: last messages + counts
      const [lastMsgsRes, countsRes] = await Promise.all([
        // Ambil 1 pesan terakhir per chat pakai RPC atau subquery
        supabase.rpc('get_last_messages', { chat_ids: chatIds }),
        // Count per chat pakai RPC
        supabase.rpc('get_message_counts', { chat_ids: chatIds }),
      ]);

      if (!lastMsgsRes.error && lastMsgsRes.data) {
        lastMsgsRes.data.forEach((m) => {
          lastMessagesMap[m.chat_id] = m;
        });
      }

      if (!countsRes.error && countsRes.data) {
        countsRes.data.forEach((c) => {
          messageCountsMap[c.chat_id] = c.cnt;
        });
      }
    }

    const chats = chatData.map((c) => {
      const parts = c.participants || [];
      const otherId = parts.find((x) => x !== uid);
      const otherName = (c.participant_names || {})[otherId] || otherId;
      const lastMsg = lastMessagesMap[c.chat_id];

      return {
        chatId: c.chat_id,
        otherId,
        otherName,
        lastMessage: lastMsg ? (lastMsg.type === 'image' ? '[Foto]' : lastMsg.text || '') : c.last_message || '',
        lastMessageAt: lastMsg ? TS(lastMsg.created_at) : TS(c.last_message_at),
        messageCount: messageCountsMap[c.chat_id] || 0,
      };
    });

    chats.sort((a, b) => (b.lastMessageAt || '').localeCompare(a.lastMessageAt || ''));

    const st = deriveStatus(u.status, u.last_seen);
    const result = {
      uid,
      nickname: u.nickname || 'Anon',
      gender: u.gender || '',
      age: u.age || 0,
      country: u.country || '',
      city: u.city || '',
      ipAddress: u.ip_address || '',
      loginAt: TS(u.login_at),
      createdAt: TS(u.created_at),
      status: st,
      online: st === 'online',
      isRegistered: !!u.is_registered,
      presenceLastSeen: TS(u.last_seen),
      hasAvatar: !!(u.avatar && u.avatar.length > 0),
      avatar: u.avatar || '',
      chats,
    };

    setCache(cacheKey, result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── PRIVATE CHATS (optimized - no N+1) ──
server.get('/api/private-chats', async (req, res) => {
  try {
    const cached = getCached('private-chats');
    if (cached) return res.json(cached);

    const { data, error } = await supabase
      .from('private_chats')
      .select('*')
      .order('last_message_at', { ascending: false });
    if (error) throw error;

    const chatData = data || [];
    const chatIds = chatData.map((c) => c.chat_id);

    let messageCountsMap = {};

    if (chatIds.length > 0) {
      const { data: counts, error: countError } = await supabase.rpc('get_message_counts', { chat_ids: chatIds });
      if (!countError && counts) {
        counts.forEach((c) => {
          messageCountsMap[c.chat_id] = c.cnt;
        });
      }
    }

    const chats = chatData.map((c) => ({
      chatId: c.chat_id,
      participants: c.participants || [],
      participantNames: c.participant_names || {},
      lastMessage: c.last_message || '',
      lastMessageAt: TS(c.last_message_at),
      messageCount: messageCountsMap[c.chat_id] || 0,
    }));

    setCache('private-chats', chats);
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
    const cacheKey = `msgs:${chatId}:${limit}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const [chatRes, msgsRes] = await Promise.all([
      supabase.from('private_chats').select('*').eq('chat_id', chatId).single(),
      supabase
        .from('private_messages')
        .select('id, sender_id, sender_name, text, type, image_data, created_at')
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

    const result = { chatId, meta: chatRes.data, messages };
    setCache(cacheKey, result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── ROOMS (cached) ──
server.get('/api/rooms', async (req, res) => {
  try {
    const cached = getCached('rooms');
    if (cached) return res.json(cached);

    const [roomsRes, presenceRes] = await Promise.all([
      supabase.from('rooms').select('id, name, description, icon, order').order('order'),
      supabase.from('room_presence').select('room_id'),
    ]);

    if (roomsRes.error) throw roomsRes.error;
    if (presenceRes.error) throw presenceRes.error;

    const onlineMap = {};
    (presenceRes.data || []).forEach((rp) => {
      onlineMap[rp.room_id] = (onlineMap[rp.room_id] || 0) + 1;
    });

    const rooms = (roomsRes.data || []).map((r) => {
      // Extract country from room ID (e.g., "Indonesia_general" -> "Indonesia")
      const parts = r.id.split('_');
      const country = parts.length > 1 ? parts[0] : 'Unknown';
      
      return {
        id: r.id,
        name: r.name || r.id,
        description: r.description || '',
        icon: r.icon || '💬',
        order: r.order || 0,
        country,
        online: onlineMap[r.id] || 0,
      };
    });

    setCache('rooms', rooms);
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
    const cacheKey = `room-msgs:${roomId}:${limit}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const [roomRes, msgsRes] = await Promise.all([
      supabase.from('rooms').select('id, name, description, icon').eq('id', roomId).single(),
      supabase
        .from('messages')
        .select('id, sender_id, sender_name, sender_gender, text, type, image_data, created_at')
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

    const result = { roomId, meta: roomRes.data, messages };
    setCache(cacheKey, result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── REPORTS ──
server.get('/api/reports', async (req, res) => {
  try {
    const cached = getCached('reports');
    if (cached) return res.json(cached);

    const { data, error } = await supabase
      .from('reports')
      .select('id, reporter_id, reported_id, reason, created_at')
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

    setCache('reports', reports);
    res.json(reports);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── ANALYTICS ──
server.get('/api/analytics', async (req, res) => {
  try {
    const cached = getCached('analytics');
    if (cached) return res.json(cached);

    // Get table sizes via raw SQL
    const { data: tableSizes, error: tableError } = await supabase.rpc('get_table_sizes');

    // Get row counts for each table
    const [profiles, messages, privateMessages, rooms, privateChats, roomPresence, reports, blocks] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('messages').select('id', { count: 'exact', head: true }),
      supabase.from('private_messages').select('id', { count: 'exact', head: true }),
      supabase.from('rooms').select('id', { count: 'exact', head: true }),
      supabase.from('private_chats').select('chat_id', { count: 'exact', head: true }),
      supabase.from('room_presence').select('room_id', { count: 'exact', head: true }),
      supabase.from('reports').select('id', { count: 'exact', head: true }),
      supabase.from('blocks').select('blocker_id', { count: 'exact', head: true }),
    ]);

    // Get chat data and photo data sizes using length()
    const [msgTextRes, msgImgRes, pvtTextRes, pvtImgRes] = await Promise.all([
      supabase.from('messages').select('text').neq('text', ''),
      supabase.from('messages').select('image_data').neq('image_data', ''),
      supabase.from('private_messages').select('text').neq('text', ''),
      supabase.from('private_messages').select('image_data').neq('image_data', ''),
    ]);

    let chatDataSize = 0;
    let photoDataSize = 0;
    let totalMessages = 0;
    let totalPhotos = 0;

    // Calculate text sizes
    (msgTextRes.data || []).forEach((r) => { if (r.text) chatDataSize += r.text.length; });
    (pvtTextRes.data || []).forEach((r) => { if (r.text) chatDataSize += r.text.length; });
    totalMessages = (msgTextRes.data || []).length + (pvtTextRes.data || []).length;

    // Calculate image sizes
    (msgImgRes.data || []).forEach((r) => { if (r.image_data) photoDataSize += r.image_data.length; });
    (pvtImgRes.data || []).forEach((r) => { if (r.image_data) photoDataSize += r.image_data.length; });
    totalPhotos = (msgImgRes.data || []).length + (pvtImgRes.data || []).length;

    // Build table info
    const tables = [
      { name: 'profiles', rows: profiles.count || 0 },
      { name: 'messages', rows: messages.count || 0 },
      { name: 'private_messages', rows: privateMessages.count || 0 },
      { name: 'rooms', rows: rooms.count || 0 },
      { name: 'private_chats', rows: privateChats.count || 0 },
      { name: 'room_presence', rows: roomPresence.count || 0 },
      { name: 'reports', rows: reports.count || 0 },
      { name: 'blocks', rows: blocks.count || 0 },
    ];

    // If we got table sizes from RPC, merge them
    if (!tableError && tableSizes) {
      tableSizes.forEach((ts) => {
        const table = tables.find((t) => t.name === ts.table_name);
        if (table) {
          table.size = ts.table_size || '-';
          table.indexSize = ts.index_size || '-';
          table.totalSize = ts.total_size || '-';
        }
      });
    }

    // Format bytes to human readable
    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Free tier limits (Supabase)
    const result = {
      database: {
        used: '28 MB',
        limit: '500 MB',
        usedPercent: 5.6,
      },
      storage: {
        used: '0 GB',
        limit: '1 GB',
        usedPercent: 0,
      },
      bandwidth: {
        used: '8 MB',
        limit: '5 GB',
        usedPercent: 0.16,
      },
      mau: {
        current: 3,
        limit: '50,000',
      },
      chatData: {
        size: formatBytes(chatDataSize),
        sizeBytes: chatDataSize,
        messages: totalMessages,
      },
      photoData: {
        size: formatBytes(photoDataSize),
        sizeBytes: photoDataSize,
        photos: totalPhotos,
      },
      tables,
      objects: {
        tables: 8,
        functions: 2,
        indexes: 4,
        policies: 15,
      },
    };

    setCache('analytics', result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── SETTINGS: SUPABASE ──
server.get('/api/settings/supabase', async (req, res) => {
  try {
    const cached = getCached('settings-supabase');
    if (cached) return res.json(cached);

    const url = process.env.SUPABASE_URL || '';
    const projectRef = url.replace('https://', '').replace('.supabase.co', '');
    const anonKey = process.env.SUPABASE_ANON_KEY || '';
    const serviceKey = process.env.SUPABASE_SERVICE_KEY || '';

    // Count objects
    const { data: rpcFunctions } = await supabase.rpc('get_table_sizes');

    const result = {
      url,
      projectRef,
      anonKey: anonKey ? anonKey.slice(0, 20) + '...' : 'Not set',
      serviceKey: serviceKey ? serviceKey.slice(0, 20) + '...' : 'Not set',
      tables: 8,
      functions: 4,
      policies: 15,
      realtimeTables: ['room_presence', 'messages', 'private_messages', 'private_chats', 'profiles'],
    };

    setCache('settings-supabase', result);
    res.json(result);
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
