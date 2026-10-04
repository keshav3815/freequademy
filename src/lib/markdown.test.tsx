import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Markdown } from "./markdown";

describe("Markdown", () => {
  it("renders headings, lists, emphasis and code", () => {
    const { container } = render(
      <Markdown source={"# Title\n\nSome **bold** and *italic* and `x^2`.\n\n- one\n- two\n\n1. first\n2. second"} />,
    );
    expect(screen.getByRole("heading", { name: "Title" })).toBeInTheDocument();
    expect(container.querySelector("strong")?.textContent).toBe("bold");
    expect(container.querySelector("em")?.textContent).toBe("italic");
    expect(container.querySelector("code")?.textContent).toBe("x^2");
    expect(container.querySelectorAll("ul li")).toHaveLength(2);
    expect(container.querySelectorAll("ol li")).toHaveLength(2);
  });

  it("never renders raw HTML from the source", () => {
    const { container } = render(<Markdown source={'<img src=x onerror="alert(1)"><script>alert(1)</script>'} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toContain("<script>");
  });

  it("only links to http(s) URLs, opening safely in a new tab", () => {
    const { container } = render(<Markdown source={"[ok](https://ncert.nic.in) and [bad](javascript:alert(1))"} />);
    const links = container.querySelectorAll("a");
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute("href")).toBe("https://ncert.nic.in");
    expect(links[0].getAttribute("rel")).toContain("noopener");
    expect(container.textContent).toContain("[bad](javascript:alert(1))");
  });

  it("renders fenced code blocks verbatim", () => {
    const { container } = render(<Markdown source={"```\nconst a = '<b>';\n```"} />);
    expect(container.querySelector("pre code")?.textContent).toBe("const a = '<b>';");
    expect(container.querySelector("b")).toBeNull();
  });
});
