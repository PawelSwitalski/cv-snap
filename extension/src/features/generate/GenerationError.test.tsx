import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n/i18n";
import { formatMessage, type MessageKey } from "@/lib/i18n/messages";
import { createMemoryStore } from "@/lib/storage/local-store";
import { errorAction, GenerationError } from "./GenerationError";

const en = (key: MessageKey) => formatMessage("en", key);

describe("GenerationError", () => {
  it("points an unavailable model back to the model setting (story 008 edge case)", async () => {
    const user = userEvent.setup();
    const onOpenSettings = vi.fn();
    const onRetry = vi.fn();
    render(
      <I18nProvider store={createMemoryStore()} browserLanguage="en-US">
        <GenerationError
          error={{ code: "MODEL_UNAVAILABLE", message: "model not on plan" }}
          isOffline={false}
          hasResult={false}
          onRetry={onRetry}
          onDismiss={() => undefined}
          onOpenSettings={onOpenSettings}
        />
      </I18nProvider>,
    );

    expect(screen.getByRole("alert").textContent).toContain(en("fix_MODEL_UNAVAILABLE"));
    await user.click(screen.getByRole("button", { name: en("error_action_open_settings") }));
    await user.click(screen.getByRole("button", { name: en("error_action_retry") }));

    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it.each([
    [{ code: "HOST_DISCONNECTED" }, "reconnect"],
    [{ code: "GENERATION_TIMEOUT" }, "retry"],
    [{ code: "MODEL_UNAVAILABLE" }, "open-settings"],
    [{ code: "JOB_AD_NOT_DETECTED", reason: "JOB_AD_NOT_DETECTED" }, "select-text"],
    [{ code: "JOB_AD_NOT_DETECTED", reason: "SITE_NOT_ALLOWED" }, "none"],
    [{ code: "GENERATION_FAILED", reason: "PROFILE_NOT_CONFIRMED" }, "none"],
  ] as const)("offers the right action for %o", (error, action) => {
    expect(errorAction(error)).toBe(action);
  });
});
