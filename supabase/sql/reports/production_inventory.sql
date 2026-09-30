-- Architecture V1 Phase 0 — read-only production inventory.
--
-- Run in the Supabase dashboard SQL Editor for project odawqbevdzpkwkxbggnf
-- (or `psql` with the database URL). It runs inside a READ ONLY transaction
-- and returns one JSON row; nothing is created, changed or granted.
-- No personal data is returned: counts, sizes and object names only.

BEGIN TRANSACTION READ ONLY;

SELECT jsonb_pretty(jsonb_build_object(
  'postgres_version', version(),
  'database_size', pg_size_pretty(pg_database_size(current_database())),

  'auth_users', (SELECT jsonb_build_object(
      'total', count(*),
      'email_confirmed', count(*) FILTER (WHERE email_confirmed_at IS NOT NULL),
      'signed_in_last_30d', count(*) FILTER (WHERE last_sign_in_at > now() - interval '30 days'),
      'created_last_30d', count(*) FILTER (WHERE created_at > now() - interval '30 days'))
    FROM auth.users),

  'roles', jsonb_build_object(
      'profiles_by_role', (SELECT jsonb_object_agg(role, n) FROM (SELECT role::text, count(*) n FROM public.profiles GROUP BY 1) r),
      'user_roles', (SELECT jsonb_object_agg(role, n) FROM (SELECT role::text, count(*) n FROM public.user_roles GROUP BY 1) r)),

  'storage', (SELECT jsonb_build_object(
      'buckets', (SELECT jsonb_agg(jsonb_build_object('id', id, 'public', public)) FROM storage.buckets),
      'objects', (SELECT count(*) FROM storage.objects),
      'total_size', pg_size_pretty(coalesce((SELECT sum((metadata->>'size')::bigint) FROM storage.objects), 0)))),

  'extensions', (SELECT jsonb_object_agg(extname, extversion) FROM pg_extension),

  'migration_history', (SELECT jsonb_agg(version ORDER BY version) FROM supabase_migrations.schema_migrations),

  'public_tables', (SELECT jsonb_object_agg(relname, n_live_tup)
                    FROM pg_stat_user_tables WHERE schemaname = 'public'),

  'public_functions', (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                       WHERE n.nspname = 'public'),

  'tables_without_rls', (SELECT coalesce(jsonb_agg(c.relname), '[]'::jsonb)
                         FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                         WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity),

  'pg_cron_installed', EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'),

  -- C1 follow-up: rows the unauthenticated verify-payment endpoint could have written.
  'donations', (SELECT jsonb_build_object(
      'total', count(*),
      'by_status', (SELECT jsonb_object_agg(coalesce(status, 'null'), n)
                    FROM (SELECT status, count(*) n FROM public.donations GROUP BY 1) s),
      'successful_without_signature', count(*) FILTER (WHERE status = 'successful' AND razorpay_signature IS NULL),
      'first_created', min(created_at),
      'last_created', max(created_at))
    FROM public.donations)
)) AS inventory;

ROLLBACK;
