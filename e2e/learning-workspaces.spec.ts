import { expect, test } from "@playwright/test";
import { signUpStudent, uniqueEmail } from "./fixtures";

test("dashboard has no Quick Access and the global sidebar groups the learning modules", async ({ page }) => {
  await signUpStudent(page, uniqueEmail("nav"), "Nav Student");
  await expect(page.getByText("Quick Access")).toHaveCount(0);

  const nav = page.getByRole("navigation", { name: "Main navigation" });
  for (const label of ["Dashboard", "My Courses", "Study Notes", "Videos", "Animated", "Quizzes", "Test Series", "My Doubts", "Mentorship", "Community"]) {
    await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
  }
  await expect(nav.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
});

test("my courses: every course, chapter and lesson opens inside the workspace", async ({ page }) => {
  await signUpStudent(page, uniqueEmail("courses"), "Courses Student");
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await nav.getByRole("link", { name: "My Courses" }).click();
  await expect(page).toHaveURL(/\/my-courses$/);

  const courseNav = page.getByRole("navigation", { name: "My Courses navigation" });
  for (const course of ["Mathematics", "Science", "English", "Social Science", "Hindi"]) {
    await expect(courseNav.getByRole("link", { name: new RegExp(`^${course}`) })).toBeVisible();
  }
  await courseNav.getByRole("link", { name: /^Mathematics/ }).click();
  await expect(page).toHaveURL(/\/my-courses\/mathematics$/);
  await expect(page.getByRole("region", { name: "Tests in this course" }).getByText("E2E Quadratics quiz")).toBeVisible();

  await courseNav.getByRole("link", { name: /E2E Quadratic Equations/ }).click();
  await page.getByRole("link", { name: "E2E What is a quadratic?" }).click();
  await expect(page).toHaveURL(/\/my-courses\/mathematics\/[0-9a-f-]+\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: "Quadratic equations" })).toBeVisible();
  // Still inside the app shell: both sidebars remain.
  await expect(nav.getByRole("link", { name: "My Courses" })).toHaveAttribute("aria-current", "page");
  await expect(courseNav).toBeVisible();

  // Dashboard "Continue" lands in the same workspace reader, not a separate page.
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Continue", exact: true }).click();
  await expect(page).toHaveURL(/\/my-courses\/mathematics\/[0-9a-f-]+\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: "Quadratic equations" })).toBeVisible();
});

test("study notes: subject → chapter → note, with breadcrumbs, progress and saving", async ({ page }) => {
  await signUpStudent(page, uniqueEmail("notes"), "Notes Student");
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await nav.getByRole("link", { name: "Study Notes" }).click();
  await expect(page).toHaveURL(/\/study-notes$/);
  await expect(page.getByRole("heading", { name: "Study Notes", level: 1 })).toBeVisible();

  const moduleNav = page.getByRole("navigation", { name: "Study Notes navigation" });
  await moduleNav.getByRole("link", { name: /Mathematics/ }).click();
  await expect(page).toHaveURL(/\/study-notes\/mathematics$/);
  await moduleNav.getByRole("link", { name: /E2E Quadratic Equations/ }).click();
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Study Notes");
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Mathematics");
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("E2E Quadratic Equations");

  // Global item stays active deep inside the module; Dashboard does not.
  await expect(nav.getByRole("link", { name: "Study Notes" })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current", "page");

  // Chapter card shows the real count for this (fresh) student: 1 note, 0 completed.
  const chapters = page.getByRole("region", { name: "Chapters" });
  await expect(chapters.getByRole("link", { name: /E2E Quadratic Equations/ })).toContainText("1 note");
  await expect(chapters.getByRole("progressbar", { name: "0 of 1 notes completed" })).toBeVisible();

  await page.getByRole("link", { name: "Open notes: E2E What is a quadratic?" }).click();
  await expect(page.getByRole("heading", { name: "Quadratic equations" })).toBeVisible();
  const chapterNav = page.getByRole("navigation", { name: "Chapter navigation" });
  await expect(chapterNav.getByRole("link", { name: "Quadratic equations" })).toBeVisible();
  await page.getByRole("button", { name: "Save E2E What is a quadratic?" }).click();
  await expect(page.getByRole("button", { name: "Remove E2E What is a quadratic? from saved" })).toBeVisible();
  await page.getByRole("button", { name: "Mark as complete" }).click();
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
  await expect(chapterNav.getByRole("progressbar", { name: "1 of 1 notes in this chapter completed" })).toBeVisible();

  await chapterNav.getByRole("link", { name: "Back to Mathematics" }).click();
  await expect(chapters.getByRole("progressbar", { name: "1 of 1 notes completed" })).toBeVisible();

  await moduleNav.getByRole("link", { name: "Saved Notes" }).click();
  await expect(page).toHaveURL(/view=saved/);
  await expect(page.getByRole("link", { name: "E2E What is a quadratic?", exact: true })).toBeVisible();

  await page.getByRole("tab", { name: "Not Started" }).click();
  await expect(page.getByText("No notes in this state")).toBeVisible();
  await page.getByRole("tab", { name: "Completed" }).click();
  await expect(page.getByRole("link", { name: "E2E What is a quadratic?", exact: true })).toBeVisible();

  await page.getByRole("searchbox", { name: "Search Study Notes" }).fill("no such topic");
  await expect(page.getByText("No notes found")).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).first().click();
  await expect(page.getByRole("link", { name: "E2E What is a quadratic?", exact: true })).toBeVisible();

  // Search also matches chapter names, server-side.
  await page.goto("/study-notes?q=Quadratic%20Equations");
  await expect(page.getByRole("link", { name: "E2E What is a quadratic?", exact: true })).toBeVisible();
});

