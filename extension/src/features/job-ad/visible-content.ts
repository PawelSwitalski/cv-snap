/**
 * Hidden-content filter for extraction (story 004): text the user can't see is a prompt-injection
 * vector, so it never reaches the captured ad. Hidden elements are found on the LIVE page (computed
 * style and layout exist only there) and removed from a CLONE: the page's DOM is never modified.
 */

const ALWAYS_SKIPPED = new Set(["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT", "IFRAME", "OBJECT"]);
/** Far outside the viewport: the classic "position:absolute; left:-9999px" hiding trick. */
const OFFSCREEN_PX = 1000;

export interface ElementBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface VisibilityProbe {
  style(element: Element): CSSStyleDeclaration | null;
  /** Null when the environment has no layout (then size/position checks are skipped). */
  box(element: Element): ElementBox | null;
}

/** Probe backed by the browser; layout checks only when the page actually has layout. */
export function browserProbe(document: Document): VisibilityProbe {
  const view = document.defaultView;
  const hasLayout = (document.documentElement.getBoundingClientRect().height || 0) > 0;
  return {
    style: (element) => view?.getComputedStyle(element) ?? null,
    box: (element) => (hasLayout ? element.getBoundingClientRect() : null),
  };
}

export function isHiddenElement(element: Element, probe: VisibilityProbe): boolean {
  if (ALWAYS_SKIPPED.has(element.tagName.toUpperCase())) return true;
  if (element.hasAttribute("hidden")) return true;
  if (element.getAttribute("aria-hidden") === "true") return true;

  const style = probe.style(element);
  if (style) {
    if (style.display === "none") return true;
    if (style.visibility === "hidden" || style.visibility === "collapse") return true;
    if (style.opacity !== "" && Number(style.opacity) === 0) return true;
    if (
      /^rect\(\s*0(?:px)?[\s,]+0(?:px)?[\s,]+0(?:px)?[\s,]+0(?:px)?\s*\)$/.test(
        style.getPropertyValue("clip"),
      )
    ) {
      return true;
    }
  }

  const box = probe.box(element);
  if (box) {
    if (box.width === 0 && box.height === 0 && element.textContent.trim().length > 0) {
      // Text in a zero-size box (e.g. overflow:hidden; height:0) is invisible.
      return style?.overflow === "hidden" || style?.position === "absolute";
    }
    if (box.right < -OFFSCREEN_PX || box.bottom < -OFFSCREEN_PX) return true;
  }
  return false;
}

/**
 * A copy of the document without hidden elements. The clone has the same structure as the live
 * document, so elements are matched by their position in document order.
 */
export function cloneWithoutHidden(
  document: Document,
  probe: VisibilityProbe = browserProbe(document),
): Document {
  const live = [...document.querySelectorAll("*")];
  const hiddenIndexes: number[] = [];
  live.forEach((element, index) => {
    if (isHiddenElement(element, probe)) hiddenIndexes.push(index);
  });

  const clone = document.cloneNode(true) as Document;
  const cloned = [...clone.querySelectorAll("*")];
  for (const index of hiddenIndexes) cloned[index]?.remove();
  return clone;
}
