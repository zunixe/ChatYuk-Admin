import { useEffect, useState, useCallback } from 'react';

const API = '';

const fmt = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d)) return '-';
  return d.toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const timeAgo = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d)) return '-';
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'Baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
  return `${Math.floor(diff / 86400)}h lalu`;
};

function StatusBadge({ status }) {
  const cls = status === 'online' ? 'status-online' : status === 'idle' ? 'status-idle' : 'status-offline';
  const dot = status === 'online' ? '●' : status === 'idle' ? '◐' : '○';
  return <span className={cls} style={{ fontWeight: 700, fontSize: 13 }}>{dot} {status}</span>;
}

function Bubble({ m, meId, names }) {
  const isMe = m.senderId === meId;
  return (
    <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
      <div style={{
        maxWidth: '70%',
        background: isMe
          ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
          : 'var(--bg-card)',
        border: isMe ? 'none' : '1px solid var(--border)',
        borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        padding: '12px 16px',
      }}>
        {m.type === 'image' && m.imageData ? (
          <img
            src={`data:image/jpeg;base64,${m.imageData}`}
            alt="foto"
            style={{ maxWidth: 240, borderRadius: 10, display: 'block' }}
          />
        ) : (
          <div style={{ fontSize: 14, lineHeight: 1.5 }}>{m.text || ''}</div>
        )}
        <div style={{ fontSize: 11, color: isMe ? 'rgba(255,255,255,0.7)' : 'var(--text-dim)', marginTop: 6, textAlign: 'right' }}>
          {names[m.senderId] || m.senderName || m.senderId?.slice(0, 8)} · {fmt(m.timestamp)}
        </div>
      </div>
    </div>
  );
}

function MessagesModal({ title, messages, meId, names, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <b>{title}</b>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="modal-body chat-body">
          {messages.length === 0 ? (
            <div className="empty-state">Belum ada pesan</div>
          ) : (
            messages.map((m) => <Bubble key={m.id} m={m} meId={meId} names={names} />)
          )}
        </div>
      </div>
    </div>
  );
}

