import { useEffect, useState, useCallback } from 'react';

const API = ''; // same origin (express serves build); in dev vite proxies to :8090

const fmt = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d)) return '-';
  return d.toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const statusColor = (s) =>
  s === 'online' ? '#4caf50' : s === 'idle' ? '#ffb300' : '#bdbdbd';

function StatusBadge({ status }) {
  return (
    <span style={{ color: statusColor(status), fontWeight: 700 }}>
      {status === 'online' ? '● Online' : status === 'idle' ? '● Idle' : '○ Offline'}
    </span>
  );
}

function Bubble({ m, meId, names }) {
  const isMe = m.senderId === meId;
  return (
    <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
      <div
        style={{
          maxWidth: '70%',
          background: isMe ? '#d6e9ff' : '#f0f0f0',
          borderRadius: 12,
          padding: '8px 12px',
        }}
      >
        {m.type === 'image' && m.imageData ? (
          <img
            src={`data:image/jpeg;base64,${m.imageData}`}
            alt="foto"
            style={{ maxWidth: 240, borderRadius: 8, display: 'block' }}
          />
        ) : (
          <div>{m.text || ''}</div>
        )}
        <div style={{ fontSize: 10, color: '#757575', marginTop: 4, textAlign: 'right' }}>
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
            <div style={{ color: '#757575', textAlign: 'center', padding: 40 }}>
              Belum ada pesan
            </div>
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
        <div className="modal">Memuat...</div>
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
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center' }}>
            {detail.hasAvatar && detail.avatar ? (
              <img
                src={`data:image/jpeg;base64,${detail.avatar}`}
                alt="avatar"
                style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: detail.gender === 'male' ? '#2196f3' : '#e91e63',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 22,
                }}
              >
                {detail.nickname?.[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ fontWeight: 700 }}>
                {detail.nickname} <StatusBadge status={detail.status} />
              </div>
              <div style={{ color: '#757575', fontSize: 13 }}>
                {detail.gender === 'male' ? 'Laki-laki' : detail.gender === 'female' ? 'Perempuan' : 'Lainnya'} · {detail.age} tahun
              </div>
              <div style={{ color: '#757575', fontSize: 13 }}>
                {detail.city}, {detail.country}
              </div>
              <div style={{ color: '#757575', fontSize: 13 }}>IP: {detail.ipAddress || '-'}</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: '#757575', marginBottom: 12 }}>
            UID: {detail.uid}
            <br />Login: {fmt(detail.loginAt)} · Created: {fmt(detail.createdAt)} · Terakhir aktif: {fmt(detail.presenceLastSeen)}
          </div>
          <h4 style={{ margin: '12px 0 8px' }}>Private Chats ({detail.chats.length})</h4>
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
                  <td>{c.otherName}</td>
                  <td style={{ color: '#757575' }}>{c.lastMessage || '-'}</td>
                  <td>{c.messageCount}</td>
                  <td style={{ color: '#757575' }}>{fmt(c.lastMessageAt)}</td>
                  <td>
                    <button className="btn" onClick={() => onOpenChat(c)}>Lihat</button>
                  </td>
                </tr>
              ))}
              {detail.chats.length === 0 && (
                <tr><td colSpan={5} style={{ color: '#757575' }}>Belum ada chat</td></tr>
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
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="search">
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
              <td style={{ fontWeight: 600 }}>{u.nickname} {u.hasAvatar && '📷'}</td>
              <td>{u.gender === 'male' ? '👨' : u.gender === 'female' ? '👩' : '—'}</td>
              <td>{u.age}</td>
              <td>{u.city}, {u.country}</td>
              <td style={{ color: '#757575', fontSize: 13 }}>{u.ipAddress || '-'}</td>
              <td><StatusBadge status={u.status} /></td>
              <td style={{ color: '#757575', fontSize: 13 }}>{fmt(u.loginAt)}</td>
              <td><button className="btn" onClick={() => onOpenUser(u)}>Detail</button></td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr><td colSpan={8} style={{ color: '#757575' }}>Tidak ada user</td></tr>
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
            <td style={{ fontSize: 12, color: '#757575' }}>{c.chatId.slice(0, 30)}...</td>
            <td>{Object.values(c.participantNames || {}).join(' ↔ ')}</td>
            <td style={{ color: '#757575' }}>{c.lastMessage || '-'}</td>
            <td>{c.messageCount}</td>
            <td style={{ color: '#757575', fontSize: 13 }}>{fmt(c.lastMessageAt)}</td>
            <td><button className="btn" onClick={() => onOpenChat(c)}>Lihat</button></td>
          </tr>
        ))}
        {chats.length === 0 && (
          <tr><td colSpan={6} style={{ color: '#757575' }}>Belum ada private chat</td></tr>
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
          <th>Online</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {rooms.map((r) => (
          <tr key={r.id}>
            <td style={{ fontWeight: 600 }}>{r.name}</td>
            <td>{r.online}</td>
            <td><button className="btn" onClick={() => onOpenRoom(r)}>Lihat Pesan</button></td>
          </tr>
        ))}
        {rooms.length === 0 && (
          <tr><td colSpan={3} style={{ color: '#757575' }}>Belum ada room</td></tr>
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
          <div style={{ fontSize: 12, color: '#b0bec5' }}>
            Supabase: chatyuk · terhubung langsung ke database aplikasi
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
          <div className="card"><div className="num">{summary?.users ?? '-'}</div><div className="lbl">Total User</div></div>
          <div className="card" style={{ borderTop: '3px solid #4caf50' }}><div className="num" style={{ color: '#4caf50' }}>{sc.online ?? 0}</div><div className="lbl">Online</div></div>
          <div className="card" style={{ borderTop: '3px solid #ffb300' }}><div className="num" style={{ color: '#ffb300' }}>{sc.idle ?? 0}</div><div className="lbl">Idle</div></div>
          <div className="card" style={{ borderTop: '3px solid #bdbdbd' }}><div className="num" style={{ color: '#757575' }}>{sc.offline ?? 0}</div><div className="lbl">Offline</div></div>
          <div className="card" style={{ borderTop: '3px solid #2196f3' }}><div className="num">{summary?.privateChats ?? '-'}</div><div className="lbl">Private Chat</div></div>
          <div className="card" style={{ borderTop: '3px solid #9c27b0' }}><div className="num">{summary?.rooms?.length ?? '-'}</div><div className="lbl">Room</div></div>
          <div className="card wide" style={{ borderTop: '3px solid #009688' }}>
            <div className="lbl" style={{ marginBottom: 8 }}>Room Online</div>
            {(summary?.rooms || []).map((r) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #eee' }}>
                <span>{r.name}</span><b style={{ color: '#4caf50' }}>{r.online}</b>
              </div>
            ))}
            {(summary?.rooms || []).length === 0 && <div style={{ color: '#757575' }}>Belum ada room</div>}
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
