import type { CvProfile } from "@cv-snap/shared";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { smallProfile } from "../../../test/cv-fixtures";
import {
  AD_PATTERN,
  AD_URL,
  adPageFacts,
  fabricatedPlan,
  fakeConnector,
  fakePageStateApis,
  fakeRender,
  generationResult,
} from "../../../test/generate-fixtures";
import type { AddSiteResult } from "@/features/allowed-sites/allowed-sites";
import type { PageFacts } from "./page-state";
import { I18nProvider } from "@/lib/i18n/i18n";
import { formatMessage, type MessageKey } from "@/lib/i18n/messages";
import { createMemoryStore } from "@/lib/storage/local-store";
import { GenerateView } from "./GenerateView";
import { createSettingsStore } from "@/features/settings/store";
import { createGenerateStore } from "./store";

const en = (key: MessageKey, ...subs: string[]) => formatMessage("en", key, subs);
const wrap = (ui: ReactNode) => (
  <I18nProvider store={createMemoryStore()} browserLanguage="en-US">
    {ui}
  </I18nProvider>
);

function setup(
  options: {
    facts?: PageFacts;
    isOnline?: boolean;
    addSite?: (url: string) => Promise<AddSiteResult>;
    profile?: CvProfile;
  } = {},
) {
  const connector = fakeConnector();
  const page = fakePageStateApis(options.facts ?? adPageFacts());
  const renderer = fakeRender();
  const store = createGenerateStore({
    connect: connector.connect,
    isOnline: () => options.isOnline ?? true,
  });
  const addSite = vi.fn(
    options.addSite ??
      (() => Promise.resolve<AddSiteResult>({ ok: false, reason: "DENIED" as const })),
  );
  render(
    wrap(
      <GenerateView
        profile={options.profile ?? smallProfile()}
        deps={{
          store,
          pageStateApis: page.apis,
          addSite,
          photo: () => Promise.resolve(undefined),
          settings: createSettingsStore(createMemoryStore()),
          render: renderer.render,
        }}
      />,
    ),
  );
  return { connector, page, renderer, store, addSite, user: userEvent.setup() };
}

async function generateToResult(ctx: ReturnType<typeof setup>, result = generationResult()) {
  await ctx.user.click(await screen.findByRole("button", { name: en("generate_button") }));
  act(() => {
    ctx.connector.last().emit({ type: "result", result });
  });
  await screen.findByRole("article", { name: en("preview_label") });
}

