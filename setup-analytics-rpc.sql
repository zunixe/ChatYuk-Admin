-- RPC function to get table sizes
CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE(
  table_name text,
  table_size text,
  index_size text,
  total_size text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    schemaname || '.' || tablename as table_name,
    pg_size_pretty(pg_table_size(schemaname || '.' || tablename)) as table_size,
    pg_size_pretty(pg_indexes_size(schemaname || '.' || tablename)) as index_size,
    pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as total_size
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;
$$;
