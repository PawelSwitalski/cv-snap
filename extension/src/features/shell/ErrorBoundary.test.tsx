import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { formatMessage } from "@/lib/i18n/messages";
import { ErrorBoundary } from "./ErrorBoundary";
import { PanelError } from "./PanelError";

function Broken(): never {
  throw new Error("render failed with CV text Jan Testowy");
}

describe("ErrorBoundary", () => {
  it("shows a localized error instead of a blank panel", () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <ErrorBoundary fallback={() => <PanelError browserLanguage="pl-PL" />}>
        <Broken />
      </ErrorBoundary>,
    );
    quiet.mockRestore();

    expect(screen.getByRole("alert").textContent).toContain(
      formatMessage("pl", "panel_error_title"),
    );
    expect(
      screen.getByRole("button", { name: formatMessage("pl", "panel_error_reload") }),
    ).toBeTruthy();
    expect(document.body.textContent).not.toContain("Jan Testowy");
  });

  it("renders the children when nothing fails", () => {
    render(
      <ErrorBoundary fallback={() => <p>fallback</p>}>
        <p>content</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText("content")).toBeTruthy();
  });
});
