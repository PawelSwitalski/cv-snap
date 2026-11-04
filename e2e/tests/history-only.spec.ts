import { expect, test } from "../harness/fixtures";
import { historyEntries } from "../harness/history";

// A user without the helper: nothing registered for the test browser, no profile.
test.use({ cvSnapSetup: { host: false, profile: false } });

/** A tiny but valid-looking PDF: the extension checks the `%PDF-` signature, not the content. */
const CV_PDF = Buffer.from("%PDF-1.4\n% e2e own CV\n%%EOF\n", "latin1");

declare global {
  // Counters installed by the test, read back at the end.
  var e2eNativeCalls: number | undefined;
}

/**
 * Counts every native messaging call from now on (run in the panel and the service worker).
 * Returns whether both functions were really replaced, so a count of 0 means something.
 */
function countNativeCalls(): boolean {
  globalThis.e2eNativeCalls = 0;
  const runtime = chrome.runtime as unknown as Record<string, unknown>;
  return ["connectNative", "sendNativeMessage"].every((name) => {
    const original = runtime[name] as (...args: unknown[]) => unknown;
    const counting = (...args: unknown[]) => {
      globalThis.e2eNativeCalls = (globalThis.e2eNativeCalls ?? 0) + 1;
      return original.apply(chrome.runtime, args);
    };
    runtime[name] = counting;
    return runtime[name] === counting;
  });
}

const nativeCalls = () => globalThis.e2eNativeCalls ?? -1;

/**
 * Story 006-history-only-e2e: no helper installed → Use without the helper → add a CV → save it for
 * the job ad → "Your CV" in History, with no native messaging after the setup check.
 */
test("works without the helper: saves your own CV for a job ad to History", async ({
  cvSnap,
  jobBoard,
}) => {
  const ad = await cvSnap.context.newPage();
  await ad.goto(jobBoard.url("job-ad.html"));
  const panel = await cvSnap.openSidePanel(ad);
  const { serviceWorker } = cvSnap;

  await test.step("the setup check fails and offers to continue without the helper", async () => {
    await panel.getByRole("button", { name: "I understand, continue" }).click();
    await expect(panel.getByRole("alert").first()).toBeVisible({ timeout: 15_000 });
    expect(await panel.evaluate(countNativeCalls)).toBe(true);
    expect(await serviceWorker.evaluate(countNativeCalls)).toBe(true);
    await panel.getByRole("button", { name: "Use without the helper" }).click();
  });

  await test.step("the CV is stored and history-only home opens", async () => {
    await panel.locator('input[type="file"]').setInputFiles({
      name: "Moje_CV.pdf",
      mimeType: "application/pdf",
      buffer: CV_PDF,
    });
    await expect(panel.getByRole("button", { name: "Set up the helper" })).toBeVisible();
    await expect(panel.getByRole("button", { name: "Generate CV" })).toHaveCount(0);
  });

  await test.step("the CV is saved for the job ad, with title and company from the page", async () => {
    await panel.getByRole("button", { name: "Save my CV to history" }).click();
    await expect(panel.getByLabel("Job title")).toHaveValue("Senior Frontend Developer");
    await expect(panel.getByLabel("Company")).toHaveValue("Przykładowa Firma");
    await panel.getByRole("button", { name: "Save", exact: true }).click();
    await expect(panel.getByText("Saved to history.")).toBeVisible();

    const entries = await historyEntries(serviceWorker);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      source: "own",
      title: "Senior Frontend Developer",
      company: "Przykładowa Firma",
      fileName: "Moje_CV.pdf",
    });
  });

  await test.step("History shows it as your CV", async () => {
    await panel.getByRole("button", { name: "History", exact: true }).click();
    const row = panel.getByRole("listitem").filter({ hasText: "Przykładowa Firma" });
    await expect(row).toContainText("Your CV");
    await expect(row).toContainText("Senior Frontend Developer");
  });

  await test.step("no native messaging after the setup check", async () => {
    expect(await panel.evaluate(nativeCalls)).toBe(0);
    expect(await serviceWorker.evaluate(nativeCalls)).toBe(0);
  });
});
