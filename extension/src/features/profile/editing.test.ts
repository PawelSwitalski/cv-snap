import { collectProfileIds, findDuplicateIds } from "@cv-snap/shared";
import { describe, expect, it } from "vitest";
import { draftContent } from "../../../test/panel-fixtures";
import {
  addItem,
  addLine,
  moveItem,
  moveLine,
  removeItem,
  removeLine,
  updateItem,
  updateLine,
  type ListSection,
} from "./editing";

const SECTIONS: ListSection[] = [
  "summary",
  "experience",
  "projects",
  "education",
  "skills",
  "languages",
  "certifications",
  "otherSections",
];

describe("profile editing", () => {
  it.each(SECTIONS)("adds a %s item with a new unique ID", (section) => {
    const before = draftContent();

    const { profile, id } = addItem(before, section);

    expect(collectProfileIds(before)).not.toContain(id);
    expect(profile[section].at(-1)?.id).toBe(id);
    expect(findDuplicateIds(collectProfileIds(profile))).toEqual([]);
  });

  it("never changes IDs when text is edited", () => {
    const before = draftContent();

    const after = updateItem(before, "experience", "exp_acme", {
      company: "Acme Polska",
      id: "hijacked",
    } as never);

    expect(collectProfileIds(after)).toEqual(collectProfileIds(before));
    expect(after.experience[0]?.company).toBe("Acme Polska");
  });

  it("returns a new object and leaves the input unchanged", () => {
    const before = draftContent();
    const snapshot = structuredClone(before);

    removeItem(before, "experience", "exp_acme");

    expect(before).toEqual(snapshot);
  });

  it("deletes an item", () => {
    const after = removeItem(draftContent(), "experience", "exp_acme");

    expect(after.experience.map((item) => item.id)).toEqual(["exp_beta"]);
  });

  it("reorders items and ignores moves past either end", () => {
    const before = draftContent();

    expect(moveItem(before, "experience", "exp_beta", -1).experience.map((i) => i.id)).toEqual([
      "exp_beta",
      "exp_acme",
    ]);
    expect(moveItem(before, "experience", "exp_acme", -1)).toEqual(before);
    expect(moveItem(before, "experience", "exp_beta", 1)).toEqual(before);
  });

  it("adds, edits, reorders and deletes bullets with stable unique IDs", () => {
    const start = draftContent();
    const { profile: added, id } = addLine(start, "experience", "exp_acme");
    const edited = updateLine(added, "experience", "exp_acme", id, "Nowy punkt");
    const moved = moveLine(edited, "experience", "exp_acme", id, -1);
    const lines = () => moved.experience[0]?.bullets.map((bullet) => bullet.id);

    expect(findDuplicateIds(collectProfileIds(moved))).toEqual([]);
    expect(lines()).toEqual(["exp_acme_b1", id, "exp_acme_b2"]);
    expect(
      removeLine(moved, "experience", "exp_acme", id).experience[0]?.bullets.map((b) => b.id),
    ).toEqual(["exp_acme_b1", "exp_acme_b2"]);
  });

  it("edits the lines of an 'other' section", () => {
    const { profile, id } = addLine(draftContent(), "otherSections", "oth_hobby");

    expect(profile.otherSections[0]?.items.map((item) => item.id)).toEqual(["oth_hobby_1", id]);
  });
});
