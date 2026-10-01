-- Rollback for 20261001120000_3a9d7f21-6c4e-4e0b-8a15-9b2d4c7e6f08.sql
-- Run the Phase 5 rollback first (its triggers call private.enforce_rate_limit).
DROP FUNCTION IF EXISTS public.get_web_vitals_summary(integer, text);
DROP FUNCTION IF EXISTS public.report_web_vital(text, double precision, text, text, text, text, text);
DROP TABLE IF EXISTS public.client_vitals;
DROP FUNCTION IF EXISTS public.get_client_error_summary(integer);
DROP FUNCTION IF EXISTS public.report_client_error(jsonb);
DROP TABLE IF EXISTS public.client_errors;
DROP FUNCTION IF EXISTS private.scrub_text(text, integer);
DROP FUNCTION IF EXISTS private.enforce_rate_limit(text, integer, interval);
DROP FUNCTION IF EXISTS private.hit_rate_limit(text, integer, interval);
DROP TABLE IF EXISTS private.rate_limit_counters;
