/**
 * Synthetic job-ad pages for the job-ad tests (no real pages or personal data in the repo).
 * `loadPage` writes into the test window's own document, so computed styles work like on a live page.
 */

export interface AdPageOptions {
  title?: string;
  /** JSON-LD blocks, serialised as given. */
  jsonLd?: unknown[];
  /** Extra HTML inside the article (e.g. hidden elements). */
  extra?: string;
  /** Section headings; defaults to PL requirements/responsibilities/offer. */
  headings?: string[];
  applyButtons?: number;
  applyLabel?: string;
  /** Links to other ads ("similar offers"). */
  similarAdLinks?: number;
  /** Wrap the content in `<main>` (default) or not. */
  hasMain?: boolean;
}

const REQUIREMENTS = [
  "Minimum 3 lata doświadczenia z TypeScript",
  "Znajomość React i testów jednostkowych",
  "Język angielski na poziomie B2",
];
const DUTIES = ["Rozwój aplikacji frontendowej", "Code review", "Współpraca z zespołem UX"];

export function adPageHtml(options: AdPageOptions = {}): string {
  const headings = options.headings ?? [
    "Twój zakres obowiązków",
    "Nasze wymagania",
    "To oferujemy",
  ];
  const sections = headings
    .map((heading, index) => {
      const items =
        index === 1 ? REQUIREMENTS : index === 0 ? DUTIES : ["Praca zdalna", "Benefity"];
      return `<section><h2>${heading}</h2><ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>
        <p>Szczegółowy opis sekcji ${String(index + 1)} z dodatkowymi informacjami dla kandydatów.</p></section>`;
    })
    .join("\n");
  const apply = Array.from(
    { length: options.applyButtons ?? 1 },
    () => `<button type="button">${options.applyLabel ?? "Aplikuj"}</button>`,
  ).join("");
  const similar = Array.from(
    { length: options.similarAdLinks ?? 0 },
    (_, index) =>
      `<li><a href="https://justjoin.it/job-offer/similar-${String(index)}">Oferta ${String(index)}</a></li>`,
  ).join("");
  const scripts = (options.jsonLd ?? [])
    // Like real pages: "<" escaped so a "</script>" inside a string can't end the block early.
    .map(
      (block) =>
        `<script type="application/ld+json">${JSON.stringify(block).replace(/</g, `${String.fromCharCode(92)}u003c`)}</script>`,
    )
    .join("");
  const content = `<article><h1>${options.title ?? "Senior Frontend Developer"}</h1>${sections}${options.extra ?? ""}${apply}</article>`;
  return `<html><head><title>${options.title ?? "Senior Frontend Developer"} - Praca</title>${scripts}</head>
    <body><nav><a href="/">Start</a><a href="/oferty">Oferty</a></nav>
    ${options.hasMain === false ? content : `<main>${content}</main>`}
    <aside><ul>${similar}</ul></aside><footer>© Job board</footer></body></html>`;
}

/** A search/listing page: many ad cards, each with its own apply button. */
export function listingPageHtml(cards = 20): string {
  const items = Array.from(
    { length: cards },
    (_, index) =>
      `<li><a href="https://justjoin.it/job-offer/offer-${String(index)}">Java Developer ${String(index)}</a>
       <span>Kraków</span><button>Apply</button></li>`,
  ).join("");
  return `<html><head><title>Java jobs</title></head><body><h1>${String(cards)} Java jobs</h1><ul>${items}</ul></body></html>`;
}

export const JOB_POSTING = {
  "@context": "https://schema.org",
  "@type": "JobPosting",
  title: "Senior Frontend Developer",
  hiringOrganization: { "@type": "Organization", name: "Acme Sp. z o.o." },
  description:
    "<p>Opis stanowiska.</p><h3>Wymagania</h3><ul><li>TypeScript</li><li>React</li></ul><p>Druga linia opisu, aby tekst miał co najmniej dwieście znaków i był traktowany jako pełny opis oferty pracy w tym teście jednostkowym. Trzecie zdanie wydłuża opis.</p>",
};

/** Replaces the test window's document content and returns that (live) document. */
export function loadPage(html: string): Document {
  // Parsed inertly (no scripts run), then swapped in so computed styles come from the live window.
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const imported = (parent: Element) =>
    [...parent.childNodes].map((node) => document.importNode(node, true));
  document.head.replaceChildren(...imported(parsed.head));
  document.body.replaceChildren(...imported(parsed.body));
  return document;
}
