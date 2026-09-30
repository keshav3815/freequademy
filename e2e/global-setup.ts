import { ADMIN, MENTOR, SECRET_KEY, SUPABASE_URL, adminRest } from "./fixtures";

/**
 * Seeds the local stack with an admin, an approved mentor and one published
 * lesson + test in Class 10 Mathematics. Idempotent: safe to re-run.
 */
async function ensureUser(email: string, password: string, fullName: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: SECRET_KEY, Authorization: `Bearer ${SECRET_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: fullName } }),
  });
  if (res.ok) return (await res.json()).id;

  const [profile] = await adminRest(`/rest/v1/profiles?select=id&email=eq.${encodeURIComponent(email)}`);
  if (!profile) throw new Error(`Could not create or find ${email}: ${res.status} ${await res.text()}`);
  return profile.id;
}

export default async function globalSetup() {
  if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(SUPABASE_URL)) {
    throw new Error("Refusing to seed a non-local Supabase project");
  }
  if (!SECRET_KEY) throw new Error("Set E2E_SUPABASE_SECRET_KEY (printed by `supabase start`)");

  const adminId = await ensureUser(ADMIN.email, ADMIN.password, "E2E Admin");
  await adminRest("/rest/v1/user_roles?on_conflict=user_id,role", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: adminId, role: "admin" }),
  });

  const mentorId = await ensureUser(MENTOR.email, MENTOR.password, "E2E Mentor");
  await adminRest(`/rest/v1/profiles?id=eq.${mentorId}`, { method: "PATCH", body: JSON.stringify({ role: "mentor" }) });
  await adminRest("/rest/v1/mentors?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ id: mentorId, full_name: "E2E Mentor", email: MENTOR.email, is_verified: true }),
  });

  const [maths] = await adminRest("/rest/v1/subjects?select=id&class_level=eq.10&slug=eq.mathematics");

  const fullTests = await adminRest("/rest/v1/tests?select=id&title=eq.E2E%20Full%20Syllabus%20Mock");
  if (fullTests.length === 0) {
    const [mock] = await adminRest("/rest/v1/tests", {
      method: "POST",
      body: JSON.stringify({ subject_id: maths.id, title: "E2E Full Syllabus Mock", test_type: "full", duration_minutes: 30, status: "published", author_id: mentorId }),
    });
    await adminRest("/rest/v1/test_questions", {
      method: "POST",
      body: JSON.stringify([{ test_id: mock.id, sort_order: 1, prompt: "2 + 2 = ?", options: ["3", "4"], correct_option: 1, marks: 1 }]),
    });
  }

  const existing = await adminRest(`/rest/v1/chapters?select=id&subject_id=eq.${maths.id}&title=eq.E2E%20Quadratic%20Equations`);
  if (existing.length > 0) return;

  const [chapter] = await adminRest("/rest/v1/chapters", {
    method: "POST",
    body: JSON.stringify({ subject_id: maths.id, title: "E2E Quadratic Equations", sort_order: 1 }),
  });
  await adminRest("/rest/v1/lessons", {
    method: "POST",
    body: JSON.stringify({
      chapter_id: chapter.id,
      title: "E2E What is a quadratic?",
      summary: "Standard form and roots",
      content_md: "# Quadratic equations\n\nA quadratic has the form **ax² + bx + c = 0**.",
      status: "published",
      author_id: mentorId,
      sort_order: 1,
    }),
  });
  const [test] = await adminRest("/rest/v1/tests", {
    method: "POST",
    body: JSON.stringify({ subject_id: maths.id, chapter_id: chapter.id, title: "E2E Quadratics quiz", duration_minutes: 10, status: "published", author_id: mentorId }),
  });
  await adminRest("/rest/v1/test_questions", {
    method: "POST",
    body: JSON.stringify([
      { test_id: test.id, sort_order: 1, prompt: "Roots of x² − 5x + 6 = 0?", options: ["2 and 3", "1 and 6", "−2 and −3"], correct_option: 0, explanation: "(x − 2)(x − 3) = 0", marks: 1 },
      { test_id: test.id, sort_order: 2, prompt: "Degree of a quadratic?", options: ["1", "2", "3"], correct_option: 1, explanation: "Highest power is 2", marks: 1 },
    ]),
  });
}
