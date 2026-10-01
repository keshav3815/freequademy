import { describe, expect, it } from "vitest";
import { scoreStatus } from "./testGrading";

describe("scoreStatus", () => {
  it("classifies by the documented thresholds", () => {
    expect(scoreStatus(100)).toBe("excellent");
    expect(scoreStatus(75)).toBe("excellent");
    expect(scoreStatus(74.9)).toBe("good");
    expect(scoreStatus(50)).toBe("good");
    expect(scoreStatus(49.9)).toBe("needs_revision");
    expect(scoreStatus(0)).toBe("needs_revision");
  });
});
