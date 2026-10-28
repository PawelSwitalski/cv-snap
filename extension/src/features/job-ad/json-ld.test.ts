import {
  LIMITS,
  MAX_STRUCTURED_DESCRIPTION_CHARS,
  StructuredAdFieldsSchema,
} from "@cv-snap/shared";
import { describe, expect, it } from "vitest";
import { adPageHtml, JOB_POSTING, loadPage } from "../../../test/job-ad-fixtures";
import { findJobPosting, structuredFieldsFrom } from "./json-ld";

describe("findJobPosting", () => {
  it("finds a top-level JobPosting", () => {
    expect(findJobPosting(loadPage(adPageHtml({ jsonLd: [JOB_POSTING] })))).toMatchObject({
      title: "Senior Frontend Developer",
    });
  });

  it("finds a JobPosting inside an array and inside @graph, with @type as an array", () => {
    const inArray = loadPage(adPageHtml({ jsonLd: [[{ "@type": "Organization" }, JOB_POSTING]] }));
    expect(findJobPosting(inArray)).not.toBeNull();

    const inGraph = loadPage(
      adPageHtml({
        jsonLd: [
          {
            "@graph": [
              { "@type": "WebPage" },
              { ...JOB_POSTING, "@type": ["JobPosting", "Thing"] },
            ],
          },
        ],
      }),
    );
    expect(findJobPosting(inGraph)).not.toBeNull();
  });

  it("ignores malformed JSON and other types, and keeps looking in later blocks", () => {
    const html = adPageHtml({ jsonLd: [{ "@type": "BreadcrumbList" }, JOB_POSTING] }).replace(
      "<head>",
      '<head><script type="application/ld+json">{ not json</script>',
    );

    expect(findJobPosting(loadPage(html))).toMatchObject({ "@type": "JobPosting" });
  });

  it("returns null without a JobPosting", () => {
    expect(findJobPosting(loadPage(adPageHtml()))).toBeNull();
  });
});

describe("structuredFieldsFrom", () => {
  it("returns title, company and the description as plain text with line breaks kept", () => {
    const fields = structuredFieldsFrom(loadPage(adPageHtml({ jsonLd: [JOB_POSTING] })));

    expect(StructuredAdFieldsSchema.safeParse(fields).success).toBe(true);
    expect(fields).toMatchObject({
      title: "Senior Frontend Developer",
      company: "Acme Sp. z o.o.",
    });
    expect(fields?.description).toContain("Wymagania\n- TypeScript\n- React");
    expect(fields?.description).not.toContain("<");
  });

  it("accepts a company given as a plain string and nulls missing fields", () => {
    const posting = { "@type": "JobPosting", title: "Tester", hiringOrganization: "Beta" };

    expect(structuredFieldsFrom(loadPage(adPageHtml({ jsonLd: [posting] })))).toEqual({
      title: "Tester",
      company: "Beta",
      description: null,
    });
  });

  it("caps every field to the shared contract's limits", () => {
    const posting = {
      "@type": "JobPosting",
      title: "T".repeat(LIMITS.shortChars + 50),
      hiringOrganization: { name: "C".repeat(LIMITS.shortChars + 50) },
      description: "D".repeat(MAX_STRUCTURED_DESCRIPTION_CHARS + 100),
    };

    const fields = structuredFieldsFrom(loadPage(adPageHtml({ jsonLd: [posting] })));

    expect(fields?.title).toHaveLength(LIMITS.shortChars);
    expect(fields?.company).toHaveLength(LIMITS.shortChars);
    expect(fields?.description).toHaveLength(MAX_STRUCTURED_DESCRIPTION_CHARS);
  });

  it("parses the description inertly: scripts and markup never become text", () => {
    const posting = {
      ...JOB_POSTING,
      description:
        '<script>window.__pwned = true</script><img src=x onerror="window.__pwned=true"><p>Opis</p>',
    };

    const fields = structuredFieldsFrom(loadPage(adPageHtml({ jsonLd: [posting] })));

    expect(fields?.description).toBe("Opis");
    expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined();
  });

  it("returns null without a JobPosting", () => {
    expect(structuredFieldsFrom(loadPage(adPageHtml()))).toBeNull();
  });
});
