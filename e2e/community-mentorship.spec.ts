import { expect, test } from "@playwright/test";
import { MENTOR, logIn, signUpStudent, uniqueEmail } from "./fixtures";

test("student starts a discussion, another student replies and votes", async ({ page, browser }) => {
  const title = `How do I find the discriminant? ${Date.now()}`;
  await signUpStudent(page, uniqueEmail("asker"), "Ravi Asker");
  await page.goto("/community");
  await page.getByRole("button", { name: "New Thread" }).click();
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Details").fill("I keep mixing up b² − 4ac.");
  await page.getByRole("button", { name: "Post" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  const threadUrl = page.url();

  const other = await browser.newContext();
  const helper = await other.newPage();
  await signUpStudent(helper, uniqueEmail("helper"), "Meera Helper");
  await helper.goto(threadUrl);
  await expect(helper.getByText("By Ravi Asker")).toBeVisible(); // real author name via public_profiles
  await helper.getByLabel("Your reply").fill("It is b squared minus 4ac.");
  await helper.getByRole("button", { name: "Post reply" }).click();
  await expect(helper.getByText("1 reply")).toBeVisible();
  await helper.getByRole("button", { name: "Upvote (0 votes)" }).click();
  await expect(helper.getByRole("button", { name: "Upvote (1 votes)" })).toBeVisible();
  await other.close();

  await page.reload();
  await page.getByRole("button", { name: "Mark as solution" }).click();
  await expect(page.getByText("Solution", { exact: true })).toBeVisible();
});

test("mentor schedules a session with a private link; a registered student can join", async ({ page, browser }) => {
  const title = `Algebra clinic ${Date.now()}`;
  await logIn(page, MENTOR.email, MENTOR.password);
  await expect(page).toHaveURL(/\/teacher$/);
  await page.goto("/mentor-dashboard");
  await page.getByRole("button", { name: "Create Session" }).click();
  await page.getByLabel("Session Title").fill(title);
  await page.getByLabel("Description").fill("Bring your doubts");
  const start = new Date(Date.now() + 20 * 60_000);
  const local = new Date(start.getTime() - start.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  await page.getByLabel("Date & Time").fill(local);
  await page.getByLabel("Meeting link (https)").fill("https://meet.example.com/e2e-room");
  await page.getByRole("dialog").getByRole("button", { name: "Create Session" }).click();
  await expect(page.getByText("Session created successfully")).toBeVisible();

  const studentContext = await browser.newContext();
  // the meeting host is fictional; answer it locally so the popup can load
  await studentContext.route("https://meet.example.com/**", (route) => route.fulfill({ body: "meeting room" }));
  const student = await studentContext.newPage();
  await signUpStudent(student, uniqueEmail("attendee"), "Kabir Attendee");
  await student.goto("/mentorship");
  await student.getByRole("tab", { name: "Upcoming Sessions" }).click();
  const card = student.locator(".rounded-lg").filter({ hasText: title });
  await card.getByRole("button", { name: "Register for Session" }).click();
  await expect(student.getByText("You'll find this session under My Sessions.")).toBeVisible();

  await student.getByRole("tab", { name: "My Sessions" }).click();
  const popupPromise = student.waitForEvent("popup");
  await student.locator(".rounded-lg").filter({ hasText: title }).getByRole("button", { name: "Join" }).click();
  const popup = await popupPromise;
  await expect.poll(() => popup.url()).toContain("meet.example.com/e2e-room");
  await studentContext.close();
});
