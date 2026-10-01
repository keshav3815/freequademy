-- Architecture V1 Phase 5 (part 1): super_admin platform role.
-- Separate migration because a new enum value cannot be used in the
-- transaction that adds it; 20261001140100 uses it.
-- Rollback: enum values cannot be dropped in place. To roll back, delete any
-- super_admin rows (supabase/rollbacks/20261001140100_governance.sql) — an
-- unused enum label is harmless.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