test("a failed study notes request shows an error with retry, never '0 notes'", async ({ page }) => {
  await signUpStudent(page, uniqueEmail("notes-error"), "Error Student");
  let fail = true;
  await page.route("**/rest/v1/rpc/get_study_note_stats", (route) =>
    fail ? route.fulfill({ status: 500, body: '{"message":"boom"}' }) : route.continue(),
  );
  await page.goto("/study-notes");
  await expect(page.getByRole("alert")).toContainText("Unable to load study notes");
  await expect(page.getByText(/0 notes/)).toHaveCount(0);
  fail = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: "Subjects" })).toBeVisible();
});

test("videos and animated show honest empty states when no such content exists", async ({ page }) => {
  await signUpStudent(page, uniqueEmail("empty"), "Empty Student");
  await page.goto("/videos");
  await expect(page.getByText(/No video lessons available yet/)).toBeVisible();
  await page.goto("/animated");
  await expect(page.getByText(/No animated lessons available yet/)).toBeVisible();
});

test("quizzes and test series list different real tests, and a test runs in focused exam mode", async ({ page }) => {
  await signUpStudent(page, uniqueEmail("exam"), "Exam Student");

  await page.goto("/quizzes");
  await expect(page.getByText("E2E Quadratics quiz")).toBeVisible();
  await expect(page.getByText("E2E Full Syllabus Mock")).toHaveCount(0);

  await page.goto("/test-series");
  await expect(page.getByText("E2E Full Syllabus Mock")).toBeVisible();
  await expect(page.getByText("E2E Quadratics quiz")).toHaveCount(0);
  await page.getByRole("navigation", { name: "Test Series navigation" }).getByRole("link", { name: "Full Syllabus" }).click();
  await expect(page).toHaveURL(/category=full/);
  await expect(page.getByText("E2E Full Syllabus Mock")).toBeVisible();

  await page.getByRole("link", { name: "Start E2E Full Syllabus Mock" }).click();
  await page.getByRole("button", { name: "Start test" }).click();
  await expect(page.getByRole("navigation", { name: "Question navigator" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toHaveCount(0);
  await page.getByRole("radio", { name: /^B\. 4$/ }).click();
  await page.getByRole("button", { name: "Submit test" }).click();
  await expect(page.getByText("Your result")).toBeVisible();

  await page.goto("/test-series?view=results");
  await expect(page.getByRole("cell", { name: "E2E Full Syllabus Mock" })).toBeVisible();
  await page.goto("/test-series?view=completed");
  await expect(page.getByRole("link", { name: "Retake E2E Full Syllabus Mock" })).toBeVisible();
});

test("on mobile the module sidebar is a Browse drawer, not a second permanent column", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signUpStudent(page, uniqueEmail("mobile"), "Mobile Student");
  await page.goto("/study-notes");
  await expect(page.getByRole("navigation", { name: "Study Notes navigation" })).toBeHidden();
  await page.getByRole("button", { name: "Browse" }).click();
  const drawerNav = page.getByRole("dialog").getByRole("navigation", { name: "Study Notes navigation" });
  await expect(drawerNav).toBeVisible();
  await drawerNav.getByRole("link", { name: /Mathematics/ }).click();
  await expect(page).toHaveURL(/\/study-notes\/mathematics$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
