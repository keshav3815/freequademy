-- Architecture V1 — free, self-owned observability + shared rate limiter.
--
-- Replaces the Sentry SaaS plan (D7) under the zero-cost rule: client errors
-- and Web Vitals (real-user monitoring) go into tables in this Supabase
-- project, so monitoring data about students never leaves the Mumbai region.
-- The browser scrubs before sending (src/lib/telemetry/sanitize.ts); these
-- functions scrub again, cap every field, and rate-limit, so a buggy or
-- hostile client cannot store personal data or flood the tables.
--
--   report_client_error(jsonb)   anon + authenticated, write-only
--   report_web_vital(...)        anon + authenticated, write-only
--   get_client_error_summary()   admins: grouped errors, last N days
--   get_web_vitals_summary()     admins: p50/p75/p95 per metric and route
--
-- private.hit_rate_limit() is the fixed-window limiter reused by Phase 5's
-- write-throttling triggers. Exceeding a limit in a user-facing write raises
-- SQLSTATE PT429, which PostgREST returns as HTTP 429.
--
-- Rollback: supabase/rollbacks/20261001120000_observability_rate_limits.sql

CREATE SCHEMA IF NOT EXISTS private;

-- ---------------------------------------------------------------------------
-- Rate limiting
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS private.rate_limit_counters (
  bucket text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);

-- True when the hit is allowed. Counts the hit either way.
CREATE OR REPLACE FUNCTION private.hit_rate_limit(_bucket text, _limit integer, _window interval)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public
AS $$
DECLARE
  _start timestamptz := to_timestamp(floor(extract(epoch FROM clock_timestamp()) / extract(epoch FROM _window)) * extract(epoch FROM _window));
  _hits integer;
BEGIN
  INSERT INTO private.rate_limit_counters (bucket, window_start, hits)
  VALUES (_bucket, _start, 1)
  ON CONFLICT (bucket, window_start) DO UPDATE SET hits = private.rate_limit_counters.hits + 1
  RETURNING hits INTO _hits;
  RETURN _hits <= _limit;
END;
$$;

-- Raises HTTP 429 (via PostgREST) when the caller exceeds the limit.
CREATE OR REPLACE FUNCTION private.enforce_rate_limit(_action text, _limit integer, _window interval)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public
AS $$
BEGIN
  IF NOT private.hit_rate_limit(_action || ':' || coalesce(auth.uid()::text, 'anon'), _limit, _window) THEN
    RAISE EXCEPTION 'rate limit exceeded for %', _action
      USING ERRCODE = 'PT429', HINT = 'Too many requests. Please wait and try again.';
  END IF;
END;
$$;

