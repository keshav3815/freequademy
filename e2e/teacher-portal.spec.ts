import { expect, test } from "@playwright/test";
import { MENTOR, logIn, signUpStudent, uniqueEmail } from "./fixtures";

/**
 * Teacher portal, end to end against the local stack: a student's real
 * submission reaches the teacher's review queue, the teacher's feedback and
 * announcement reach the student. Nothing here is mocked.
 */
test("submission → teacher review → student sees feedback and announcement", async ({ page, browser }) => {
  test.setTimeout(120_000); // two browser contexts and a full quiz
  const studentName = `Rahul Portal ${Date.now()}`;
  await signUpStudent(page, uniqueEmail("portal-student"), studentName);
  await page.goto("/quizzes");
  await page.getByRole("link", { name: "Start E2E Quadratics quiz" }).click();
  await page.getByRole("button", { name: "Start test" }).click();
  await page.getByRole("radio", { name: /2 and 3/ }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("radio", { name: /^A\. 1$/ }).click();
  await page.getByRole("button", { name: "Submit test" }).click();
  await expect(page.getByText("50%")).toBeVisible();

  const teacherContext = await browser.newContext();
  const teacher = await teacherContext.newPage();
  await logIn(teacher, MENTOR.email, MENTOR.password);
  await expect(teacher).toHaveURL(/\/teacher$/);
  await expect(teacher.getByRole("heading", { name: /^Good (morning|afternoon|evening)/ })).toBeVisible();

  // The student is on the roster with their real score
  await teacher.goto("/teacher/students");
  await teacher.getByRole("searchbox", { name: "Search students" }).fill(studentName);
  await expect(teacher.getByRole("link", { name: new RegExp(studentName) }).first()).toBeVisible();

  // Review the submission and return feedback
  await teacher.goto("/teacher/assignments?tab=review");
  await teacher.getByRole("link", { name: "E2E Quadratics quiz" }).click();
  await teacher.getByRole("button", { name: new RegExp(studentName) }).click();
  await expect(teacher.getByText("Student's answer").first()).toBeVisible();
  await teacher.getByLabel("Feedback").fill("Good start — revisit the degree of a polynomial.");
  await teacher.getByRole("button", { name: "Return to student" }).click();
  await expect(teacher.getByText(`Returned to ${studentName}`)).toBeVisible();

  // Announce to that one student
  await teacher.goto("/teacher/announcements?new=1");
  await teacher.getByLabel("Title").fill("Revision class on Friday");
  await teacher.getByLabel("Message").fill("Bring your quadratic questions.");
  await teacher.getByText("Selected students", { exact: true }).click();
  await teacher.getByRole("searchbox", { name: "Filter students" }).fill(studentName);
  await teacher.getByRole("checkbox").first().click();
  await teacher.getByRole("button", { name: "Publish" }).click();
  await expect(teacher.getByText("Announcement published")).toBeVisible();
  await teacherContext.close();

  // Student side
  await page.goto("/dashboard");
  await expect(page.getByText("Revision class on Friday")).toBeVisible();
  await page.getByRole("link", { name: "Review" }).first().click();
  await expect(page.getByText("Feedback from your teacher")).toBeVisible();
  await expect(page.getByText("Good start — revisit the degree of a polynomial.")).toBeVisible();
});

test("every teacher portal page renders for a seeded mentor", async ({ page }) => {
  await logIn(page, MENTOR.email, MENTOR.password);
  await expect(page).toHaveURL(/\/teacher$/);
  const pages: [string, string | RegExp][] = [
    ["/teacher/courses", "My Courses"],
    ["/teacher/classes", "Classes"],
    ["/teacher/assignments", "Assignments"],
    ["/teacher/calendar", "Calendar"],
    ["/teacher/students", "Students"],
    ["/teacher/students/attention", "Needs attention"],
    ["/teacher/attendance", "Attendance"],
    ["/teacher/analytics", "Analytics"],
    ["/teacher/performance", "Performance"],
    ["/teacher/resources", "Resource Library"],
    ["/teacher/messages", "Messages"],
    ["/teacher/announcements", "Announcements"],
    ["/teacher/blog", "Blog"],
    ["/teacher/settings", "Settings"],
  ];
  for (const [path, heading] of pages) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(page.getByText("Something went wrong")).toHaveCount(0);
  }
});
