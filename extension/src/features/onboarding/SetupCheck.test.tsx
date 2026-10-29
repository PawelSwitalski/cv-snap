import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n/i18n";
import { formatMessage } from "@/lib/i18n/messages";
import { createMemoryStore } from "@/lib/storage/local-store";
import { HEALTHY, healthClient } from "../../../test/panel-fixtures";
import { SetupCheck } from "./SetupCheck";

const en = (key: Parameters<typeof formatMessage>[1]) => formatMessage("en", key);
const wrap = (ui: ReactNode) => (
  <I18nProvider store={createMemoryStore()} browserLanguage="en-US">
    {ui}
  </I18nProvider>
);

describe("SetupCheck", () => {
  it("lets the user continue when everything is fine", async () => {
    const onContinue = vi.fn();
    const user = userEvent.setup();
    render(
      wrap(
        <SetupCheck
          createClient={() => healthClient({ report: HEALTHY })}
          onContinue={onContinue}
        />,
      ),
    );

    expect(await screen.findByText(en("setup_all_good"))).toBeTruthy();
    await user.click(screen.getByRole("button", { name: en("setup_continue") }));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it.each([
    [{ lastError: "Specified native messaging host not found." }, "hint_HOST_NOT_INSTALLED"],
    [{ report: { ...HEALTHY, claudeFound: false } }, "hint_CLAUDE_NOT_FOUND"],
    [{ report: { ...HEALTHY, isAuthenticated: false } }, "hint_CLAUDE_NOT_AUTHENTICATED"],
  ] as const)("shows the specific fix hint and blocks onboarding (%j)", async (outcome, hint) => {
    render(wrap(<SetupCheck createClient={() => healthClient(outcome)} onContinue={vi.fn()} />));

    expect(await screen.findByText(en(hint))).toBeTruthy();
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: en("setup_continue") }).disabled,
    ).toBe(true);
    expect(screen.getByRole("button", { name: en("setup_check_again") })).toBeTruthy();
  });

  it("shows a non-blocking update warning for an outdated Claude Code", async () => {
    render(
      wrap(
        <SetupCheck
          createClient={() => healthClient({ report: { ...HEALTHY, isVersionSupported: false } })}
          onContinue={vi.fn()}
        />,
      ),
    );

    expect(await screen.findByText(en("hint_CLAUDE_VERSION_UNSUPPORTED"))).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: en("setup_continue") }).disabled,
    ).toBe(false);
  });

  it("finds a host installed while the panel is open with 'Check again'", async () => {
    const user = userEvent.setup();
    let isInstalled = false;
    const createClient = () =>
      isInstalled
        ? healthClient({ report: HEALTHY })
        : healthClient({ lastError: "Specified native messaging host not found." });
    render(wrap(<SetupCheck createClient={createClient} onContinue={vi.fn()} />));
    expect(await screen.findByText(en("hint_HOST_NOT_INSTALLED"))).toBeTruthy();

    isInstalled = true;
    await user.click(screen.getByRole("button", { name: en("setup_check_again") }));

    expect(await screen.findByText(en("setup_all_good"))).toBeTruthy();
    expect(screen.queryByText(en("hint_HOST_NOT_INSTALLED"))).toBeNull();
  });
});
