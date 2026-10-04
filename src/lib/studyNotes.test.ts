import { describe, expect, it } from "vitest";
import { formatUpdated, parseNotesParams, sanitizeSearch, subjectAccent } from "./studyNotes";
import { extractHeadings } from "./markdownHeadings";

describe("parseNotesParams", () => {
  it("defaults to all notes, course order, first page", () => {
    expect(parseNotesParams(new URLSearchParams())).toEqual({ view: "all", q: "", sort: "course", status: "all", page: 1 });
  });

  it("accepts known values and rejects anything else", () => {
    expect(parseNotesParams(new URLSearchParams("view=saved&sort=title&status=completed&page=3&q=sets"))).toEqual({
      view: "saved",
      q: "sets",
      sort: "title",
      status: "completed",
      page: 3,
    });
    expect(parseNotesParams(new URLSearchParams("view=hacked&sort=rank&status=x&page=-2"))).toEqual({
      view: "all",
      q: "",
      sort: "course",
      status: "all",
      page: 1,
    });
  });
});

describe("sanitizeSearch", () => {
  it("strips characters that could alter a PostgREST or() filter", () => {
    expect(sanitizeSearch("sets),id.eq.(1")).toBe("sets id eq 1");
    expect(sanitizeSearch("  newton's   laws* % ")).toBe("newton s laws");
  });

  it("caps the length", () => {
    expect(sanitizeSearch("a".repeat(200))).toHaveLength(80);
  });
});

describe("formatUpdated", () => {
  const now = new Date(2026, 8, 30, 12);
  it("describes recent dates relatively and older ones absolutely", () => {
    expect(formatUpdated(new Date(2026, 8, 30, 8).toISOString(), now)).toBe("Updated today");
    expect(formatUpdated(new Date(2026, 8, 29, 23).toISOString(), now)).toBe("Updated yesterday");
    expect(formatUpdated(new Date(2026, 8, 25).toISOString(), now)).toBe("Updated 5 days ago");
    expect(formatUpdated(new Date(2026, 5, 1).toISOString(), now)).toMatch(/^Updated 1 Jun 2026$/);
  });

  it("returns null when there is no real date", () => {
    expect(formatUpdated(null, now)).toBeNull();
    expect(formatUpdated("not a date", now)).toBeNull();
  });
});

describe("subjectAccent", () => {
  it("falls back to the brand primary for unknown subjects", () => {
    expect(subjectAccent("accountancy")).toBe("bg-primary/10 text-primary");
    expect(subjectAccent(undefined)).toBe("bg-primary/10 text-primary");
  });
});

describe("extractHeadings", () => {
  it("gives stable, unique ids and skips fenced code", () => {
    const md = "# Newton's Laws\n\n## First Law\ntext\n```\n# not a heading\n```\n## First Law\n### **Bold** [link](https://x.y)";
    expect(extractHeadings(md)).toEqual([
      { id: "newton-s-laws", text: "Newton's Laws", level: 1 },
      { id: "first-law", text: "First Law", level: 2 },
      { id: "first-law-1", text: "First Law", level: 2 },
      { id: "bold-link", text: "Bold link", level: 3 },
    ]);
  });
});