REVOKE ALL ON ALL TABLES IN SCHEMA private FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.hit_rate_limit(text, integer, interval) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.enforce_rate_limit(text, integer, interval) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Server-side scrubbing (defence in depth; mirrors src/lib/telemetry/sanitize.ts)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.scrub_text(_text text, _max integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = private, public
AS $$
  SELECT left(
    regexp_replace(
    regexp_replace(
    regexp_replace(
    regexp_replace(
    regexp_replace(_text,
      'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}', '[redacted]', 'g'),
      '(sb_secret|sb_publishable)_[A-Za-z0-9_-]+', '[redacted]', 'g'),
      '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[redacted]', 'g'),
      '(\+?91[-[:space:]]?)?[6-9][0-9]{4}[-[:space:]]?[0-9]{5}', '[redacted]', 'g'),
      '\?[^[:space:]#"'')]*', '', 'g'),
    _max);
$$;

-- ---------------------------------------------------------------------------
-- Client errors
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_errors (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  environment text NOT NULL,
  release text,
  route text,
  source text,
  error_type text,
  message text,
  stack text,
  browser text,
  os text,
  request_id text
);
CREATE INDEX IF NOT EXISTS idx_client_errors_created ON public.client_errors (created_at DESC);
ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.client_errors FROM anon, authenticated;
GRANT SELECT ON public.client_errors TO authenticated;
DROP POLICY IF EXISTS "Admins read client errors" ON public.client_errors;
CREATE POLICY "Admins read client errors" ON public.client_errors
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.report_client_error(_report jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  -- Silently drop over-limit reports: an error loop must never turn into a
  -- second error loop.
  IF NOT private.hit_rate_limit('client_error:all', 2000, interval '1 hour')
     OR NOT private.hit_rate_limit('client_error:' || coalesce(auth.uid()::text, 'anon'),
                                   CASE WHEN auth.uid() IS NULL THEN 500 ELSE 30 END, interval '1 hour') THEN
    RETURN;
  END IF;

  INSERT INTO public.client_errors (environment, release, route, source, error_type, message, stack, browser, os, request_id)
  VALUES (
    coalesce(nullif(left(_report->>'environment', 20), ''), 'unknown'),
    left(_report->>'release', 64),
    private.scrub_text(_report->>'route', 200),
    left(_report->>'source', 40),
    left(_report->>'error_type', 80),
    private.scrub_text(_report->>'message', 300),
    private.scrub_text(_report->>'stack', 4000),
    left(_report->>'browser', 40),
    left(_report->>'os', 40),
    left(coalesce(_report->>'request_id', current_setting('request.headers', true)::jsonb->>'x-request-id'), 64)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.report_client_error(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_client_error(jsonb) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_client_error_summary(_days integer DEFAULT 7)
RETURNS TABLE (environment text, error_type text, message text, route text, occurrences bigint, last_seen timestamptz, last_release text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT e.environment, e.error_type, e.message, e.route, count(*), max(e.created_at),
           (array_agg(e.release ORDER BY e.created_at DESC))[1]
      FROM public.client_errors e
     WHERE e.created_at > now() - make_interval(days => least(greatest(_days, 1), 90))
     GROUP BY 1, 2, 3, 4
     ORDER BY count(*) DESC
     LIMIT 200;
END;
$$;
REVOKE ALL ON FUNCTION public.get_client_error_summary(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_client_error_summary(integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- Web Vitals (real-user monitoring)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_vitals (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  environment text NOT NULL,
  release text,
  route text NOT NULL,
  metric text NOT NULL CHECK (metric IN ('LCP', 'INP', 'CLS', 'TTFB', 'FCP')),
  value double precision NOT NULL CHECK (value >= 0 AND value < 600000),
  rating text CHECK (rating IN ('good', 'needs-improvement', 'poor')),
  connection text
);
CREATE INDEX IF NOT EXISTS idx_client_vitals_created ON public.client_vitals (created_at DESC);
ALTER TABLE public.client_vitals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.client_vitals FROM anon, authenticated;
GRANT SELECT ON public.client_vitals TO authenticated;
DROP POLICY IF EXISTS "Admins read web vitals" ON public.client_vitals;
CREATE POLICY "Admins read web vitals" ON public.client_vitals
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.report_web_vital(
  _metric text, _value double precision, _rating text, _route text,
  _environment text, _release text DEFAULT NULL, _connection text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF _metric NOT IN ('LCP', 'INP', 'CLS', 'TTFB', 'FCP') OR _value IS NULL OR _value < 0 OR _value >= 600000 THEN
    RETURN;
  END IF;
  IF NOT private.hit_rate_limit('web_vital:all', 20000, interval '1 hour')
     OR NOT private.hit_rate_limit('web_vital:' || coalesce(auth.uid()::text, 'anon'),
                                   CASE WHEN auth.uid() IS NULL THEN 5000 ELSE 100 END, interval '1 hour') THEN
    RETURN;
  END IF;
  INSERT INTO public.client_vitals (environment, release, route, metric, value, rating, connection)
  VALUES (coalesce(nullif(left(_environment, 20), ''), 'unknown'), left(_release, 64),
          coalesce(private.scrub_text(_route, 200), '/'), _metric, _value,
          CASE WHEN _rating IN ('good', 'needs-improvement', 'poor') THEN _rating END,
          left(_connection, 16));
END;
$$;
REVOKE ALL ON FUNCTION public.report_web_vital(text, double precision, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_web_vital(text, double precision, text, text, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_web_vitals_summary(_days integer DEFAULT 7, _environment text DEFAULT 'production')
RETURNS TABLE (metric text, route text, samples bigint, p50 double precision, p75 double precision, p95 double precision)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT v.metric, v.route, count(*),
           percentile_cont(0.50) WITHIN GROUP (ORDER BY v.value),
           percentile_cont(0.75) WITHIN GROUP (ORDER BY v.value),
           percentile_cont(0.95) WITHIN GROUP (ORDER BY v.value)
      FROM public.client_vitals v
     WHERE v.created_at > now() - make_interval(days => least(greatest(_days, 1), 90))
       AND v.environment = _environment
     GROUP BY 1, 2
     ORDER BY 1, count(*) DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.get_web_vitals_summary(integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_web_vitals_summary(integer, text) TO authenticated;
