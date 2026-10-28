/** Elements that start a new line in the extracted text. */
const BLOCK_TAGS = new Set([
  "ADDRESS",
  "ARTICLE",
  "ASIDE",
  "BLOCKQUOTE",
  "BR",
  "DD",
  "DIV",
  "DL",
  "DT",
  "FIGCAPTION",
  "FOOTER",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "HEADER",
  "HR",
  "LI",
  "MAIN",
  "OL",
  "P",
  "PRE",
  "SECTION",
  "TABLE",
  "TR",
  "UL",
]);

/** Elements whose content is never readable text (code, styles, templates). */
const SKIPPED_TAGS = new Set(["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT"]);

/**
 * Readable plain text of an element, keeping block structure as line breaks and list items as
 * "- " lines (requirement lists stay one item per line for the parser). Works without layout,
 * unlike `innerText`.
 */
export function textFromElement(root: Node): string {
  const parts: string[] = [];
  const walk = (node: Node) => {
    if (node.nodeType === 3) {
      parts.push(node.textContent ?? "");
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = (node as Element).tagName.toUpperCase();
    if (SKIPPED_TAGS.has(tag)) return;
    const isBlock = BLOCK_TAGS.has(tag);
    if (isBlock) parts.push("\n");
    if (tag === "LI") parts.push("- ");
    for (const child of node.childNodes) walk(child);
    if (isBlock) parts.push("\n");
  };
  walk(root);
  return parts
    .join("")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");
}
