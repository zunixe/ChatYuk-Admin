# ChatYuk Admin

Dashboard admin web untuk memantau aplikasi chat **ChatYuk** (Firebase project `chatyuk-8470e`).
Terhubung langsung ke database aplikasi (Firestore + Realtime Database) via Firebase Admin SDK.

## Fitur
- **Dashboard** — ringkasan: total user, online / idle / offline, jumlah private chat, room online
- **Users** — tabel semua user (nickname, gender, umur, lokasi, IP, status, waktu login) + search + filter status
- **Detail user** — profil lengkap (termasuk foto profil), UID, IP, waktu login/aktif, dan daftar private chat user tersebut
- **Private Chats** — semua percakapan private + isi pesan (teks & foto)
- **Rooms** — room chat + isi pesan

Data otomatis refresh setiap 10 detik.

## Cara menjalankan
1. Pastikan `serviceAccountKey.json` ada di folder ini (kunci Firebase Admin SDK — **jangan dibagikan/commit**).
2. `npm start` → buka `http://localhost:8090`
3. Kalau frontend diubah: `npm run build`

## Struktur
- `server.js` — Express API + Firebase Admin SDK (bypass security rules, akses penuh — hanya untuk admin)
- `serviceAccountKey.json` — kredensial admin (rahasia)
- `client/` — React (Vite) dashboard

## Catatan keamanan
- Server ini memberi akses penuh ke semua data ChatYuk. Jangan expose ke internet tanpa autentikasi tambahan.
- Foto profil & foto chat disimpan sebagai base64 di database (bukan Firebase Storage).
