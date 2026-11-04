import type { Page } from "@playwright/test";
import { expect, test } from "../harness/fixtures";
import { backdateHistoryEntry, historyEntries, seedHistoryEntry } from "../harness/history";

const TITLE = "Senior Frontend Developer";
/** The fake provider reads no company, so the row is named after the ad's site. */
const SITE = "jobs.cvsnap.test";
const SEEDED = {
  adKey: "https://jobs.cvsnap.test/backend.html",
  title: "Backend Developer",
  company: "Inna Spółka",
};

async function download(panel: Page): Promise<void> {
  const downloadPromise = panel.waitForEvent("download");
  await panel.getByRole("button", { name: "Download PDF" }).click();
  await downloadPromise;
}

async function openHistory(panel: Page) {
  await panel.getByRole("button", { name: "History", exact: true }).click();
  await expect(panel.getByRole("heading", { name: "History" })).toBeVisible();
  return panel.getByRole("listitem");
}

/**
 * Story 005-history-e2e: download → History, sent date, saved page, search and filter, retention
 * and delete, with the real host, the real side panel and the real IndexedDB history. One test in
 * steps: each step builds on the history the previous one left.
 */
test("keeps downloaded CVs in History: sent date, saved page, search, retention, delete", async ({
  cvSnap,
  jobBoard,
}) => {
  const ad = await cvSnap.context.newPage();
  await ad.goto(jobBoard.url("job-ad.html"));
  const panel = await cvSnap.openSidePanel(ad);
  const { serviceWorker } = cvSnap;
  await panel.getByRole("button", { name: "I understand, continue" }).click();

  await test.step("a download is listed; downloading again keeps one entry, with a later date", async () => {
    await panel.getByRole("button", { name: "Generate CV" }).click();
    await expect(panel.getByRole("button", { name: "Download PDF" })).toBeVisible({
      timeout: 30_000,
    });
    await download(panel);

    const rows = await openHistory(panel);
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText(SITE);
    await expect(rows.first()).toContainText(TITLE);
    const [first] = await historyEntries(serviceWorker);

    await panel.getByRole("button", { name: "Back" }).click();
    await download(panel);
    // The entry is written after the download starts.
    await expect
      .poll(async () =>
        Date.parse((await historyEntries(serviceWorker))[0]?.lastDownloadedAt ?? ""),
      )
      .toBeGreaterThan(Date.parse(first?.lastDownloadedAt ?? ""));
    expect(await historyEntries(serviceWorker)).toHaveLength(1);
    await expect(await openHistory(panel)).toHaveCount(1);
  });

  await test.step("the sent date shows and survives a reload", async () => {
    await panel.getByRole("button", { name: "Mark as sent" }).click();
    await expect(panel.getByText(/^Sent on /)).toBeVisible();

    await panel.reload();
    await openHistory(panel);
    await expect(panel.getByText(/^Sent on /)).toBeVisible();
    expect((await historyEntries(serviceWorker))[0]?.sentOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  await test.step("the saved page shows the ad and runs none of its scripts", async () => {
    const viewerPromise = cvSnap.context.waitForEvent("page");
    await panel.getByRole("button", { name: "Open saved page" }).click();
    const viewer = await viewerPromise;
    await viewer.waitForLoadState();

    const saved = viewer.frameLocator('iframe[title="Saved job ad"]');
    await expect(saved.getByRole("heading", { name: TITLE, level: 1 })).toBeVisible();
    await expect(saved.locator("#e2e-script-ran")).toHaveCount(0);
    await viewer.close();
  });

  await test.step("search and the sent filter leave the right rows", async () => {
    const now = new Date().toISOString();
    await seedHistoryEntry(
      serviceWorker,
      {
        ...SEEDED,
        schemaVersion: 1,
        url: SEEDED.adKey,
        isManualSelection: false,
        outputLanguage: "pl",
        fileName: "CV_Backend.pdf",
        createdAt: now,
        lastDownloadedAt: now,
        sentOn: null,
      },
      "Backend Developer, Inna Spółka",
    );
    await panel.reload();
    const rows = await openHistory(panel);
    await expect(rows).toHaveCount(2);

    const search = panel.getByLabel("Search by company or job title");
    await search.fill("inna");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText(SEEDED.company);
    await search.fill("");

    const filter = panel.getByLabel("Show");
    await filter.selectOption({ label: "Sent" });
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText(SITE);
    await filter.selectOption({ label: "Not sent" });
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText(SEEDED.company);
  });

  await test.step("retention removes an old entry on reload; Delete removes the other", async () => {
    await panel.reload();
    await panel.getByRole("button", { name: "Settings" }).click();
    await panel.getByRole("radio", { name: "Delete after" }).check();
    await panel.getByLabel("Months").selectOption({ label: "1 months" });
    // Nothing is a month old yet, so the setting is saved without asking.
    await expect(panel.getByRole("alertdialog")).toHaveCount(0);

    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    await backdateHistoryEntry(serviceWorker, SEEDED.adKey, twoMonthsAgo);
    await panel.reload();
    const rows = await openHistory(panel);
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText(SITE);

    await rows.first().getByRole("button", { name: "Delete" }).click();
    const dialog = panel.getByRole("alertdialog");
    await dialog.getByRole("button", { name: "Delete" }).click();
    await expect(
      panel.getByText("No CVs yet. A CV appears here after you click Download PDF."),
    ).toBeVisible();
    expect(await historyEntries(serviceWorker)).toEqual([]);
  });
});
