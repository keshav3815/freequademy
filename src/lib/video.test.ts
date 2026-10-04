import { describe, expect, it } from "vitest";
import { youtubeEmbedUrl } from "./video";

describe("youtubeEmbedUrl", () => {
  it("converts watch, short and embed links to the privacy-enhanced embed", () => {
    expect(youtubeEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(youtubeEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(youtubeEmbedUrl("https://m.youtube.com/embed/dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });

  it("returns null for other hosts, http, and malformed ids", () => {
    expect(youtubeEmbedUrl("https://vimeo.com/123")).toBeNull();
    expect(youtubeEmbedUrl("http://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(youtubeEmbedUrl("https://evil-youtube.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(youtubeEmbedUrl("https://www.youtube.com/watch?v=<script>")).toBeNull();
    expect(youtubeEmbedUrl("not a url")).toBeNull();
    expect(youtubeEmbedUrl(null)).toBeNull();
  });
});
