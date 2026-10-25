/**
 * Minimal synthetic PDFs for tests (no real CVs in the repo). Text uses the standard Helvetica
 * font; coordinates are PDF points on an A4 page (595 × 842, origin bottom-left).
 */

export interface PlacedText {
  text: string;
  x: number;
  y: number;
  size?: number;
}

export interface FixturePage {
  texts?: PlacedText[];
  /** Draws a small grey image and nothing else (a "scanned" page). */
  hasImage?: boolean;
}

const escapeText = (text: string) => text.replace(/[\\()]/g, (char) => `\\${char}`);

/** Builds a PDF with correct xref offsets. `encrypted` adds an /Encrypt dict the empty password can't open. */
export function buildPdf(pages: FixturePage[], options: { encrypted?: boolean } = {}): Buffer {
  const objects: string[] = [];
  const add = (body: string) => objects.push(body) - 1 + 1; // object number (1-based)

  const catalog = add(""); // filled once the pages object number is known
  const pagesObject = add("");
  const font = add(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  );
  const image = add(
    "<< /Type /XObject /Subtype /Image /Width 2 /Height 2 /ColorSpace /DeviceGray " +
      "/BitsPerComponent 8 /Length 4 >>\nstream\n\x80\x80\x80\x80\nendstream",
  );

  const pageNumbers: number[] = [];
  for (const page of pages) {
    const ops: string[] = [];
    for (const placed of page.texts ?? []) {
      ops.push(
        `BT /F1 ${String(placed.size ?? 10)} Tf ${String(placed.x)} ${String(placed.y)} Td (${escapeText(placed.text)}) Tj ET`,
      );
    }
    if (page.hasImage) ops.push("q 500 0 0 700 40 70 cm /Im1 Do Q");
    const stream = ops.join("\n");
    const content = add(
      `<< /Length ${String(Buffer.byteLength(stream, "latin1"))} >>\nstream\n${stream}\nendstream`,
    );
    pageNumbers.push(
      add(
        `<< /Type /Page /Parent ${String(pagesObject)} 0 R /MediaBox [0 0 595 842] ` +
          `/Resources << /Font << /F1 ${String(font)} 0 R >> /XObject << /Im1 ${String(image)} 0 R >> >> ` +
          `/Contents ${String(content)} 0 R >>`,
      ),
    );
  }
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${String(pagesObject)} 0 R >>`;
  objects[pagesObject - 1] =
    `<< /Type /Pages /Kids [${pageNumbers.map((n) => `${String(n)} 0 R`).join(" ")}] /Count ${String(pages.length)} >>`;

  let encrypt: number | null = null;
  if (options.encrypted) {
    // Revision 2 Standard security handler with arbitrary O/U values: the empty user password
    // doesn't match, so readers must ask for a password.
    const hex = (seed: number) =>
      Array.from({ length: 32 }, (_, index) =>
        ((index * 37 + seed) % 256).toString(16).padStart(2, "0"),
      ).join("");
    encrypt = add(`<< /Filter /Standard /V 1 /R 2 /O <${hex(11)}> /U <${hex(97)}> /P -44 >>`);
  }

  let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${String(index + 1)} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${String(objects.length + 1)}\n0000000000 65535 f \n`;
  for (const offset of offsets) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  const id = "<00112233445566778899aabbccddeeff>";
  pdf +=
    `trailer\n<< /Size ${String(objects.length + 1)} /Root ${String(catalog)} 0 R` +
    (encrypt === null ? "" : ` /Encrypt ${String(encrypt)} 0 R /ID [${id} ${id}]`) +
    ` >>\nstartxref\n${String(xrefOffset)}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

/** Lines placed top-down from `top`, 14 pt apart. */
export function column(lines: string[], x: number, top = 780, size = 10): PlacedText[] {
  return lines.map((text, index) => ({ text, x, y: top - index * 14, size }));
}
