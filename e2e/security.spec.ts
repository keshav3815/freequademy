import { expect, test } from "@playwright/test";
import { PUBLISHABLE_KEY, SUPABASE_URL, logIn, signUpStudent, uniqueEmail } from "./fixtures";

test.describe("authorization boundaries", () => {
  test("anonymous visitors are sent to login from protected pages", async ({ page }) => {
    for (const path of ["/dashboard", "/teacher", "/teacher/students", "/teacher-dashboard", "/admin", "/study-notes", "/videos/mathematics", "/animated", "/quizzes", "/test-series?view=results"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    }
  });

  test("mentor signup creates a student account with a pending application", async ({ page }) => {
    const email = uniqueEmail("mentor-applicant");
    await page.goto("/signup-mentor");
    await page.getByLabel("Full Name").fill("Hopeful Mentor");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Subject/Expertise").fill("Mathematics, Physics");
    await page.getByLabel("Password", { exact: true }).fill("Mentor-password-1");
    await page.getByLabel("Confirm Password").fill("Mentor-password-1");
    await page.getByRole("button", { name: "Create account & apply" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto("/teacher");
    await expect(page.getByText("Access denied")).toBeVisible();
    await page.goto("/mentor-application");
    await expect(page.getByText("Application under review")).toBeVisible();
  });

  test("a student cannot promote themselves through the API", async ({ page }) => {
    const email = uniqueEmail("escalator");
    await signUpStudent(page, email);

    // Replay what a malicious client would send: the user's own JWT and a
    // PATCH that tries to change profiles.role.
    const result = await page.evaluate(async ({ url, apiKey }) => {
      const storageKey = Object.keys(localStorage).find((k) => k.endsWith("-auth-token"));
      const session = storageKey ? JSON.parse(localStorage.getItem(storageKey) ?? "{}") : null;
      const res = await fetch(`${url}/rest/v1/profiles?id=eq.${session?.user?.id}`, {
        method: "PATCH",
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${session?.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: "mentor" }),
      });
      return res.status;
    }, { url: SUPABASE_URL, apiKey: PUBLISHABLE_KEY });

    expect([401, 403]).toContain(result);
    await page.goto("/teacher");
    await expect(page.getByText("Access denied")).toBeVisible();
  });

  test("logging in returns the user to the page they asked for", async ({ page }) => {
    const email = uniqueEmail("redirect");
    await signUpStudent(page, email);
    // signUpStudent lands on /dashboard, which uses the student sidebar (not
    // the public Navbar) — Logout is a direct button there, no dropdown.
    await page.getByRole("button", { name: "Logout" }).click();
    // wait until sign-out has finished and cleared the stored session
    await expect(page.getByText("Logged out successfully")).toBeVisible();
    await page.goto("/doubts");
    await expect(page).toHaveURL(/\/login$/);
    await logIn(page, email, "Student-password-1");
    await expect(page).toHaveURL(/\/doubts$/);
  });
});
