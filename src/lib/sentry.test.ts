import type { ErrorEvent } from "@sentry/react";
import { describe, expect, it } from "vitest";
import { sanitizeBreadcrumb, sanitizeEvent, sanitizeUrl, scrubText } from "./sentry";

const JWT = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
const STUDENT_ID = "3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90";

/** A deliberately dirty event: everything D7 forbids, as the SDK would build it. */
function dirtyEvent(): ErrorEvent {
  return {
    type: undefined,
    message: `Failed for asha.verma@example.com token ${JWT}`,
    transaction: `/teacher/students/${STUDENT_ID}`,
    user: { id: STUDENT_ID, email: "asha.verma@example.com", username: "Asha Verma", ip_address: "49.36.1.2" },
    extra: { doubt: "How do I solve x² − 5x + 6 = 0? My number is 9876543210", answers: [1, 0, 2] },
    server_name: "laptop",
    request: {
      url: `https://freequademy.com/tests/12/attempts/${STUDENT_ID}?token=${JWT}#access_token=${JWT}`,
      headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 14)", Referer: "https://freequademy.com/reset-password?code=abc", Cookie: "sb=1" },
      cookies: { sb: "1" },
      data: { password: "Student-password-1" },
      query_string: `token=${JWT}`,
    },
    contexts: {
      browser: { name: "Chrome" },
      os: { name: "Android" },
      student: { full_name: "Asha Verma", grade: "10" },
    },
    exception: {
      values: [{
        type: "PostgrestError",
        value: `duplicate key for +91 98765 43210 / 9876543210 / Bearer ${JWT}`,
        stacktrace: { frames: [{ filename: "app.js", lineno: 10, vars: { answer: "2 and 3", email: "a@b.co" } }] },
      }],
    },
    breadcrumbs: [
      { category: "console", message: "student answer: 2 and 3" },
      { category: "ui.input", message: "input[name=doubt]" },
      { category: "fetch", message: "POST body", data: { method: "POST", url: `https://api.freequademy.com/rest/v1/doubts?select=*&apikey=${JWT}`, status_code: 400, body: "question text" } },
      { category: "navigation", data: { from: `/study-notes/maths/${STUDENT_ID}?q=private`, to: "/dashboard" } },
      { category: "custom", message: "sent to asha.verma@example.com", data: { name: "Asha" } },
    ],
  };
}

describe("Sentry PII scrubbing (D7)", () => {
  it("strips every forbidden field from a deliberately dirty error event", () => {
    const event = sanitizeEvent(dirtyEvent());
    const serialized = JSON.stringify(event);

    for (const forbidden of [
      JWT, STUDENT_ID, "asha.verma@example.com", "a@b.co", "Asha", "9876543210", "98765 43210",
      "49.36.1.2", "Student-password-1", "2 and 3", "question text", "x² − 5x", "Cookie", "Referer",
      "reset-password?code", "token=", "access_token", "grade", "private",
    ]) {
      expect(serialized, `leaked: ${forbidden}`).not.toContain(forbidden);
    }
  });

  it("keeps what is needed to debug: error type, stack, route pattern, browser, OS", () => {
    const event = sanitizeEvent(dirtyEvent());
    expect(event.exception?.values?.[0].type).toBe("PostgrestError");
    expect(event.exception?.values?.[0].stacktrace?.frames?.[0]).toEqual({ filename: "app.js", lineno: 10 });
    expect(event.request).toEqual({
      url: "https://freequademy.com/tests/:id/attempts/:id",
      headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 14)" },
    });
    expect(event.transaction).toBe("/teacher/students/:id");
    expect(Object.keys(event.contexts ?? {}).sort()).toEqual(["browser", "os"]);
    expect(event.breadcrumbs?.map((b) => b.category)).toEqual(["fetch", "navigation", "custom"]);
    expect(event.breadcrumbs?.[0].data).toEqual({ method: "POST", url: "https://api.freequademy.com/rest/v1/doubts", status_code: 400 });
  });

  it("drops console and UI breadcrumbs outright", () => {
    expect(sanitizeBreadcrumb({ category: "console", message: "x" })).toBeNull();
    expect(sanitizeBreadcrumb({ category: "ui.click", message: "button.submit" })).toBeNull();
  });

  it("reduces URLs to route patterns without query or hash", () => {
    expect(sanitizeUrl("/lessons/42?x=1#y")).toBe("/lessons/:id");
    expect(sanitizeUrl(`https://x.supabase.co/storage/v1/object/sign/teacher-resources/${STUDENT_ID}/notes.pdf?token=abc`))
      .toBe("https://x.supabase.co/storage/v1/object/sign/teacher-resources/:id/notes.pdf");
  });

  it("caps long free text so pasted content cannot ride along in an error message", () => {
    expect(scrubText("a".repeat(1000))?.length).toBeLessThanOrEqual(301);
  });
});
