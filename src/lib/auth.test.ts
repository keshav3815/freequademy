import { describe, expect, it } from "vitest";
import { homePathForRole, safeRedirectPath } from "./auth";

describe("safeRedirectPath", () => {
  it("accepts app-relative paths", () => {
    expect(safeRedirectPath("/dashboard")).toBe("/dashboard");
    expect(safeRedirectPath("/community/thread/1?x=1")).toBe("/community/thread/1?x=1");
  });

  it("rejects protocol-relative, absolute and backslash tricks", () => {
    expect(safeRedirectPath("//evil.example.com")).toBeNull();
    expect(safeRedirectPath("/\\evil.example.com")).toBeNull();
    expect(safeRedirectPath("https://evil.example.com")).toBeNull();
    expect(safeRedirectPath("javascript:alert(1)")).toBeNull();
  });

  it("rejects non-strings", () => {
    expect(safeRedirectPath(undefined)).toBeNull();
    expect(safeRedirectPath({ pathname: "/x" })).toBeNull();
  });
});

describe("homePathForRole", () => {
  it("routes each role to its home", () => {
    expect(homePathForRole("admin")).toBe("/admin");
    expect(homePathForRole("moderator")).toBe("/admin");
    expect(homePathForRole("mentor")).toBe("/teacher");
    expect(homePathForRole("student")).toBe("/dashboard");
    expect(homePathForRole(null)).toBe("/dashboard");
  });
});
