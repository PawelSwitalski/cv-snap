import { describe, expect, it } from "vitest";
import { cleanPageHtml, MAX_SNAPSHOT_BYTES, SNAPSHOT_CSP, snapshotPage } from "./snapshot";

const PAGE_URL = "https://jobs.example.com/offers/123?ref=list";

/** A job-ad page with every kind of active content the snapshot must drop (story 003). */
const HOSTILE_PAGE = `<!doctype html>
<html>
<head>
  <base href="https://evil.example/">
  <meta http-equiv="refresh" content="0; url=https://evil.example/">
  <meta http-equiv="Content-Security-Policy" content="script-src *">
  <link rel="stylesheet" href="/css/site.css">
  <link rel="preload" href="/js/app.js" as="script">
  <link rel="modulepreload" href="/js/mod.js">
  <script>window.ran = "inline";</script>
  <script src="https://cdn.example/tracker.js"></script>
  <style>.logo { background: url("../img/logo.png"); }</style>
</head>
<body onload="window.ran = 'onload'">
  <noscript><img src="/pixel.gif"></noscript>
  <h1 onclick="steal()">Senior Frontend Developer</h1>
  <p style="background-image: url(/img/bg.png)">Wymagania: React i TypeScript.</p>
  <a href="/apply">Apply</a>
  <a href="javascript:alert(1)">Bad link</a>
  <a href="  JaVa\tScRiPt:alert(1)">Obfuscated link</a>
  <a href="data:text/html,<script>alert(1)</script>">Data link</a>
  <img src="logo.png" srcset="logo-2x.png 2x, /logo-3x.png 3x" onerror="steal()">
  <iframe src="https://ads.example/"></iframe>
  <iframe srcdoc="<script>alert(1)</script>"></iframe>
  <object data="/flash.swf"></object>
  <embed src="/plugin.swf">
  <form action="https://evil.example/collect"><button formaction="/x">Send</button></form>
  <svg><a href="/svg-link"><text>svg</text></a><script>alert(1)</script></svg>
</body>
</html>`;

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

describe("cleanPageHtml", () => {
  const cleaned = parse(cleanPageHtml(HOSTILE_PAGE, PAGE_URL));

  it("removes scripts, frames, plugins, <base> and refresh / CSP metas", () => {
    for (const selector of [
      "script",
      "noscript",
      "iframe",
      "object",
      "embed",
      "base",
      'meta[http-equiv="refresh"]',
    ]) {
      expect(cleaned.querySelectorAll(selector), selector).toHaveLength(0);
    }
    const csps = [...cleaned.querySelectorAll('meta[http-equiv="Content-Security-Policy"]')];
    expect(csps.map((meta) => meta.getAttribute("content"))).toEqual([SNAPSHOT_CSP]);
  });

  it("puts its own CSP, which allows no scripts, at the start of <head>", () => {
    const first = [...cleaned.head.children].find(
      (element) => element.localName === "meta" && element.hasAttribute("http-equiv"),
    );

    expect(first?.getAttribute("content")).toBe(SNAPSHOT_CSP);
    expect(SNAPSHOT_CSP).toContain("script-src 'none'");
    expect(SNAPSHOT_CSP).toContain("base-uri 'none'");
    expect(SNAPSHOT_CSP).toContain("form-action 'none'");
  });

  it("removes every event handler, srcdoc and form action", () => {
    for (const element of cleaned.querySelectorAll("*")) {
      for (const attribute of element.attributes) {
        expect(attribute.name.startsWith("on"), `${element.localName}[${attribute.name}]`).toBe(
          false,
        );
        expect(["srcdoc", "action", "formaction"]).not.toContain(attribute.name);
      }
    }
  });

  it("drops javascript: and HTML data: URLs, including obfuscated ones", () => {
    const hrefs = [...cleaned.body.querySelectorAll(":scope > a")].map((link) =>
      link.getAttribute("href"),
    );

    expect(hrefs).toEqual(["https://jobs.example.com/apply", null, null, null]);
  });

  it("removes script from SVG and still resolves its links", () => {
    const svg = cleaned.querySelector("svg");
    const svgLink = [...(svg?.querySelectorAll("*") ?? [])].find(
      (element) => element.localName === "a",
    );

    expect(svg?.innerHTML).not.toContain("alert");
    expect(svgLink?.getAttribute("href")).toBe("https://jobs.example.com/svg-link");
  });

  it("keeps stylesheets and drops preloads", () => {
    const links = [...cleaned.querySelectorAll("link")].map((link) => link.getAttribute("rel"));

    expect(links).toEqual(["stylesheet"]);
  });

  it("makes links, images, srcset and CSS urls absolute against the page", () => {
    expect(cleaned.querySelector('link[rel="stylesheet"]')?.getAttribute("href")).toBe(
      "https://jobs.example.com/css/site.css",
    );
    const image = cleaned.querySelector("img");
    expect(image?.getAttribute("src")).toBe("https://jobs.example.com/offers/logo.png");
    expect(image?.getAttribute("srcset")).toBe(
      "https://jobs.example.com/offers/logo-2x.png 2x, https://jobs.example.com/logo-3x.png 3x",
    );
    expect(cleaned.querySelector("p")?.getAttribute("style")).toContain(
      "url(https://jobs.example.com/img/bg.png)",
    );
    expect(cleaned.querySelector("style")?.textContent).toContain(
      'url("https://jobs.example.com/img/logo.png")',
    );
  });

  it("opens links in a new tab, outside the viewer's sandbox", () => {
    const apply = cleaned.querySelector('a[href="https://jobs.example.com/apply"]');

    expect(apply?.getAttribute("target")).toBe("_blank");
    expect(apply?.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("keeps the ad's text readable", () => {
    expect(cleaned.body.textContent).toContain("Senior Frontend Developer");
    expect(cleaned.body.textContent).toContain("Wymagania: React i TypeScript.");
  });
});

describe("snapshotPage", () => {
  it("saves the cleaned page as a complete HTML document", () => {
    const snapshot = snapshotPage(HOSTILE_PAGE, PAGE_URL);

    expect(snapshot.status).toBe("saved");
    if (snapshot.status !== "saved") return;
    expect(snapshot.html.startsWith("<!doctype html>")).toBe(true);
    expect(snapshot.html).not.toContain("tracker.js");
  });

  it("reports a cleaned page over 5 MB as too large", () => {
    const big = `<html><body><p>${"x".repeat(MAX_SNAPSHOT_BYTES)}</p></body></html>`;

    expect(snapshotPage(big, PAGE_URL)).toEqual({ status: "too-large" });
  });

  it("counts bytes, not characters (Polish letters take two)", () => {
    const polish = `<html><body><p>${"ł".repeat(MAX_SNAPSHOT_BYTES / 2 + 10)}</p></body></html>`;

    expect(snapshotPage(polish, PAGE_URL)).toEqual({ status: "too-large" });
  });
});
