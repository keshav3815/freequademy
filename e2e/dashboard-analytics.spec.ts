import { expect, test } from "@playwright/test";
import { adminRest, signUpStudent, uniqueEmail } from "./fixtures";

/**
 * Deep coverage of the Student 360° Analytics Dashboard: a real low test
 * score surfacing in "Needs Attention" and a recommendation, an escalated
 * doubt appearing in doubt analytics, and the standalone attempt-review page
 * reached from the recent-results table.
 *
 * Scoping: KPI tiles are `role="group"` with a descriptive aria-label
 * (added alongside this test, and a genuine accessibility improvement in
 * its own right — a screen reader now announces "Test average: 0%, 2 tests
 * taken" as one unit instead of three disconnected text fragments); "Needs
 * Attention" and "AI Doubts" are `role="region"` landmarks. Both give
 * precise, semantic locators instead of guessing DOM nesting depth.
 *
 * The AI doubt is seeded via the service-role REST API rather than driving
 * the live doubt-solver Edge Function: this repo's local E2E stack (and
 * CI's — see .github/workflows/ci.yml) deliberately excludes edge-runtime,
 * since exercising the real AI Gateway needs a LOVABLE_API_KEY and external
 * network access neither environment has. What's under test here is the
 * *dashboard's* rendering of real doubts-table rows, not the AI call itself
 * (that's covered separately by supabase/functions/doubt-solver/validation.test.ts
 * and the Phase 0/4 pgTAP suite).
 */
test("dashboard reflects a low test score, an escalated doubt, and links to a real review page", async ({ page }) => {
  const email = uniqueEmail("analytics");
  await signUpStudent(page, email, "Rahul Analytics");

  // Answer both questions of the seeded quiz wrong on purpose, to prove the
  // dashboard surfaces a real low score rather than only ever showing good
  // news.
  await page.goto("/quizzes");
  await page.getByRole("link", { name: "Start E2E Quadratics quiz" }).click();
  await page.getByRole("button", { name: "Start test" }).click();
  await page.getByRole("radio", { name: /1 and 6/ }).click(); // wrong (correct is "2 and 3")
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("radio", { name: /^A\. 1$/ }).click(); // wrong (correct is B. 2)
  await page.getByRole("button", { name: "Submit test" }).click();
  await expect(page.getByText("0%")).toBeVisible();

  // Seed one escalated doubt directly (see file header for why).
  const [profile] = await adminRest(`/rest/v1/profiles?select=id&email=eq.${encodeURIComponent(email)}`);
  await adminRest("/rest/v1/doubts", {
    method: "POST",
    body: JSON.stringify({
      user_id: profile.id,
      question: "Why did I get both quadratic questions wrong?",
      subject: "Mathematics",
      ai_answer: "Let's go through the factorisation again...",
      status: "escalated",
      escalated_at: new Date().toISOString(),
    }),
  });

  await page.goto("/dashboard");

  // ---- KPI row reflects the real (bad) test average, not a fabricated one
  await expect(page.getByRole("group", { name: /Test average: 0%/ })).toBeVisible();

  // ---- Needs Attention shows the real weak subject, not a fake one
  const attention = page.getByRole("region", { name: "Needs Attention" });
  await expect(attention.getByText("Mathematics")).toBeVisible();

  // ---- Recommendations reflects the same real weak area, deterministically
  await expect(page.getByRole("heading", { name: "Recommended Next Steps" })).toBeVisible();
  await expect(page.getByText(/Review .*Mathematics|Review .*Algebra|Review .*Quadratic/i)).toBeVisible();

  // ---- Doubt analytics shows the real escalated doubt
  const doubtRegion = page.getByRole("region", { name: "AI Doubts" });
  await expect(doubtRegion.getByText("Why did I get both quadratic")).toBeVisible();
  await expect(doubtRegion.getByText("Waiting for mentor")).toBeVisible();

  // ---- Recent Test Results → Review opens the real per-question review
  await page.getByRole("link", { name: "Review" }).first().click();
  await expect(page).toHaveURL(/\/tests\/.+\/attempts\/.+/);
  await expect(page.getByText("Your result")).toBeVisible();
  await expect(page.getByText("0%")).toBeVisible();
});

test("a second student never sees the first student's dashboard data", async ({ page, browser }) => {
  await signUpStudent(page, uniqueEmail("private-a"), "Private First");
  await page.goto("/quizzes");
  await page.getByRole("link", { name: "Start E2E Quadratics quiz" }).click();
  await page.getByRole("button", { name: "Start test" }).click();
  await page.getByRole("radio", { name: /2 and 3/ }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("radio", { name: /^B\. 2$/ }).click();
  await page.getByRole("button", { name: "Submit test" }).click();
  await expect(page.getByText("100%")).toBeVisible();

  const secondContext = await browser.newContext();
  const second = await secondContext.newPage();
  await signUpStudent(second, uniqueEmail("private-b"), "Private Second");
  await second.goto("/dashboard");

  // The second student has done nothing: every KPI is a real zero/empty
  // state, never the first student's 100%.
  await expect(second.getByRole("group", { name: /Current level: Level 1/ })).toBeVisible();
  await expect(second.getByRole("group", { name: /XP earned: 0 total/ })).toBeVisible();
  await expect(second.getByRole("group", { name: /Test average: no tests taken yet/ })).toBeVisible();
  await expect(second.getByRole("heading", { name: "Test Performance" })).toBeVisible();
  await expect(second.getByText("No test history yet")).toBeVisible();
  await secondContext.close();
});
