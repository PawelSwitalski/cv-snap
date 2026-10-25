/**
 * Turns positioned PDF text items into reading-order text (story 006-pdf-text-extraction).
 * Pure functions: no pdf.js here, so the layout rules are unit-tested with plain data.
 *
 * Coordinates are PDF user space: x grows to the right, y grows upwards.
 */

export interface TextItem {
  text: string;
  x: number;
  /** Baseline. */
  y: number;
  width: number;
  fontSize: number;
}

export interface PageItems {
  width: number;
  height: number;
  items: TextItem[];
}

interface Line {
  y: number;
  x: number;
  text: string;
}

/** Gutter search band: a column split is only plausible away from the page edges. */
const GUTTER_BAND = { from: 0.15, to: 0.85 };
const MIN_GUTTER_WIDTH = 8;
/** Share of items allowed to cross the gutter (full-width headings, name banner…). */
const MAX_CROSSING_SHARE = 0.08;
/** Each side needs this share of the page's characters to count as a column. */
const MIN_COLUMN_SHARE = 0.15;
/** Lines checked at the top and bottom of each page for repeated headers/footers. */
const EDGE_LINES = 2;

/** NFKC turns ligatures (ﬁ, ﬂ) and compatibility forms into plain text; soft hyphens go. */
export function normalizeText(text: string): string {
  return (
    text
      .normalize("NFKC")
      .replace(/­/g, "")
      // Private Use Area: icon-font glyphs (phone, mail, pin…) that carry no text.
      .replace(/[-]/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/** Lays out every page and removes repeated headers/footers; pages are separated by a blank line. */
export function layoutDocument(pages: PageItems[]): string {
  const pageLines = pages.map(layoutPage);
  const withoutRepeats = removeRepeatedEdgeLines(pageLines);
  return withoutRepeats
    .map((lines) => lines.join("\n"))
    .filter((page) => page.length > 0)
    .join("\n\n");
}

/** Reading-order lines of one page: per block, full-width lines, then left column, then right. */
export function layoutPage(page: PageItems): string[] {
  const items = page.items.filter((item) => item.text.trim().length > 0);
  const gutter = findGutter(page.width, items);
  if (!gutter) return readLines(items).map((line) => line.text);

  const left: TextItem[] = [];
  const right: TextItem[] = [];
  const spanning: TextItem[] = [];
  for (const item of items) {
    if (item.x + item.width <= gutter.end) left.push(item);
    else if (item.x >= gutter.start) right.push(item);
    else spanning.push(item);
  }

  // Full-width lines split the page into blocks; each block is read column by column.
  const fullWidth = toLines(spanning);
  const leftLines = readLines(left);
  const rightLines = readLines(right);
  const output: string[] = [];
  let upperY = Number.POSITIVE_INFINITY;
  const takeBlock = (lowerY: number) => {
    const inBlock = (line: Line) => line.y < upperY && line.y >= lowerY;
    output.push(...leftLines.filter(inBlock).map((line) => line.text));
    output.push(...rightLines.filter(inBlock).map((line) => line.text));
  };
  for (const line of fullWidth) {
    takeBlock(line.y);
    output.push(line.text);
    upperY = line.y;
  }
  takeBlock(Number.NEGATIVE_INFINITY);
  return output;
}

/**
 * Finds a vertical empty band between two columns: the widest run of x positions in the middle of
 * the page that (almost) no item covers, with enough text on both sides. Null for one column.
 */
export function findGutter(
  pageWidth: number,
  items: TextItem[],
): { start: number; end: number } | null {
  if (items.length < 4 || pageWidth <= 0) return null;
  const binCount = Math.ceil(pageWidth);
  const coverage = new Array<number>(binCount).fill(0);
  for (const item of items) {
    const from = Math.max(0, Math.floor(item.x));
    const to = Math.min(binCount - 1, Math.ceil(item.x + item.width));
    for (let bin = from; bin <= to; bin++) coverage[bin] = (coverage[bin] ?? 0) + 1;
  }
  const maxCrossing = Math.floor(items.length * MAX_CROSSING_SHARE);
  const from = Math.floor(pageWidth * GUTTER_BAND.from);
  const to = Math.ceil(pageWidth * GUTTER_BAND.to);

  let best: { start: number; end: number } | null = null;
  let runStart = -1;
  for (let bin = from; bin <= to + 1; bin++) {
    const isOpen = bin <= to && (coverage[bin] ?? 0) <= maxCrossing;
    if (isOpen && runStart < 0) runStart = bin;
    if (!isOpen && runStart >= 0) {
      if (!best || bin - runStart > best.end - best.start) best = { start: runStart, end: bin };
      runStart = -1;
    }
  }
  if (!best || best.end - best.start < MIN_GUTTER_WIDTH) return null;

  const chars = (predicate: (item: TextItem) => boolean) =>
    items.filter(predicate).reduce((sum, item) => sum + item.text.length, 0);
  const total = chars(() => true);
  const gutter = best;
  const leftChars = chars((item) => item.x + item.width <= gutter.end);
  const rightChars = chars((item) => item.x >= gutter.start);
  const isBalanced =
    leftChars >= total * MIN_COLUMN_SHARE && rightChars >= total * MIN_COLUMN_SHARE;
  return isBalanced ? gutter : null;
}

/** Groups items sharing a baseline, top to bottom; each group sorted by x. */
function groupByBaseline(items: TextItem[]): TextItem[][] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const groups: TextItem[][] = [];
  for (const item of sorted) {
    const current = groups.at(-1);
    const anchor = current?.[0];
    const tolerance = Math.max(2, (anchor?.fontSize ?? item.fontSize) * 0.5);
    if (current && anchor && Math.abs(anchor.y - item.y) <= tolerance) current.push(item);
    else groups.push([item]);
  }
  return groups.map((group) => [...group].sort((a, b) => a.x - b.x));
}

/** Joins a baseline group into one line, adding spaces where words are visibly apart. */
function toLine(group: TextItem[]): Line {
  let text = "";
  let previousEnd = Number.NEGATIVE_INFINITY;
  for (const item of group) {
    const gap = item.x - previousEnd;
    if (text && gap > item.fontSize * 0.2 && !text.endsWith(" ")) text += " ";
    text += item.text;
    previousEnd = item.x + item.width;
  }
  return { y: group[0]?.y ?? 0, x: group[0]?.x ?? 0, text: normalizeText(text) };
}

function toLines(items: TextItem[]): Line[] {
  return groupByBaseline(items)
    .map(toLine)
    .filter((line) => line.text.length > 0);
}

interface Interval {
  start: number;
  end: number;
}

/** Widest gap between neighbouring items of a line, if wide enough to separate two columns. */
function widestGap(group: TextItem[]): Interval | null {
  let best: Interval | null = null;
  for (let index = 1; index < group.length; index++) {
    const previous = group[index - 1];
    const current = group[index];
    if (!previous || !current) continue;
    const start = previous.x + previous.width;
    const threshold = Math.max(15, current.fontSize * 2.5);
    if (current.x - start >= threshold && (!best || current.x - start > best.end - best.start)) {
      best = { start, end: current.x };
    }
  }
  return best;
}

/**
 * A line crosses the gutter only if one item spans all of it. Lines on one side may still reach
 * into the (intersected, hence narrow) gap: a longer bullet in the left list is still left.
 */
const crosses = (group: TextItem[], gap: Interval) =>
  group.some((item) => item.x < gap.start && item.x + item.width > gap.end);

/**
 * Lines in reading order, splitting **local** two-column runs (e.g. two skill lists side by side
 * inside a one-column CV) into left side, then right side. A run is consecutive lines sharing a
 * wide gap at the same x, optionally with lines that sit on one side only; a larger line spacing
 * (a new section) ends it. Narrow left columns (dates, labels) stay row by row, so "2019 Engineer"
 * keeps the date next to its role.
 */
function readLines(items: TextItem[]): Line[] {
  const groups = groupByBaseline(items);
  const output: Line[] = [];
  let index = 0;
  while (index < groups.length) {
    const first = groups[index];
    if (!first) break;
    const firstGap = widestGap(first);
    if (!firstGap) {
      output.push(toLine(first));
      index++;
      continue;
    }

    const run = [first];
    let gap = firstGap;
    let linesWithGap = 1;
    let next = index + 1;
    for (; next < groups.length; next++) {
      const line = groups[next];
      const previous = run.at(-1);
      if (!line || !previous) break;
      // A section break (extra space before a heading) ends the run. Measured against the font
      // size, not the previous spacing: the two sides often sit on different baselines, so
      // consecutive "lines" can be very close.
      const distance = (previous[0]?.y ?? 0) - (line[0]?.y ?? 0);
      if (distance > (previous[0]?.fontSize ?? 10) * 1.9) break;
      const lineGap = widestGap(line);
      const overlap = lineGap
        ? Math.min(lineGap.end, gap.end) - Math.max(lineGap.start, gap.start)
        : -1;
      // Headings above each list are often indented differently, so the gaps may barely overlap.
      if (lineGap && overlap >= 1) {
        gap = { start: Math.max(lineGap.start, gap.start), end: Math.min(lineGap.end, gap.end) };
        linesWithGap++;
      } else if (lineGap) {
        // Its own gap elsewhere: a different column structure starts here (e.g. a date column
        // above, side-by-side lists below).
        break;
      } else if (crosses(line, gap)) {
        break;
      } else {
        // A one-sided line starting left of the run (e.g. a margin heading) is not part of it.
        const runLeft = Math.min(...run.flat().map((item) => item.x));
        if ((line[0]?.x ?? 0) < runLeft - (line[0]?.fontSize ?? 10)) break;
      }
      run.push(line);
    }

    const runItems = run.flat();
    const left = runItems.filter((item) => item.x + item.width <= gap.end);
    const right = runItems.filter((item) => item.x >= gap.start);
    if (linesWithGap >= 2 && isRealColumnPair(left, right)) {
      output.push(...toLines(left), ...toLines(right));
      index = next;
    } else {
      // Not two real columns (e.g. a date/label column): read the whole run row by row. Never
      // re-test from its second line, or the first row would be merged and the rest split.
      output.push(...run.map(toLine));
      index = next;
    }
  }
  return output.filter((line) => line.text.length > 0);
}

/** Two independent columns, not a label/date column: both sides wide and similarly filled. */
function isRealColumnPair(left: TextItem[], right: TextItem[]): boolean {
  const extent = (side: TextItem[]) =>
    Math.max(...side.map((item) => item.x + item.width)) - Math.min(...side.map((item) => item.x));
  const chars = (side: TextItem[]) => side.reduce((sum, item) => sum + item.text.length, 0);
  if (left.length === 0 || right.length === 0) return false;
  const total = extent([...left, ...right]);
  const balance = Math.min(chars(left), chars(right)) / Math.max(chars(left), chars(right));
  return extent(left) >= total * 0.25 && extent(right) >= total * 0.25 && balance >= 0.3;
}

/**
 * Removes header/footer lines repeated on several pages, keeping the first occurrence. Digits are
 * ignored when comparing, so "Strona 1 z 2" and "Strona 2 z 2" count as the same footer.
 */
export function removeRepeatedEdgeLines(pages: string[][]): string[][] {
  if (pages.length < 2) return pages;
  const key = (line: string) => line.replace(/\d+/g, "#").toLowerCase();
  const edgeKeys = (lines: string[]) =>
    new Set([...lines.slice(0, EDGE_LINES), ...lines.slice(-EDGE_LINES)].map(key));
  const pagesWithKey = new Map<string, number>();
  for (const lines of pages) {
    for (const k of edgeKeys(lines)) pagesWithKey.set(k, (pagesWithKey.get(k) ?? 0) + 1);
  }
  const seen = new Set<string>();
  return pages.map((lines) => {
    const edges = edgeKeys(lines);
    return lines.filter((line, index) => {
      const isEdge = index < EDGE_LINES || index >= lines.length - EDGE_LINES;
      const k = key(line);
      if (!isEdge || !edges.has(k) || (pagesWithKey.get(k) ?? 0) < 2) return true;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  });
}
