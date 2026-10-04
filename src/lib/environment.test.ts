import { describe, expect, it } from "vitest";
import { isProductionSupabase, isolationError } from "./environment";

describe("environment isolation", () => {
  it("recognises the production project and its gateway", () => {
    expect(isProductionSupabase("https://odawqbevdzpkwkxbggnf.supabase.co")).toBe(true);
    expect(isProductionSupabase("https://api.freequademy.com")).toBe(true);
    expect(isProductionSupabase("http://127.0.0.1:55421")).toBe(false);
    expect(isProductionSupabase("https://odawqbevdzpkwkxbggnf.supabase.co.evil.com")).toBe(false);
    expect(isProductionSupabase("not a url")).toBe(false);
  });

  it("blocks Vercel previews from production, and only previews", () => {
    expect(isolationError("https://odawqbevdzpkwkxbggnf.supabase.co", "preview")).toMatch(/not allowed/);
    expect(isolationError("https://api.freequademy.com", "preview")).toMatch(/not allowed/);
    expect(isolationError("https://odawqbevdzpkwkxbggnf.supabase.co", "production")).toBeNull();
    expect(isolationError("https://odawqbevdzpkwkxbggnf.supabase.co", undefined)).toBeNull();
    expect(isolationError("https://other-ref.supabase.co", "preview")).toBeNull();
  });
});
