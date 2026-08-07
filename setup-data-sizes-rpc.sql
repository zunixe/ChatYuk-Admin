-- RPC function to get chat and photo data sizes
CREATE OR REPLACE FUNCTION get_data_sizes()
RETURNS TABLE(data_type text, total_bytes bigint, row_count bigint)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT 'text' as data_type, COALESCE(SUM(pg_column_size(text)), 0) as total_bytes, COUNT(*) as row_count
  FROM (
    SELECT text FROM messages WHERE text IS NOT NULL AND text != ''
    UNION ALL
    SELECT text FROM private_messages WHERE text IS NOT NULL AND text != ''
  ) all_texts
  UNION ALL
  SELECT 'image' as data_type, COALESCE(SUM(pg_column_size(image_data)), 0) as total_bytes, COUNT(*) as row_count
  FROM (
    SELECT image_data FROM messages WHERE image_data IS NOT NULL AND image_data != ''
    UNION ALL
    SELECT image_data FROM private_messages WHERE image_data IS NOT NULL AND image_data != ''
  ) all_images;
$$;
