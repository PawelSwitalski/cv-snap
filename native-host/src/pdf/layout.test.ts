import { describe, expect, it } from "vitest";
import {
  findGutter,
  layoutDocument,
  layoutPage,
  normalizeText,
  removeRepeatedEdgeLines,
  type TextItem,
} from "./layout.js";

const CHAR_WIDTH = 5;
/** One text item at (x, y) with a width proportional to its length (8 pt font). */
const item = (text: string, x: number, y: number, fontSize = 8): TextItem => ({
  text,
  x,
  y,
  width: text.length * CHAR_WIDTH,
  fontSize,
});
/** Items stacked top-down from `top`, `pitch` points apart. */
const stack = (lines: string[], x: number, top: number, pitch = 11) =>
  lines.map((text, index) => item(text, x, top - index * pitch));
const page = (items: TextItem[]) => ({ width: 595, height: 842, items });

describe("normalizeText", () => {
  it("expands ligatures, drops soft hyphens and icon-font glyphs, collapses spaces", () => {
    expect(normalizeText("  Ofﬁce  work­flow  e-mail ")).toBe("Office workflow e-mail");
  });
});

describe("layoutPage", () => {
  it("reads a one-column page top to bottom, joining words on a line", () => {
    const items = [item("Developer", 60, 700), item("Jan", 60, 720), item("Testowy", 80, 720)];

    expect(layoutPage(page(items))).toEqual(["Jan Testowy", "Developer"]);
  });

  it("reads a two-column page column by column under a full-width heading", () => {
    const left = [
      "Contact: Krakow, Poland",
      "Skills: TypeScript, React",
      "Testing with Vitest",
      "Accessibility (WCAG)",
      "Languages",
      "English C1, German B1",
      "Polish (native)",
    ];
    const right = [
      "Experience at Acme Sp. z o.o.",
      "Built the design system",
      "Mentored two juniors",
      "Education",
      "Computer Science, AGH",
      "Graduated in 2019",
      "Thesis on accessibility",
    ];
    const items = [
      item("Jan Testowy - Curriculum Vitae of a developer", 40, 800),
      ...stack(left, 40, 760),
      ...stack(right, 260, 760),
    ];

    expect(layoutPage(page(items))).toEqual([
      "Jan Testowy - Curriculum Vitae of a developer",
      ...left,
      ...right,
    ]);
  });

  it("splits side-by-side lists inside a one-column page, then continues below", () => {
    const leftList = [
      "Specialist skills",
      "Systems analysis and",
      "design work",
      "SQL and data modelling",
    ];
    const rightList = ["Soft skills", "Communication with clients", "Teamwork and mentoring"];
    const items = [
      item("Summary paragraph that runs across the whole page width here", 60, 500),
      item("SKILLS", 60, 470),
      ...stack(leftList, 60, 450),
      ...stack(rightList, 300, 450),
      item("INTERESTS", 60, 380),
      item("Reading and running and a long sentence across the page", 60, 360),
    ];

    expect(layoutPage(page(items))).toEqual([
      "Summary paragraph that runs across the whole page width here",
      "SKILLS",
      ...leftList,
      ...rightList,
      "INTERESTS",
      "Reading and running and a long sentence across the page",
    ]);
  });

  it("keeps the lists apart when their headings are indented differently", () => {
    const items = [
      item("Specialist skills", 170, 364),
      item("Soft skills", 362, 364),
      ...stack(["Diagnosing and treating", "Preparing medical opinions"], 202, 353),
      ...stack(["Communication", "Empathy"], 394, 353),
    ];

    expect(layoutPage(page(items))).toEqual([
      "Specialist skills",
      "Diagnosing and treating",
      "Preparing medical opinions",
      "Soft skills",
      "Communication",
      "Empathy",
    ]);
  });

  it("ends a list run at a heading in the left margin", () => {
    const paragraph =
      "A paragraph line that spans the full width of the page, as body text does ".repeat(2);
    const items = [
      item(paragraph, 40, 420),
      ...stack(["Left list item one", "Left list item two"], 200, 400),
      ...stack(["Right list item one", "Right list item two"], 400, 400),
      item("PUBLICATIONS", 40, 380),
      item(paragraph, 40, 368),
    ];

    const lines = layoutPage(page(items));

    expect(lines.slice(1, 6)).toEqual([
      "Left list item one",
      "Left list item two",
      "Right list item one",
      "Right list item two",
      "PUBLICATIONS",
    ]);
  });

  it("doesn't let a date column above swallow side-by-side lists below (sample regression)", () => {
    const items = [
      item("2014", 40, 400),
      item("Specialisation: internal medicine", 170, 400),
      item("2010", 40, 389),
      item("Medical faculty, Jagiellonian University", 170, 389),
      item("SKILLS", 40, 376),
      item("Specialist skills", 170, 364),
      item("Soft skills", 362, 364),
      ...stack(["Diagnosing and treating", "Preparing medical opinions"], 202, 353),
      ...stack(["Communication", "Empathy and patience"], 394, 353),
    ];

    expect(layoutPage(page(items))).toEqual([
      "2014 Specialisation: internal medicine",
      "2010 Medical faculty, Jagiellonian University",
      "SKILLS",
      "Specialist skills",
      "Diagnosing and treating",
      "Preparing medical opinions",
      "Soft skills",
      "Communication",
      "Empathy and patience",
    ]);
  });

  it("keeps a narrow date column next to its entries (row by row)", () => {
    const items = [
      item("2018-2021", 60, 600),
      item("Captain of the Black Pearl and a long role description", 140, 600),
      item("2016-2017", 60, 589),
      item("Freelance pirate in Tortuga with a long description", 140, 589),
    ];

    expect(layoutPage(page(items))).toEqual([
      "2018-2021 Captain of the Black Pearl and a long role description",
      "2016-2017 Freelance pirate in Tortuga with a long description",
    ]);
  });
});

describe("findGutter", () => {
  it("returns null for a single column and for too few items", () => {
    expect(
      findGutter(595, stack(["a long line of text in one column", "another one"], 60, 700)),
    ).toBeNull();
    expect(findGutter(595, [item("x", 60, 700)])).toBeNull();
  });

  it("returns null when one side holds almost no text", () => {
    const items = [
      ...stack(["A", "B", "C"], 40, 700),
      ...stack(
        Array.from({ length: 6 }, () => "a long line of right-hand text here"),
        300,
        700,
      ),
    ];

    expect(findGutter(595, items)).toBeNull();
  });
});

describe("removeRepeatedEdgeLines", () => {
  it("keeps the first copy of a repeated header and ignores page numbers in footers", () => {
    const pages = [
      ["Jan Testowy - CV", "Body one", "Page 1 of 2"],
      ["Jan Testowy - CV", "Body two", "Page 2 of 2"],
    ];

    expect(removeRepeatedEdgeLines(pages)).toEqual([
      ["Jan Testowy - CV", "Body one", "Page 1 of 2"],
      ["Body two"],
    ]);
  });

  it("leaves single-page documents and body lines alone", () => {
    expect(removeRepeatedEdgeLines([["Only page"]])).toEqual([["Only page"]]);
  });
});

describe("layoutDocument", () => {
  it("separates pages with a blank line and drops empty pages", () => {
    const pages = [
      page([item("Page one", 60, 700)]),
      page([]),
      page([item("Page three", 60, 700)]),
    ];

    expect(layoutDocument(pages)).toBe("Page one\n\nPage three");
  });
});
