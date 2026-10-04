/**
 * Environment isolation (Architecture V1 Phase 0). Freequademy has no hosted
 * staging project (free plan, two-project limit), so Vercel Preview builds
 * must never reach production data: they refuse to start a Supabase client
 * pointed at the production project or its gateway.
 */
export const PRODUCTION_PROJECT_REF = "odawqbevdzpkwkxbggnf";
const PRODUCTION_HOSTS = [`${PRODUCTION_PROJECT_REF}.supabase.co`, "api.freequademy.com"];

export function isProductionSupabase(url: string): boolean {
  try {
    return PRODUCTION_HOSTS.includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** An error message when this build must not use this database, otherwise null. */
export function isolationError(supabaseUrl: string, deployEnv: string | undefined): string | null {
  if (deployEnv === "preview" && isProductionSupabase(supabaseUrl)) {
    return "This preview deployment is not allowed to use the production database. "
      + "Set VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY for the Vercel Preview environment to a non-production project.";
  }
  return null;
}
