import { describe, expect, it } from "vitest";
import { buildErrorReport, describeAgent, sanitizeStack, sanitizeUrl, scrubText } from "./sanitize";

// The jwt.io example token, joined at runtime so secret scanners don't flag a fixture.
const JWT = ["eyJhbGciOiJIUzI1NiJ9", "eyJzdWIiOiIxMjM0NTY3ODkwIn0", "dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U"].join(".");
const STUDENT_ID = "3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90";
const UA = "Mozilla/5.0 (Linux; Android 14; SM-A145F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";

/** A deliberately dirty error: everything D7 forbids, as a real failure could produce it. */
function dirtyError(): Error {
  const error = new Error(
    `Failed for asha.verma@example.com (Asha Verma) token ${JWT}, call +91 98765 43210 / 9876543210, ` +
    `Bearer ${JWT}, answer "2 and 3" — ${"x".repeat(600)}`,
  );
  error.name = "PostgrestError";
  error.stack = [
    `PostgrestError: Failed for asha.verma@example.com`,
    `    at submit (https://freequademy.com/assets/index.js?token=${JWT}:10:20)`,
    `    at https://x.supabase.co/storage/v1/object/sign/teacher-resources/${STUDENT_ID}/notes.pdf?token=abc:1:2`,
  ].join("\n");
  return error;
}

describe("telemetry scrubbing (D7, zero-cost)", () => {
  it("removes every forbidden value from a deliberately dirty error report", () => {
    const report = buildErrorReport(dirtyError(), {
      environment: "staging",
      release: "abc123",
      pathname: `/teacher/students/${STUDENT_ID}`,
      userAgent: UA,
      source: "window.onerror",
    });
    const serialized = JSON.stringify(report);

    for (const forbidden of [
      JWT, STUDENT_ID, "asha.verma@example.com", "9876543210", "98765 43210", "token=", "?token",
      "Bearer ey", "SM-A145F", "Mozilla", "notes.pdf?", "x".repeat(400),
    ]) {
      expect(serialized, `leaked: ${forbidden}`).not.toContain(forbidden);
    }
  });

  it("keeps what is needed to debug: type, route pattern, release, environment, coarse device", () => {
    const report = buildErrorReport(dirtyError(), {
      environment: "staging", release: "abc123", pathname: `/teacher/students/${STUDENT_ID}`, userAgent: UA,
    });
    expect(report).toMatchObject({
      environment: "staging",
      release: "abc123",
      route: "/teacher/students/:id",
      error_type: "PostgrestError",
      browser: "Chrome",
      os: "Android",
    });
    expect(report.stack).toContain("https://freequademy.com/assets/index.js:10:20");
    expect(report.stack).toContain("teacher-resources/:id/notes.pdf:1:2");
    expect(Object.keys(report).sort()).toEqual(
      ["browser", "environment", "error_type", "message", "os", "release", "route", "source", "stack"],
    );
  });

  it("reduces URLs to route patterns without query or hash", () => {
    expect(sanitizeUrl("/lessons/42?x=1#y")).toBe("/lessons/:id");
    expect(sanitizeUrl(`https://x.supabase.co/rest/v1/doubts?select=*&apikey=${JWT}`)).toBe("https://x.supabase.co/rest/v1/doubts");
  });

  it("caps free text so pasted content cannot ride along", () => {
    expect(scrubText("a".repeat(1000))?.length).toBeLessThanOrEqual(301);
    expect(sanitizeStack("s".repeat(9000))?.length).toBeLessThanOrEqual(4001);
  });

  it("reports only coarse browser and OS names", () => {
    expect(describeAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Mobile/15E148 Safari/604.1"))
      .toEqual({ browser: "Safari", os: "iOS" });
  });
});
