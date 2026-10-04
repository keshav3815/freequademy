import { expect, test } from "@playwright/test";
import { ADMIN, MENTOR, logIn, signUpStudent, uniqueEmail } from "./fixtures";

test("student learns a lesson, takes a test and sees real progress", async ({ page }) => {
  await signUpStudent(page, uniqueEmail("learner"), "Asha Learner");

  // Fresh account: real zeros, no fake XP or streaks
  await expect(page.getByText("Welcome back,")).toBeVisible();
  await expect(page.getByRole("group", { name: /Course progress: 0%, 0 of/ })).toBeVisible();

  await page.goto("/courses?class=10");
  // Mathematics is the first subject (sort_order 1)
  await expect(page.getByRole("heading", { name: "Mathematics" })).toBeVisible();
  await page.getByRole("link", { name: /Open course|Continue learning/ }).first().click();
  await page.getByRole("link", { name: /E2E What is a quadratic\?/ }).click();
  await expect(page.getByRole("heading", { name: "Quadratic equations" })).toBeVisible();
  await page.getByRole("button", { name: "Mark as complete" }).click();
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();

  await page.goto("/quizzes");
  await page.getByRole("link", { name: "Start E2E Quadratics quiz" }).click();
  await page.getByRole("button", { name: "Start test" }).click();
  await page.getByRole("radio", { name: /2 and 3/ }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("radio", { name: /^B\. 2$/ }).click();
  await page.getByRole("button", { name: "Submit test" }).click();

  await expect(page.getByText("100%")).toBeVisible();
  await expect(page.getByText("(x − 2)(x − 3) = 0")).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByRole("group", { name: /Test average: 100%, 1 tests taken/ })).toBeVisible();
  // Class 10 has 5 subjects; only Mathematics (the one this test touched)
  // has any lessons, so it's the only one marked completed — the other 4
  // correctly average in as 0%, not fabricated progress.
  await expect(page.getByRole("group", { name: /Course progress: 20%, 1 of 5 courses completed/ })).toBeVisible();
});

test("admin approves a mentor application and the applicant gains mentor access", async ({ page, browser }) => {
  const applicant = uniqueEmail("approve-me");
  await page.goto("/signup-mentor");
  await page.getByLabel("Full Name").fill("Priya Applicant");
  await page.getByLabel("Email").fill(applicant);
  await page.getByLabel("Subject/Expertise").fill("Chemistry");
  await page.getByLabel("Password", { exact: true }).fill("Mentor-password-1");
  await page.getByLabel("Confirm Password").fill("Mentor-password-1");
  await page.getByRole("button", { name: "Create account & apply" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await logIn(admin, ADMIN.email, ADMIN.password);
  await expect(admin).toHaveURL(/\/admin$/);
  await admin.goto("/admin/applications");
  const card = admin.locator("div").filter({ hasText: applicant }).filter({ has: admin.getByRole("button", { name: "Approve" }) }).last();
  await card.getByRole("button", { name: "Approve" }).click();
  await expect(admin.getByText("Mentor approved")).toBeVisible();
  await adminContext.close();

  await page.reload();
  await page.goto("/teacher");
  await expect(page.getByRole("heading", { name: /^Good (morning|afternoon|evening)/ })).toBeVisible();
});

test("mentor dashboard loads real sessions and content for a seeded mentor", async ({ page }) => {
  await logIn(page, MENTOR.email, MENTOR.password);
  await expect(page).toHaveURL(/\/teacher$/);
  await page.goto("/teacher/assignments");
  await expect(page.getByRole("link", { name: "E2E Quadratics quiz" })).toBeVisible();
  await page.goto("/teacher/courses");
  await page.getByRole("article").filter({ hasText: "Mathematics" }).getByRole("link", { name: "Manage course" }).click();
  await page.getByRole("link", { name: "Content", exact: true }).click();
  await expect(page.getByRole("link", { name: "E2E What is a quadratic?" })).toBeVisible();
});
