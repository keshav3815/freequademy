// Pure request validation for the doubt-solver function.
// No Deno/Node APIs here so the same module can be unit-tested from Vitest.

export const MAX_QUESTION_LENGTH = 2000;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // matches the 5 MB client limit
export const ALLOWED_GRADES = ["6", "7", "8", "9", "10", "11", "12"] as const;
export const ALLOWED_SUBJECTS = [
  "General",
  "Mathematics",
  "Science",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Hindi",
  "Social Science",
  "History",
  "Geography",
  "Civics",
  "Economics",
  "Computer Science",
  "Accountancy",
  "Business Studies",
] as const;

const IMAGE_DATA_URL = /^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/;

export type Grade = (typeof ALLOWED_GRADES)[number];
export type Subject = (typeof ALLOWED_SUBJECTS)[number];

export interface DoubtRequest {
  question: string;
  grade: Grade | null;
  subject: Subject;
  image: string | null;
}

export type ValidationResult =
  | { ok: true; value: DoubtRequest }
  | { ok: false; error: string };

export function decodedBase64Length(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export function validateDoubtRequest(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "Request body must be a JSON object." };
  }
  const input = body as Record<string, unknown>;

  if (typeof input.question !== "string" || input.question.trim().length === 0) {
    return { ok: false, error: "Please enter your question." };
  }
  const question = input.question.trim();
  if (question.length > MAX_QUESTION_LENGTH) {
    return { ok: false, error: `Questions can be at most ${MAX_QUESTION_LENGTH} characters.` };
  }

  let grade: Grade | null = null;
  if (input.grade !== undefined && input.grade !== null && input.grade !== "") {
    const value = String(input.grade);
    if (!(ALLOWED_GRADES as readonly string[]).includes(value)) {
      return { ok: false, error: "Unsupported grade." };
    }
    grade = value as Grade;
  }

  let subject: Subject = "General";
  if (input.subject !== undefined && input.subject !== null && input.subject !== "") {
    if (typeof input.subject !== "string" || !(ALLOWED_SUBJECTS as readonly string[]).includes(input.subject)) {
      return { ok: false, error: "Unsupported subject." };
    }
    subject = input.subject as Subject;
  }

  let image: string | null = null;
  if (input.image !== undefined && input.image !== null && input.image !== "") {
    if (typeof input.image !== "string") {
      return { ok: false, error: "Invalid image." };
    }
    const match = IMAGE_DATA_URL.exec(input.image);
    if (!match) {
      return { ok: false, error: "Images must be PNG, JPEG, WebP or GIF uploads." };
    }
    if (decodedBase64Length(match[2]) > MAX_IMAGE_BYTES) {
      return { ok: false, error: "Images must be smaller than 5 MB." };
    }
    image = input.image;
  }

  return { ok: true, value: { question, grade, subject, image } };
}
