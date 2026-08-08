import { useEffect, useState, useCallback, memo } from 'react';

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

const StatusBadge = memo(function StatusBadge({ status }) {
  const cls = status === 'online' ? 'status-online' : status === 'idle' ? 'status-idle' : 'status-offline';
  const dot = status === 'online' ? '●' : status === 'idle' ? '◐' : '○';
  return <span className={cls} style={{ fontWeight: 700, fontSize: 13 }}>{dot} {status}</span>;
});

const Bubble = memo(function Bubble({ m, meId, names }) {
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
});

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

const UsersTab = memo(function UsersTab({ users, onOpenUser }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const registered = users.filter((u) => u.isRegistered);
  const guests = users.filter((u) => !u.isRegistered);

  const filtered = users.filter((u) => {
    if (typeFilter === 'registered' && !u.isRegistered) return false;
    if (typeFilter === 'guest' && u.isRegistered) return false;
    if (filter !== 'all' && u.status !== filter) return false;
    const s = `${u.nickname} ${u.country} ${u.city} ${u.ipAddress} ${u.uid}`.toLowerCase();
    return s.includes(q.toLowerCase());
  });

  const typeButtons = [
    { id: 'all', label: `Semua (${users.length})` },
    { id: 'registered', label: `✓ Terdaftar (${registered.length})` },
    { id: 'guest', label: `○ Guest (${guests.length})` },
  ];

  return (
    <div>
      <div className="toolbar">
        <div style={{ display: 'flex', gap: 6, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 4 }}>
          {typeButtons.map((t) => (
            <button
              key={t.id}
              onClick={() => setTypeFilter(t.id)}
              style={{
                background: typeFilter === t.id ? 'var(--accent)' : 'transparent',
                color: typeFilter === t.id ? '#fff' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 6,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.2s ease',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
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
            <th>Tipe</th>
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
              <td>
                {u.isRegistered ? (
                  <span style={{
                    background: 'rgba(34, 197, 94, 0.15)',
                    color: 'var(--green)',
                    padding: '3px 10px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                  }}>✓ Terdaftar</span>
                ) : (
                  <span style={{
                    background: 'rgba(148, 163, 184, 0.15)',
                    color: 'var(--text-muted)',
                    padding: '3px 10px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                  }}>○ Guest</span>
                )}
              </td>
              <td style={{ color: 'var(--text-dim)', fontSize: 13 }}>{timeAgo(u.loginAt)}</td>
              <td><button className="btn" onClick={() => onOpenUser(u)}>Detail</button></td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr><td colSpan={9} className="empty-state">Tidak ada user</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
});

const PrivateChatsTab = memo(function PrivateChatsTab({ onOpenChat }) {
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
});

const RoomsTab = memo(function RoomsTab({ onOpenRoom }) {
  const [rooms, setRooms] = useState([]);
  const [countryFilter, setCountryFilter] = useState('all');
  
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

  // Get unique countries
  const countries = [...new Set(rooms.map(r => r.country))].sort();
  
  // Filter rooms by country
  const filteredRooms = countryFilter === 'all' 
    ? rooms 
    : rooms.filter(r => r.country === countryFilter);

  return (
    <div>
      <div className="toolbar">
        <select 
          value={countryFilter} 
          onChange={(e) => setCountryFilter(e.target.value)} 
          className="search" 
          style={{ minWidth: 200 }}
        >
          <option value="all">Semua Negara</option>
          {countries.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 8, 
          padding: '0 12px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 13,
          color: 'var(--text-muted)'
        }}>
          <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{filteredRooms.length}</span> room
        </div>
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th>Room</th>
            <th>Negara</th>
            <th>Deskripsi</th>
            <th>Online</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filteredRooms.map((r) => (
            <tr key={r.id}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{r.icon}</span>
                  <span style={{ fontWeight: 600 }}>{r.name}</span>
                </div>
              </td>
              <td>
                <span style={{ 
                  background: 'var(--bg)', 
                  padding: '4px 10px', 
                  borderRadius: 6, 
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <span style={{ 
                    width: 16, 
                    height: 12, 
                    borderRadius: 2,
                    background: 'var(--accent)',
                    display: 'inline-block'
                  }}></span>
                  {r.country}
                </span>
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
          {filteredRooms.length === 0 && (
            <tr><td colSpan={5} className="empty-state">Tidak ada room untuk negara ini</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
});

// ── ANALYTICS PAGE ──
function AnalyticsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/analytics`)
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 15 }}>Memuat analytics...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="empty-state">Gagal memuat data analytics</div>
    );
  }

  const storagePercent = stats.storage?.usedPercent || 0;
  const dbPercent = stats.database?.usedPercent || 0;

  return (
    <div>
      {/* Storage Overview */}
      <div className="cards" style={{ marginBottom: 24 }}>
        <div className="card" style={{ borderTop: '3px solid var(--cyan)' }}>
          <div className="lbl">Database Size</div>
          <div className="num" style={{ fontSize: 28 }}>{stats.database?.used || '-'}</div>
          <div style={{ marginTop: 8 }}>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${dbPercent}%`, background: 'var(--cyan)' }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
              {dbPercent}% dari {stats.database?.limit || '-'}
            </div>
          </div>
        </div>

        <div className="card" style={{ borderTop: '3px solid var(--purple)' }}>
          <div className="lbl">File Storage</div>
          <div className="num" style={{ fontSize: 28 }}>{stats.storage?.used || '-'}</div>
          <div style={{ marginTop: 8 }}>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${storagePercent}%`, background: 'var(--purple)' }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
              {storagePercent}% dari {stats.storage?.limit || '-'}
            </div>
          </div>
        </div>

        <div className="card" style={{ borderTop: '3px solid var(--accent)' }}>
          <div className="lbl">Bandwidth (Egress)</div>
          <div className="num" style={{ fontSize: 28 }}>{stats.bandwidth?.used || '-'}</div>
          <div style={{ marginTop: 8 }}>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${stats.bandwidth?.usedPercent || 0}%`, background: 'var(--accent)' }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
              {stats.bandwidth?.usedPercent || 0}% dari {stats.bandwidth?.limit || '-'}
            </div>
          </div>
        </div>

        <div className="card" style={{ borderTop: '3px solid var(--green)' }}>
          <div className="lbl">Monthly Active Users</div>
          <div className="num" style={{ fontSize: 28 }}>{stats.mau?.current || 0}</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>
            Limit: {stats.mau?.limit || '-'}
          </div>
        </div>
      </div>

      {/* Data Breakdown */}
      <div className="cards" style={{ marginBottom: 24 }}>
        <div className="card" style={{ borderTop: '3px solid var(--yellow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 24 }}>💬</span>
            <div className="lbl" style={{ margin: 0 }}>Data Chat (Teks)</div>
          </div>
          <div className="num" style={{ fontSize: 28 }}>{stats.chatData?.size || '0 B'}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
            {stats.chatData?.messages?.toLocaleString() || 0} pesan teks
          </div>
        </div>

        <div className="card" style={{ borderTop: '3px solid var(--pink)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 24 }}>📷</span>
            <div className="lbl" style={{ margin: 0 }}>Data Foto (Base64)</div>
          </div>
          <div className="num" style={{ fontSize: 28 }}>{stats.photoData?.size || '0 B'}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
            {stats.photoData?.photos?.toLocaleString() || 0} foto
          </div>
        </div>

        <div className="card" style={{ borderTop: '3px solid var(--red)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 24 }}>📦</span>
            <div className="lbl" style={{ margin: 0 }}>Total Data</div>
          </div>
          <div className="num" style={{ fontSize: 28 }}>
            {(() => {
              const total = (stats.chatData?.sizeBytes || 0) + (stats.photoData?.sizeBytes || 0);
              if (total === 0) return '0 B';
              const k = 1024;
              const sizes = ['B', 'KB', 'MB', 'GB'];
              const i = Math.floor(Math.log(total) / Math.log(k));
              return parseFloat((total / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            })()}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
            {(stats.chatData?.messages || 0) + (stats.photoData?.photos || 0)} total items
          </div>
        </div>
      </div>

      {/* Table Sizes */}
      <div className="card" style={{ marginBottom: 24, padding: 24 }}>
        <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 700 }}>Ukuran Tabel</h3>
        <table className="tbl">
          <thead>
            <tr>
              <th>Tabel</th>
              <th>Baris</th>
              <th>Size</th>
              <th>Index Size</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {(stats.tables || []).map((t) => (
              <tr key={t.name}>
                <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{t.name}</td>
                <td>{t.rows?.toLocaleString() || 0}</td>
                <td>{t.size || '-'}</td>
                <td style={{ color: 'var(--text-muted)' }}>{t.indexSize || '-'}</td>
                <td style={{ fontWeight: 600 }}>{t.totalSize || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* RPC Functions */}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 700 }}>Database Objects</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>{stats.objects?.tables || 0}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tables</div>
          </div>
          <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--purple)' }}>{stats.objects?.functions || 0}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Functions</div>
          </div>
          <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--green)' }}>{stats.objects?.indexes || 0}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Indexes</div>
          </div>
          <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--cyan)' }}>{stats.objects?.policies || 0}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>RLS Policies</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SUPABASE SETTINGS PAGE ──
function SupabaseSettingsPage() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/settings/supabase`)
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 15 }}>Memuat konfigurasi...</div>
      </div>
    );
  }

  if (!config) {
    return <div className="empty-state">Gagal memuat konfigurasi Supabase</div>;
  }

  return (
    <div>
      {/* Connection Status */}
      <div className="card" style={{ marginBottom: 24, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg, #3ecf8e 0%, #1a9f5c 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 800, color: '#fff'
          }}>S</div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Supabase Connection</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="status-online">●</span>
              <span style={{ color: 'var(--green)', fontWeight: 600, fontSize: 13 }}>Connected</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Project URL</div>
            <div style={{ fontSize: 14, fontFamily: 'monospace', color: 'var(--text)', wordBreak: 'break-all' }}>{config.url}</div>
          </div>
          <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Project Ref</div>
            <div style={{ fontSize: 14, fontFamily: 'monospace', color: 'var(--text)' }}>{config.projectRef}</div>
          </div>
          <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Anon Key</div>
            <div style={{ fontSize: 14, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{config.anonKey}</div>
          </div>
          <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Service Role Key</div>
            <div style={{ fontSize: 14, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{config.serviceKey}</div>
          </div>
        </div>
      </div>

      {/* Database Info */}
      <div className="card" style={{ marginBottom: 24, padding: 24 }}>
        <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 700 }}>Database</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>{config.tables}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tables</div>
          </div>
          <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--purple)' }}>{config.functions}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Functions</div>
          </div>
          <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--green)' }}>{config.policies}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>RLS Policies</div>
          </div>
        </div>
      </div>

      {/* Realtime */}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 700 }}>Realtime Subscriptions</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {(config.realtimeTables || []).map((t) => (
            <span key={t} style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }}></span>
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── XENDIT SETTINGS PAGE ──
function XenditSettingsPage() {
  return (
    <div>
      {/* Connection Status */}
      <div className="card" style={{ marginBottom: 24, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg, #0070f3 0%, #0050c8 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 800, color: '#fff'
          }}>X</div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Xendit Connection</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="status-offline">○</span>
              <span style={{ color: 'var(--text-dim)', fontWeight: 600, fontSize: 13 }}>Not Configured</span>
            </div>
          </div>
        </div>

        <div style={{
          background: 'var(--bg)',
          border: '1px dashed var(--border)',
          borderRadius: 10,
          padding: 32,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔧</div>
          <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Konfigurasi Xendit</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
            Tambahkan API key Xendit untuk mengaktifkan fitur pembayaran di aplikasi ChatYuk.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, maxWidth: 500, margin: '0 auto', textAlign: 'left' }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>API Key</label>
              <input
                type="password"
                placeholder="xnd_development_..."
                className="search"
                style={{ width: '100%' }}
                disabled
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Callback URL</label>
              <input
                type="text"
                placeholder="https://yourdomain.com/xendit/callback"
                className="search"
                style={{ width: '100%' }}
                disabled
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Webhook Token</label>
              <input
                type="password"
                placeholder="Webhook verification token"
                className="search"
                style={{ width: '100%' }}
                disabled
              />
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            <button className="btn" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>Simpan Konfigurasi</button>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-dim)' }}>
            Fitur ini akan segera tersedia
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 700 }}>Fitur Xendit</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {[
            { icon: '💳', title: 'Virtual Account', desc: 'Pembayaran via bank transfer' },
            { icon: '📱', title: 'E-Wallet', desc: 'OVO, DANA, LinkAja, ShopeePay' },
            { icon: '🏪', title: 'Retail', desc: 'Alfamart, Indomaret' },
            { icon: '💳', title: 'Credit Card', desc: 'Visa, Mastercard, JCB' },
            { icon: '🔄', title: 'Recurring', desc: 'Pembayaran berulang' },
            { icon: '📊', title: 'Invoice', desc: 'Kirim invoice ke user' },
          ].map((f) => (
            <div key={f.title} style={{ background: 'var(--bg)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{f.title}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── QRIS SETTINGS PAGE ──
function QRISSettingsPage() {
  return (
    <div>
      {/* Connection Status */}
      <div className="card" style={{ marginBottom: 24, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg, #00a651 0%, #008c44 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 800, color: '#fff'
          }}>Q</div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>QRIS Connection</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="status-offline">○</span>
              <span style={{ color: 'var(--text-dim)', fontWeight: 600, fontSize: 13 }}>Not Configured</span>
            </div>
          </div>
        </div>

        <div style={{
          background: 'var(--bg)',
          border: '1px dashed var(--border)',
          borderRadius: 10,
          padding: 32,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📱</div>
          <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Konfigurasi QRIS</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
            Tambahkan kredensial QRIS untuk mengaktifkan pembayaran QR Code di aplikasi ChatYuk.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, maxWidth: 500, margin: '0 auto', textAlign: 'left' }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Merchant ID</label>
              <input
                type="text"
                placeholder="ID Merchant QRIS"
                className="search"
                style={{ width: '100%' }}
                disabled
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>API Key</label>
              <input
                type="password"
                placeholder="API Key QRIS"
                className="search"
                style={{ width: '100%' }}
                disabled
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Callback URL</label>
              <input
                type="text"
                placeholder="https://yourdomain.com/qris/callback"
                className="search"
                style={{ width: '100%' }}
                disabled
              />
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            <button className="btn" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>Simpan Konfigurasi</button>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-dim)' }}>
            Fitur ini akan segera tersedia
          </div>
        </div>
      </div>

      {/* QRIS Info */}
      <div className="card" style={{ marginBottom: 24, padding: 24 }}>
        <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 700 }}>Tentang QRIS</h3>
        <div style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7 }}>
          <p style={{ marginBottom: 12 }}>
            <strong>QRIS</strong> (Quick Response Code Indonesian Standard) adalah standar QR Code untuk pembayaran di Indonesia yang dikeluarkan oleh Bank Indonesia dan Asosiasi Sistem Pembayaran Indonesia (ASPI).
          </p>
          <p style={{ marginBottom: 12 }}>
            Dengan QRIS, pengguna ChatYuk dapat melakukan pembayaran menggunakan aplikasi e-wallet atau mobile banking apapun yang mendukung QRIS.
          </p>
        </div>
      </div>

      {/* Supported Apps */}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 700 }}>Aplikasi yang Mendukung QRIS</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
          {[
            { name: 'GoPay', color: '#00AA13' },
            { name: 'OVO', color: '#4C3494' },
            { name: 'DANA', color: '#108EE9' },
            { name: 'ShopeePay', color: '#EE4D2D' },
            { name: 'LinkAja', color: '#ED1C24' },
            { name: 'BCA Mobile', color: '#0033A0' },
            { name: 'Mandiri', color: '#FFB81C' },
            { name: 'BNI', color: '#ED8B16' },
            { name: 'BRI', color: '#003D79' },
            { name: 'CIMB Niaga', color: '#8B0000' },
            { name: 'Danamon', color: '#003D79' },
            { name: 'Permata', color: '#003D79' },
          ].map((app) => (
            <div key={app.name} style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 14,
              textAlign: 'center'
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: app.color,
                margin: '0 auto 10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 800, color: '#fff'
              }}>
                {app.name[0]}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{app.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── SIDEBAR ──
function Sidebar({ active, onChange }) {
  const menuItems = [
    { id: 'chat', label: 'App Chat', icon: '💬' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  const chatSubMenus = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'users', label: 'Users' },
    { id: 'chats', label: 'Private Chats' },
    { id: 'rooms', label: 'Rooms' },
  ];

  const settingsSubMenus = [
    { id: 'settings-supabase', label: 'Supabase' },
    { id: 'settings-xendit', label: 'Xendit' },
    { id: 'settings-qris', label: 'QRIS' },
  ];

  const isSettingsPage = active.startsWith('settings');

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">💬</div>
        <div>
          <div className="sidebar-title">ChatYuk</div>
          <div className="sidebar-subtitle">Admin Panel</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <div key={item.id}>
            <button
              className={`sidebar-item ${active === item.id || (item.id === 'chat' && ['dashboard', 'users', 'chats', 'rooms'].includes(active)) || (item.id === 'settings' && isSettingsPage) ? 'active' : ''}`}
              onClick={() => onChange(item.id === 'chat' ? 'dashboard' : item.id === 'settings' ? 'settings-supabase' : item.id)}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
            {item.id === 'chat' && (active === 'dashboard' || active === 'users' || active === 'chats' || active === 'rooms') && (
              <div className="sidebar-submenu">
                {chatSubMenus.map((sub) => (
                  <button
                    key={sub.id}
                    className={`sidebar-subitem ${active === sub.id ? 'active' : ''}`}
                    onClick={() => onChange(sub.id)}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            )}
            {item.id === 'settings' && isSettingsPage && (
              <div className="sidebar-submenu">
                {settingsSubMenus.map((sub) => (
                  <button
                    key={sub.id}
                    className={`sidebar-subitem ${active === sub.id ? 'active' : ''}`}
                    onClick={() => onChange(sub.id)}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-status">
          <span className="status-online">●</span>
          <span>Supabase Connected</span>
        </div>
      </div>
    </aside>
  );
}

function App() {
  const [page, setPage] = useState('dashboard');
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
    if (page !== 'analytics') {
      refreshAll();
      const t = setInterval(refreshAll, 30000);
      return () => clearInterval(t);
    }
  }, [refreshAll, page]);

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

  const getPageTitle = () => {
    switch (page) {
      case 'analytics': return '📊 Analytics Supabase';
      case 'users': return '👥 Users';
      case 'chats': return '💬 Private Chats';
      case 'rooms': return '🏠 Rooms';
      case 'settings-supabase': return '⚙️ Supabase Settings';
      case 'settings-xendit': return '⚙️ Xendit Settings';
      case 'settings-qris': return '⚙️ QRIS Settings';
      default: return '💬 Dashboard';
    }
  };

  const getPageSubtitle = () => {
    switch (page) {
      case 'analytics': return 'Monitoring penggunaan resource';
      case 'settings-supabase': return 'Konfigurasi koneksi Supabase';
      case 'settings-xendit': return 'Konfigurasi payment gateway Xendit';
      case 'settings-qris': return 'Konfigurasi pembayaran QR Code QRIS';
      default: return `Total: ${users.length} user terdaftar`;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar active={page} onChange={setPage} />

      <main className="main-content">
        <header className="content-header">
          <h2>{getPageTitle()}</h2>
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{getPageSubtitle()}</div>
        </header>

        {page === 'analytics' ? (
          <AnalyticsPage />
        ) : page === 'settings-supabase' ? (
          <SupabaseSettingsPage />
        ) : page === 'settings-xendit' ? (
          <XenditSettingsPage />
        ) : page === 'settings-qris' ? (
          <QRISSettingsPage />
        ) : (
          <>
            {page === 'dashboard' && (
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

            {page === 'users' && <UsersTab users={users} onOpenUser={setUserModal} />}
            {page === 'chats' && <PrivateChatsTab onOpenChat={openChat} />}
            {page === 'rooms' && <RoomsTab onOpenRoom={openRoomChat} />}
          </>
        )}
      </main>

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
