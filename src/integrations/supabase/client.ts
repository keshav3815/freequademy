import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Supabase connection settings come from the environment, never from source.
//   local development → .env.development.local (local or staging project)
//   production build  → hosting provider environment variables
// See .env.example and docs/environments.md.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.development.local and fill in a local or staging project.',
  );
}

const PRODUCTION_PROJECT_REF = 'odawqbevdzpkwkxbggnf';
if (import.meta.env.DEV && SUPABASE_URL.includes(PRODUCTION_PROJECT_REF)) {
  console.warn(
    '[freequademy] The development server is connected to the PRODUCTION Supabase project. ' +
      'Use a local or staging project in .env.development.local for feature and schema work.',
  );
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
