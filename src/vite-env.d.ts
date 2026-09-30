/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_SUPABASE_PROJECT_ID?: string;
  readonly VITE_ERROR_REPORTING_URL?: string;
  readonly VITE_APP_RELEASE?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_APP_ENV?: "staging" | "production" | "preview";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