describe("GenerateView", () => {
  it("generates with one click on an allowed page with a detected ad", async () => {
    const ctx = setup();

    await ctx.user.click(await screen.findByRole("button", { name: en("generate_button") }));

    expect(ctx.connector.last().posted).toEqual([
      expect.objectContaining({ type: "generate", tabId: 7, override: null }),
    ]);
  });

  it("announces progress politely and returns to ready on Cancel", async () => {
    const ctx = setup();
    await ctx.user.click(await screen.findByRole("button", { name: en("generate_button") }));
    act(() => {
      ctx.connector.last().emit({ type: "progress", step: "tailoring" });
    });

    const live = screen.getByText(en("progress_tailoring"), {
      selector: "[aria-live] *, [aria-live]",
    });
    expect(live.closest("[aria-live]")?.getAttribute("aria-live")).toBe("polite");

    const started = Date.now();
    await ctx.user.click(screen.getByRole("button", { name: en("generate_cancel") }));

    expect(await screen.findByRole("button", { name: en("generate_button") })).toBeTruthy();
    expect(Date.now() - started).toBeLessThan(2000);
    expect(ctx.connector.last().state.isDisconnected).toBe(true);
  });

  it("shows the preview with requirements, gaps and the unverified summary", async () => {
    const ctx = setup();
    await generateToResult(ctx, generationResult(fabricatedPlan()));

    expect(
      screen.getByRole("heading", {
        name: en("result_title_company", "Senior Frontend Developer", "Acme Test"),
      }),
    ).toBeTruthy();
    expect(screen.getByText(en("result_unverified_count", "1"))).toBeTruthy();
    expect(screen.getByText(en("result_requirements"))).toBeTruthy();
    expect(screen.getByText("5+ lat z React i TypeScript")).toBeTruthy();
    const gaps = screen.getByRole("region", { name: en("result_gaps", "1") });
    expect(within(gaps).getByText("GraphQL")).toBeTruthy();
  });

  it("marks an unverified line with text, not colour alone, and lets the user edit it", async () => {
    const ctx = setup();
    await generateToResult(ctx, generationResult(fabricatedPlan()));
    const preview = screen.getByRole("article", { name: en("preview_label") });

    expect(within(preview).getByText(en("preview_unverified"))).toBeTruthy();
    await ctx.user.click(
      within(preview).getByRole("button", {
        name: en("preview_edit_line", "Migracja 12 aplikacji do TypeScript."),
      }),
    );
    const box = within(preview).getByRole("textbox", { name: en("preview_edit_label") });
    await ctx.user.clear(box);
    await ctx.user.type(box, "Migracja aplikacji do TypeScript.");
    await ctx.user.click(within(preview).getByRole("button", { name: en("preview_save") }));

    expect(within(preview).getByText("Migracja aplikacji do TypeScript.")).toBeTruthy();
    expect(within(preview).getByText(en("preview_user_edited"))).toBeTruthy();
    expect(within(preview).queryByText(en("preview_unverified"))).toBeNull();
    expect(screen.getByText(en("result_all_verified"))).toBeTruthy();
  });

  it("removes a line and restores it from the removed list", async () => {
    const ctx = setup();
    await generateToResult(ctx, generationResult(fabricatedPlan()));
    const preview = screen.getByRole("article", { name: en("preview_label") });

    await ctx.user.click(
      within(preview).getByRole("button", {
        name: en("preview_remove_line", "Migracja 12 aplikacji do TypeScript."),
      }),
    );
    expect(within(preview).queryByText("Migracja 12 aplikacji do TypeScript.")).toBeNull();
    expect(ctx.store.getState().changes.removed).toEqual(["items[exp_acme].bullets[0]"]);

    await ctx.user.click(screen.getByRole("button", { name: en("result_restore") }));
    expect(within(preview).getByText("Migracja 12 aplikacji do TypeScript.")).toBeTruthy();
  });

  it("regenerates in another language for that run only", async () => {
    const ctx = setup();
    await generateToResult(ctx);

    await ctx.user.selectOptions(screen.getByLabelText(en("result_cv_language")), "en");
    await ctx.user.click(screen.getByRole("button", { name: en("result_regenerate") }));

    expect(ctx.connector.last().posted[0]).toMatchObject({ tabId: 7, override: "en" });
  });

  it("guides to the manual selection when no ad was detected", async () => {
    const ctx = setup({ facts: { ...adPageFacts(), jobAdStatus: null } });

    expect(await screen.findByText(en("generate_select_hint"))).toBeTruthy();
    await ctx.user.click(screen.getByRole("button", { name: en("generate_button") }));
    act(() => {
      ctx.connector.last().emit({
        type: "error",
        error: { code: "JOB_AD_NOT_DETECTED", message: "none", reason: "JOB_AD_NOT_DETECTED" },
      });
    });

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(en("error_JOB_AD_NOT_DETECTED"));
    expect(alert.textContent).toContain(en("fix_JOB_AD_NOT_DETECTED"));
    await ctx.user.click(within(alert).getByRole("button", { name: en("error_action_selected") }));
    expect(ctx.connector.ports).toHaveLength(2);
  });

  it("turns Add this site into Generate after approval, without a reload", async () => {
    // The page fake exists only after setup; addSite reaches it through this holder.
    const holder: { page?: ReturnType<typeof fakePageStateApis> } = {};
    const ctx = setup({
      facts: { ...adPageFacts(), grantedPatterns: [], jobAdStatus: null },
      addSite: () => {
        const { page } = holder;
        if (page) {
          page.facts.grantedPatterns = [AD_PATTERN];
          page.facts.jobAdStatus = { isJobAd: true, url: AD_URL };
          page.fire();
        }
        return Promise.resolve({
          ok: true,
          site: { pattern: AD_PATTERN, label: "jobs.example.com", presetId: null, addedAt: null },
        });
      },
    });
    holder.page = ctx.page;

    await ctx.user.click(await screen.findByRole("button", { name: en("generate_add_site") }));

    expect(ctx.addSite).toHaveBeenCalledWith(AD_URL);
    expect(await screen.findByRole("button", { name: en("generate_button") })).toBeTruthy();
  });

  it("tells the user when access to the site was refused", async () => {
    const ctx = setup({ facts: { ...adPageFacts(), grantedPatterns: [] } });

    await ctx.user.click(await screen.findByRole("button", { name: en("generate_add_site") }));

    expect(await screen.findByText(en("generate_add_denied"))).toBeTruthy();
  });

  it("asks for a click on the icon where Chrome hides the address", async () => {
    setup({ facts: { ...adPageFacts(), tab: { id: 7, url: undefined } } });

    expect(await screen.findByText(en("generate_click_icon"))).toBeTruthy();
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: en("generate_button") }).disabled,
    ).toBe(true);
  });

  it("offers Reconnect for a lost connection and starts a new run with it", async () => {
    const ctx = setup();
    await ctx.user.click(await screen.findByRole("button", { name: en("generate_button") }));
    act(() => {
      ctx.connector.last().drop();
    });

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(en("fix_HOST_DISCONNECTED"));
    await ctx.user.click(within(alert).getByRole("button", { name: en("error_action_reconnect") }));

    expect(ctx.connector.ports).toHaveLength(2);
    expect(screen.getByRole("button", { name: en("generate_cancel") })).toBeTruthy();
  });

  it("offers one-click retry on a timeout and mentions the network when offline", async () => {
    const ctx = setup({ isOnline: false });
    await ctx.user.click(await screen.findByRole("button", { name: en("generate_button") }));
    act(() => {
      ctx.connector.last().emit({
        type: "error",
        error: { code: "GENERATION_TIMEOUT", message: "Generation took too long" },
      });
    });

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(en("error_offline_hint"));
    await ctx.user.click(within(alert).getByRole("button", { name: en("error_action_retry") }));
    expect(ctx.connector.ports).toHaveLength(2);
  });

  it("renders the preview from the fitted model and lists what was dropped", async () => {
    const connector = fakeConnector();
    const page = fakePageStateApis(adPageFacts());
    const renderer = fakeRender({
      drop: () => [{ kind: "item", entryId: "exp_beta", title: "Beta role", text: null }],
    });
    const store = createGenerateStore({ connect: connector.connect });
    render(
      wrap(
        <GenerateView
          profile={smallProfile()}
          deps={{
            store,
            pageStateApis: page.apis,
            addSite: () => Promise.resolve({ ok: false, reason: "DENIED" }),
            photo: () => Promise.resolve(undefined),
            settings: createSettingsStore(createMemoryStore()),
            render: renderer.render,
          }}
        />,
      ),
    );
    await userEvent.click(await screen.findByRole("button", { name: en("generate_button") }));
    act(() => {
      connector.last().emit({ type: "result", result: generationResult() });
    });

    expect(await screen.findByRole("heading", { name: en("result_dropped", "1") })).toBeTruthy();
    expect(screen.getByText(en("result_dropped_item", "Beta role"))).toBeTruthy();
    await waitFor(() => {
      expect(renderer.rendered.length).toBeGreaterThan(0);
    });
  });
});
