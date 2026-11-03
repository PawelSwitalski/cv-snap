import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, FIXTURES_DIR, test } from "../harness/fixtures";

const plan = JSON.parse(readFileSync(join(FIXTURES_DIR, "provider", "plan.json"), "utf8")) as {
  summary: [{ text: string }];
};

/** Story 003-one-click-e2e: job ad → Generate → preview → Download PDF, with the real host. */
test("generates a tailored CV for the job ad in the tab and downloads it as a PDF", async ({
  cvSnap,
  jobBoard,
}) => {
  const ad = await cvSnap.context.newPage();
  await ad.goto(jobBoard.url("job-ad.html"));
  const panel = await cvSnap.openSidePanel(ad);

  await panel.getByRole("button", { name: "I understand, continue" }).click();
  await panel.getByRole("button", { name: "Generate CV" }).click();

  const steps = panel.getByRole("list", { name: "Generation steps" });
  await expect(steps).toBeVisible();
  await expect(steps).toContainText("Analysing the requirements");
  await expect(steps).toContainText("Tailoring your CV");

  await expect(panel.getByText(plan.summary[0].text)).toBeVisible({ timeout: 30_000 });

  const downloadPromise = panel.waitForEvent("download");
  await panel.getByRole("button", { name: "Download PDF" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^CV_.+\.pdf$/);
  const bytes = readFileSync(await download.path());
  expect(bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
});
