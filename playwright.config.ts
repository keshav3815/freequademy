import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a LOCAL Supabase stack only (`supabase start`),
 * never a hosted project. Defaults are the well-known local development keys
 * printed by the Supabase CLI; override with E2E_SUPABASE_URL etc.
 * See docs/testing.md.
 */
const supabaseUrl = process.env.E2E_SUPABASE_URL ?? "http://127.0.0.1:54321";
const publishableKey = process.env.E2E_SUPABASE_PUBLISHABLE_KEY ?? "";
const port = Number(process.env.E2E_PORT ?? 5199);

if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(supabaseUrl)) {
  throw new Error(`E2E tests must target a local Supabase stack, got ${supabaseUrl}`);
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Locally, reuse an installed Chrome (E2E_BROWSER_CHANNEL=chrome);
        // CI installs Playwright's own Chromium.
        channel: process.env.E2E_BROWSER_CHANNEL || undefined,
      },
    },
  ],
  webServer: {
    command: `npx vite --port ${port} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      VITE_SUPABASE_URL: supabaseUrl,
      VITE_SUPABASE_PUBLISHABLE_KEY: publishableKey,
    },
  },
});
