import { describe, expect, it } from "vitest";
import { currentAcademicYear } from "./academicYear";

describe("currentAcademicYear", () => {
  it("uses the April start of the Indian school year", () => {
    expect(currentAcademicYear(new Date(2026, 3, 1))).toBe("2026–27"); // April 2026
    expect(currentAcademicYear(new Date(2026, 9, 15))).toBe("2026–27"); // October 2026
    expect(currentAcademicYear(new Date(2027, 0, 15))).toBe("2026–27"); // January 2027
    expect(currentAcademicYear(new Date(2026, 2, 31))).toBe("2025–26"); // March 2026
  });
});