function UserModal({ user, onClose, onOpenChat }) {
  const [detail, setDetail] = useState(null);
  useEffect(() => {
    fetch(`${API}/api/users/${user.uid}`)
      .then((r) => r.json())
      .then(setDetail)
      .catch(() => {});
  }, [user.uid]);

  if (!detail) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ color: 'var(--text-muted)' }}>Memuat...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <b>User: {detail.nickname}</b>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', gap: 20, marginBottom: 24, alignItems: 'center' }}>
            {detail.hasAvatar && detail.avatar ? (
              <img
                src={`data:image/jpeg;base64,${detail.avatar}`}
                alt="avatar"
                style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent)' }}
              />
            ) : (
              <div className={`avatar ${detail.gender === 'male' ? 'avatar-male' : 'avatar-female'}`} style={{ width: 72, height: 72, fontSize: 26 }}>
                {detail.nickname?.[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 4 }}>
                {detail.nickname} <StatusBadge status={detail.status} />
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                {detail.gender === 'male' ? '♂ Laki-laki' : detail.gender === 'female' ? '♀ Perempuan' : '⬡ Lainnya'} · {detail.age} tahun
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                📍 {detail.city}, {detail.country}
              </div>
              <div style={{ color: 'var(--text-dim)', fontSize: 13, fontFamily: 'monospace' }}>IP: {detail.ipAddress || '-'}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Login</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{fmt(detail.loginAt)}</div>
            </div>
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Created</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{fmt(detail.createdAt)}</div>
            </div>
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Terakhir Aktif</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{timeAgo(detail.presenceLastSeen)}</div>
            </div>
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'monospace', marginBottom: 20, padding: '10px 14px', background: 'var(--bg)', borderRadius: 8 }}>
            UID: {detail.uid}
          </div>

          <h4 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
            Private Chats ({detail.chats.length})
          </h4>
          <table className="tbl">
            <thead>
              <tr>
                <th>Dengan</th>
                <th>Pesan Terakhir</th>
                <th>Jumlah</th>
                <th>Waktu</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {detail.chats.map((c) => (
                <tr key={c.chatId}>
                  <td style={{ fontWeight: 600 }}>{c.otherName}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{c.lastMessage || '-'}</td>
                  <td>{c.messageCount}</td>
                  <td style={{ color: 'var(--text-dim)', fontSize: 13 }}>{timeAgo(c.lastMessageAt)}</td>
                  <td>
                    <button className="btn" onClick={() => onOpenChat(c)}>Lihat</button>
                  </td>
                </tr>
              ))}
              {detail.chats.length === 0 && (
                <tr><td colSpan={5} className="empty-state">Belum ada chat</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function UsersTab({ users, onOpenUser }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const filtered = users.filter((u) => {
    if (filter !== 'all' && u.status !== filter) return false;
    const s = `${u.nickname} ${u.country} ${u.city} ${u.ipAddress} ${u.uid}`.toLowerCase();
    return s.includes(q.toLowerCase());
  });
  return (
    <div>
      <div className="toolbar">
        <input
          placeholder="Cari nickname / negara / IP / UID..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="search"
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="search" style={{ minWidth: 160 }}>
          <option value="all">Semua status</option>
          <option value="online">Online</option>
          <option value="idle">Idle</option>
          <option value="offline">Offline</option>
        </select>
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th>Nickname</th>
            <th>Gender</th>
            <th>Umur</th>
            <th>Lokasi</th>
            <th>IP</th>
            <th>Status</th>
            <th>Login</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((u) => (
            <tr key={u.uid}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className={`avatar ${u.gender === 'male' ? 'avatar-male' : 'avatar-female'}`} style={{ width: 32, height: 32, fontSize: 13 }}>
                    {u.nickname?.[0]?.toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 600 }}>{u.nickname}</span>
                  {u.hasAvatar && <span style={{ fontSize: 14 }}>📷</span>}
                </div>
              </td>
              <td>{u.gender === 'male' ? '♂' : u.gender === 'female' ? '♀' : '—'}</td>
              <td>{u.age}</td>
              <td>{u.city}, {u.country}</td>
              <td style={{ color: 'var(--text-dim)', fontSize: 12, fontFamily: 'monospace' }}>{u.ipAddress || '-'}</td>
              <td><StatusBadge status={u.status} /></td>
              <td style={{ color: 'var(--text-dim)', fontSize: 13 }}>{timeAgo(u.loginAt)}</td>
              <td><button className="btn" onClick={() => onOpenUser(u)}>Detail</button></td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr><td colSpan={8} className="empty-state">Tidak ada user</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PrivateChatsTab({ onOpenChat }) {
  const [chats, setChats] = useState([]);
  const refresh = useCallback(() => {
    fetch(`${API}/api/private-chats`)
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setChats(d))
      .catch(() => {});
  }, []);
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [refresh]);

  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Chat ID</th>
          <th>Peserta</th>
          <th>Pesan Terakhir</th>
          <th>Jumlah Pesan</th>
          <th>Waktu</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {chats.map((c) => (
          <tr key={c.chatId}>
            <td style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'monospace' }}>{c.chatId.slice(0, 30)}...</td>
            <td style={{ fontWeight: 500 }}>{Object.values(c.participantNames || {}).join(' ↔ ')}</td>
            <td style={{ color: 'var(--text-muted)' }}>{c.lastMessage || '-'}</td>
            <td>
              <span style={{ background: 'var(--bg)', padding: '4px 10px', borderRadius: 6, fontSize: 13, fontWeight: 600 }}>
                {c.messageCount}
              </span>
            </td>
            <td style={{ color: 'var(--text-dim)', fontSize: 13 }}>{timeAgo(c.lastMessageAt)}</td>
            <td><button className="btn" onClick={() => onOpenChat(c)}>Lihat</button></td>
          </tr>
        ))}
        {chats.length === 0 && (
          <tr><td colSpan={6} className="empty-state">Belum ada private chat</td></tr>
        )}
      </tbody>
    </table>
  );
}

function RoomsTab({ onOpenRoom }) {
  const [rooms, setRooms] = useState([]);
  useEffect(() => {
    const refresh = () => {
      fetch(`${API}/api/rooms`)
        .then((r) => r.json())
        .then((d) => Array.isArray(d) && setRooms(d))
        .catch(() => {});
    };
    refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, []);
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Room</th>
          <th>Deskripsi</th>
          <th>Online</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rooms.map((r) => (
          <tr key={r.id}>
            <td>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>{r.icon}</span>
                <span style={{ fontWeight: 600 }}>{r.name}</span>
              </div>
            </td>
            <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{r.description}</td>
            <td>
              <span style={{
                background: r.online > 0 ? 'var(--green-glow)' : 'var(--bg)',
                color: r.online > 0 ? 'var(--green)' : 'var(--text-dim)',
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 700,
              }}>
                {r.online}
              </span>
            </td>
            <td><button className="btn" onClick={() => onOpenRoom(r)}>Lihat Pesan</button></td>
          </tr>
        ))}
        {rooms.length === 0 && (
          <tr><td colSpan={4} className="empty-state">Belum ada room</td></tr>
        )}
      </tbody>
    </table>
  );
}

