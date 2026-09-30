import { expect, type Page } from "@playwright/test";

export const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? "http://127.0.0.1:54321";
export const SECRET_KEY = process.env.E2E_SUPABASE_SECRET_KEY ?? "";
export const PUBLISHABLE_KEY = process.env.E2E_SUPABASE_PUBLISHABLE_KEY ?? "";

export const ADMIN = { email: "e2e-admin@freequademy.test", password: "E2e-admin-password-1" };
export const MENTOR = { email: "e2e-mentor@freequademy.test", password: "E2e-mentor-password-1" };

/** Service-role REST call against the LOCAL stack (bypasses RLS; setup only). */
export async function adminRest(path: string, init: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: SECRET_KEY,
      Authorization: `Bearer ${SECRET_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

export const uniqueEmail = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@freequademy.test`;

export async function signUpStudent(page: Page, email: string, name = "E2E Student") {
  await page.goto("/signup-student");
  await page.getByLabel("Full Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("combobox", { name: "Grade" }).click();
  await page.getByRole("option", { name: "Class 10" }).click();
  await page.getByLabel("Password", { exact: true }).fill("Student-password-1");
  await page.getByLabel("Confirm Password").fill("Student-password-1");
  await page.getByRole("button", { name: "Sign up as Student" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function logIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Login" }).click();
}
