-- RPC functions untuk batch query (menghindari N+1)
-- Jalankan di Supabase SQL Editor

-- Ambil 1 pesan terakhir per chat
CREATE OR REPLACE FUNCTION get_last_messages(chat_ids text[])
RETURNS TABLE(chat_id text, text text, type text, created_at timestamptz)
LANGUAGE sql
AS $$
  SELECT DISTINCT ON (pm.chat_id)
    pm.chat_id,
    pm.text,
    pm.type,
    pm.created_at
  FROM private_messages pm
  WHERE pm.chat_id = ANY(chat_ids)
  ORDER BY pm.chat_id, pm.created_at DESC;
$$;

-- Hitung jumlah pesan per chat
CREATE OR REPLACE FUNCTION get_message_counts(chat_ids text[])
RETURNS TABLE(chat_id text, cnt bigint)
LANGUAGE sql
AS $$
  SELECT pm.chat_id, COUNT(*) as cnt
  FROM private_messages pm
  WHERE pm.chat_id = ANY(chat_ids)
  GROUP BY pm.chat_id;
$$;
