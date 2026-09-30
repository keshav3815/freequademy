import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { useDocumentMeta } from "./useDocumentMeta";

function Page({ title, description }: { title: string; description?: string }) {
  useDocumentMeta({ title, description });
  return <p>content</p>;
}

describe("useDocumentMeta", () => {
  it("sets the document title and description", () => {
    render(<Page title="Algebra Basics" description="Learn quadratic equations." />);
    expect(document.title).toBe("Algebra Basics | Freequademy");
    expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(
      "Learn quadratic equations.",
    );
  });

  it("sets a canonical link matching the current path", () => {
    render(<Page title="Mathematics" />);
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toContain("/");
  });

  it("restores the previous title on unmount", () => {
    document.title = "Freequademy";
    const { unmount } = render(<Page title="Temporary Page" />);
    expect(document.title).toBe("Temporary Page | Freequademy");
    unmount();
    expect(document.title).toBe("Freequademy");
  });

  it("updates og:title alongside the document title", () => {
    render(<Page title="Community" description="Talk to other students." />);
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute("content")).toBe(
      "Community | Freequademy",
    );
  });
});
