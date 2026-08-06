require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// FCM via Firebase Admin (still needed for push notifications)
// Install firebase-admin if you want push: npm install firebase-admin
let messaging = null;
try {
  const { initializeApp, cert } = require('firebase-admin/app');
  const { getMessaging } = require('firebase-admin/messaging');
  const serviceAccount = require('./serviceAccountKey.json');
  const app = initializeApp({ credential: cert(serviceAccount) });
  messaging = getMessaging(app);
  console.log('[pusher] FCM initialized');
} catch (e) {
  console.log('[pusher] FCM not configured, push notifications disabled');
}

async function getTokensForUids(uids) {
  if (uids.length === 0) return [];
  const { data } = await supabase
    .from('profiles')
    .select('fcm_token')
    .in('id', uids)
    .neq('fcm_token', '');
  return (data || []).map((u) => u.fcm_token).filter(Boolean);
}

async function getRoomMemberUids(roomId) {
  const { data } = await supabase
    .from('room_presence')
    .select('user_id')
    .eq('room_id', roomId);
  return (data || []).map((r) => r.user_id);
}

async function handleRoomMessage(record) {
  const roomId = record.room_id;
  const senderId = record.sender_id;
  const senderName = record.sender_name || 'Seseorang';
  const text = record.text || '[Foto]';

  const { data: room } = await supabase
    .from('rooms')
    .select('name')
    .eq('id', roomId)
    .single();
  const roomName = room?.name || 'Room';

  const members = await getRoomMemberUids(roomId);
  const targets = members.filter((uid) => uid !== senderId);
  if (targets.length === 0) return;

  const tokens = await getTokensForUids(targets);
  if (tokens.length === 0) return;

  console.log(`[pusher] ${roomName}: "${senderName}: ${text}" -> ${tokens.length} device(s)`);

  if (messaging) {
    await messaging.sendEachForMulticast({
      tokens,
      notification: { title: roomName, body: `${senderName}: ${text}` },
      data: { type: 'room', roomId, roomName, senderUid: senderId || '', senderName, text },
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    });
  }
}

async function handlePrivateMessage(record) {
  const chatId = record.chat_id;
  const senderId = record.sender_id;
  const senderName = record.sender_name || 'Pengguna';
  const text = record.text ? (record.text.length > 60 ? record.text.slice(0, 60) + '…' : record.text) : '[Foto]';

  const { data: chat } = await supabase
    .from('private_chats')
    .select('participants, participant_names')
    .eq('chat_id', chatId)
    .single();
  if (!chat) return;

  const participants = chat.participants || [];
  const names = chat.participant_names || {};
  const otherName = names[senderId] || senderName;
  const targets = participants.filter((uid) => uid !== senderId);
  if (targets.length === 0) return;

  const tokens = await getTokensForUids(targets);
  if (tokens.length === 0) return;

  console.log(`[pusher] ${otherName}: "${text}" -> ${tokens.length} device(s)`);

  if (messaging) {
    await messaging.sendEachForMulticast({
      tokens,
      notification: { title: otherName, body: text },
      data: { type: 'private', chatId, otherUid: senderId, otherName, senderUid: senderId || '', text },
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    });
  }
}

function startWatch() {
  // Watch room messages
  supabase
    .channel('room-messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
      handleRoomMessage(payload.new).catch((e) => console.error('handleRoomMessage error:', e.message));
    })
    .subscribe();

  // Watch private messages
  supabase
    .channel('private-messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages' }, (payload) => {
      handlePrivateMessage(payload.new).catch((e) => console.error('handlePrivateMessage error:', e.message));
    })
    .subscribe();

  console.log('[pusher] watching Supabase realtime for new messages');
}

startWatch();
console.log('[pusher] started (Supabase)');
