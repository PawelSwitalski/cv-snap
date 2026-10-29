import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createMemoryStore, STORAGE_KEYS } from "@/lib/storage/local-store";
import { I18nProvider, useLanguage, useT } from "./i18n";
import { formatMessage } from "./messages";

function Probe() {
  const t = useT();
  const { language, setOverride } = useLanguage();
  return (
    <div>
      <p data-testid="text">{t("setup_title")}</p>
      <p data-testid="language">{language}</p>
      <button
        type="button"
        onClick={() => {
          setOverride("pl");
        }}
      >
        switch
      </button>
    </div>
  );
}

describe("I18nProvider", () => {
  it.each([
    ["pl-PL", "pl"],
    ["en-GB", "en"],
    ["de-DE", "en"],
  ])(
    "follows the browser language %s (other languages fall back to English)",
    (browser, expected) => {
      render(
        <I18nProvider store={createMemoryStore()} browserLanguage={browser}>
          <Probe />
        </I18nProvider>,
      );

      expect(screen.getByTestId("language").textContent).toBe(expected);
      expect(document.documentElement.lang).toBe(expected);
    },
  );

  it("applies a stored override over the browser language", async () => {
    const store = createMemoryStore({ [STORAGE_KEYS.uiLanguage]: "pl" });
    render(
      <I18nProvider store={store} browserLanguage="en-US">
        <Probe />
      </I18nProvider>,
    );

    expect(await screen.findByText(formatMessage("pl", "setup_title"))).toBeTruthy();
  });

  it("switches the whole UI at runtime and remembers the choice", async () => {
    const user = userEvent.setup();
    const store = createMemoryStore();
    render(
      <I18nProvider store={store} browserLanguage="en-US">
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId("text").textContent).toBe(formatMessage("en", "setup_title"));

    await user.click(screen.getByRole("button", { name: "switch" }));

    expect(screen.getByTestId("text").textContent).toBe(formatMessage("pl", "setup_title"));
    expect(store.data.get(STORAGE_KEYS.uiLanguage)).toBe("pl");
  });

  it("ignores an invalid stored override", async () => {
    const store = createMemoryStore({ [STORAGE_KEYS.uiLanguage]: "klingon" });
    render(
      <I18nProvider store={store} browserLanguage="pl-PL">
        <Probe />
      </I18nProvider>,
    );
    await act(() => Promise.resolve());

    expect(screen.getByTestId("language").textContent).toBe("pl");
  });
});