function App() {
  const [tab, setTab] = useState('dashboard');
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [userModal, setUserModal] = useState(null);
  const [chatModal, setChatModal] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);

  const refreshAll = useCallback(() => {
    fetch(`${API}/api/summary`).then((r) => r.json()).then(setSummary).catch(() => {});
    fetch(`${API}/api/users`).then((r) => r.json()).then((d) => Array.isArray(d) && setUsers(d)).catch(() => {});
  }, []);
  useEffect(() => {
    refreshAll();
    const t = setInterval(refreshAll, 10000);
    return () => clearInterval(t);
  }, [refreshAll]);

  const openChat = (c) => {
    setChatLoading(true);
    setChatModal({ ...c, messages: [] });
    fetch(`${API}/api/private-chats/${c.chatId}/messages?limit=200`)
      .then((r) => r.json())
      .then((d) => {
        setChatModal((prev) => ({
          ...prev,
          messages: d.messages || [],
          meId: (d.meta?.participants || [])[0],
          names: d.meta?.participantNames || {},
        }));
      })
      .catch(() => {})
      .finally(() => setChatLoading(false));
  };

  const openRoomChat = (r) => {
    setChatLoading(true);
    setChatModal({ roomId: r.id, messages: [], isRoom: true });
    fetch(`${API}/api/rooms/${r.id}/messages?limit=200`)
      .then((res) => res.json())
      .then((d) => setChatModal((prev) => ({ ...prev, messages: d.messages || [] })))
      .catch(() => {})
      .finally(() => setChatLoading(false));
  };

  const sc = summary?.statusCounts || {};

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>ChatYuk Admin</h1>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
            Supabase Connected · Realtime Dashboard
          </div>
        </div>
        <nav>
          <button className={tab === 'dashboard' ? 'tab active' : 'tab'} onClick={() => setTab('dashboard')}>Dashboard</button>
          <button className={tab === 'users' ? 'tab active' : 'tab'} onClick={() => setTab('users')}>Users ({users.length})</button>
          <button className={tab === 'chats' ? 'tab active' : 'tab'} onClick={() => setTab('chats')}>Private Chats</button>
          <button className={tab === 'rooms' ? 'tab active' : 'tab'} onClick={() => setTab('rooms')}>Rooms</button>
        </nav>
      </header>

      {tab === 'dashboard' && (
        <div className="cards">
          <div className="card">
            <div className="num">{summary?.users ?? '-'}</div>
            <div className="lbl">Total User</div>
          </div>
          <div className="card" style={{ borderTop: '3px solid var(--green)' }}>
            <div className="num" style={{ color: 'var(--green)' }}>{sc.online ?? 0}</div>
            <div className="lbl">Online</div>
          </div>
          <div className="card" style={{ borderTop: '3px solid var(--yellow)' }}>
            <div className="num" style={{ color: 'var(--yellow)' }}>{sc.idle ?? 0}</div>
            <div className="lbl">Idle</div>
          </div>
          <div className="card" style={{ borderTop: '3px solid var(--text-dim)' }}>
            <div className="num" style={{ color: 'var(--text-dim)' }}>{sc.offline ?? 0}</div>
            <div className="lbl">Offline</div>
          </div>
          <div className="card" style={{ borderTop: '3px solid var(--accent)' }}>
            <div className="num">{summary?.privateChats ?? '-'}</div>
            <div className="lbl">Private Chat</div>
          </div>
          <div className="card" style={{ borderTop: '3px solid var(--purple)' }}>
            <div className="num">{summary?.rooms?.length ?? '-'}</div>
            <div className="lbl">Room</div>
          </div>
          <div className="card wide" style={{ borderTop: '3px solid var(--cyan)' }}>
            <div className="lbl" style={{ marginBottom: 16 }}>Room Online</div>
            {(summary?.rooms || []).map((r) => (
              <div key={r.id} className="room-item">
                <span>{r.name}</span>
                <b>{r.online}</b>
              </div>
            ))}
            {(summary?.rooms || []).length === 0 && <div className="empty-state">Belum ada room</div>}
          </div>
        </div>
      )}

      {tab === 'users' && <UsersTab users={users} onOpenUser={setUserModal} />}
      {tab === 'chats' && <PrivateChatsTab onOpenChat={openChat} />}
      {tab === 'rooms' && <RoomsTab onOpenRoom={openRoomChat} />}

      {userModal && (
        <UserModal user={userModal} onClose={() => setUserModal(null)} onOpenChat={(c) => { setUserModal(null); openChat(c); }} />
      )}
      {chatModal && (
        <MessagesModal
          title={chatModal.isRoom ? `Room: ${chatModal.roomId}` : `Chat: ${Object.values(chatModal.names || {}).join(' ↔ ')}`}
          messages={chatModal.messages}
          meId={chatModal.meId}
          names={chatModal.names || {}}
          onClose={() => setChatModal(null)}
        />
      )}
      {chatLoading && <div className="loading">Memuat pesan...</div>}
    </div>
  );
}

export default App;
