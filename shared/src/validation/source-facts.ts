import type { CvDate, CvProfileContent } from "../cv-profile.js";
import { extractFacts, type DateFact, type NumberFact } from "./normalize/facts.js";
import { phraseWords } from "./normalize/text.js";

/** One profile entry a plan line can cite: an item (with its own fields) or a bullet/line. */
interface ProfileEntry {
  /** Texts of the entry's own fields (company, title, name, institution, …). */
  fieldTexts: string[];
  /** Texts of the entry's bullets (items) or the entry's own text (bullets, summary lines). */
  bodyTexts: string[];
  dates: CvDate[];
  isCurrent: boolean;
  companies: string[];
  titles: string[];
  locations: string[];
  /** For a bullet: the item it belongs to (its fields are context of the bullet). */
  parentId: string | null;
}

/** Facts a line may use: those of its cited entries (ddd-01 SourceFactSet). */
export interface SourceFacts {
  numbers: NumberFact[];
  dates: DateFact[];
  hasCurrent: boolean;
  /** Folded word lists of cited companies / titles / locations. */
  companies: string[][];
  titles: string[][];
  locations: string[][];
}

const nonEmpty = (values: (string | null)[]) =>
  values.filter((value): value is string => value !== null && value.trim().length > 0);

/**
 * Index of every citable entry of a profile, built once per validation. Profile-wide lists
 * (companies, titles, locations, texts) feed the rules that look beyond the cited sources.
 */
export class ProfileIndex {
  private readonly entries = new Map<string, ProfileEntry>();
  readonly allCompanies: string[][] = [];
  readonly allTitles: string[][] = [];
  readonly allLocations: string[][] = [];
  readonly allTexts: string[] = [];
  readonly skillNames: string[] = [];
  /** Spoken languages of the profile ("angielski", "English"), for language lines in a skills list. */
  readonly languageNames: string[] = [];

  constructor(profile: CvProfileContent) {
    const addItem = (
      id: string,
      entry: Omit<ProfileEntry, "parentId" | "bodyTexts">,
      bullets: { id: string; text: string }[],
    ) => {
      this.entries.set(id, {
        ...entry,
        bodyTexts: bullets.map((bullet) => bullet.text),
        parentId: null,
      });
      for (const bullet of bullets) {
        this.entries.set(bullet.id, {
          fieldTexts: [],
          bodyTexts: [bullet.text],
          dates: [],
          isCurrent: false,
          companies: [],
          titles: [],
          locations: [],
          parentId: id,
        });
      }
      this.allCompanies.push(...entry.companies.map(phraseWords));
      this.allTitles.push(...entry.titles.map(phraseWords));
      this.allLocations.push(...entry.locations.map(phraseWords));
      this.allTexts.push(...entry.fieldTexts, ...bullets.map((bullet) => bullet.text));
    };
    const dated = (item: {
      startDate: CvDate | null;
      endDate: CvDate | null;
      isCurrent: boolean;
    }) => ({
      dates: nonEmptyDates([item.startDate, item.endDate]),
      isCurrent: item.isCurrent,
    });

    for (const bullet of profile.summary) {
      this.entries.set(bullet.id, {
        fieldTexts: [],
        bodyTexts: [bullet.text],
        dates: [],
        isCurrent: false,
        companies: [],
        titles: [],
        locations: [],
        parentId: null,
      });
      this.allTexts.push(bullet.text);
    }
    for (const item of profile.experience) {
      addItem(
        item.id,
        {
          fieldTexts: nonEmpty([item.company, item.title, item.location, ...item.skills]),
          ...dated(item),
          companies: nonEmpty([item.company]),
          titles: [item.title],
          locations: nonEmpty([item.location]),
        },
        item.bullets,
      );
      this.skillNames.push(...item.skills);
    }
    for (const item of profile.projects) {
      addItem(
        item.id,
        {
          fieldTexts: nonEmpty([item.name, item.role, item.url, ...item.skills]),
          ...dated(item),
          companies: [item.name],
          titles: nonEmpty([item.role]),
          locations: [],
        },
        item.bullets,
      );
      this.skillNames.push(...item.skills);
    }
    for (const item of profile.education) {
      addItem(
        item.id,
        {
          fieldTexts: nonEmpty([item.institution, item.degree, item.field]),
          ...dated(item),
          companies: [item.institution],
          titles: nonEmpty([item.degree, item.field]),
          locations: [],
        },
        item.bullets,
      );
    }
    for (const skill of profile.skills) {
      addItem(
        skill.id,
        {
          fieldTexts: nonEmpty([skill.name, skill.category]),
          dates: [],
          isCurrent: false,
          companies: [],
          titles: [],
          locations: [],
        },
        [],
      );
      this.skillNames.push(skill.name);
    }
    for (const language of profile.languages) {
      this.languageNames.push(language.name);
      addItem(
        language.id,
        {
          fieldTexts: nonEmpty([language.name, language.level]),
          dates: [],
          isCurrent: false,
          companies: [],
          titles: [],
          locations: [],
        },
        [],
      );
    }
    for (const certification of profile.certifications) {
      addItem(
        certification.id,
        {
          fieldTexts: nonEmpty([certification.name, certification.issuer]),
          dates: nonEmptyDates([certification.date]),
          isCurrent: false,
          companies: nonEmpty([certification.issuer]),
          titles: [],
          locations: [],
        },
        [],
      );
    }
    for (const section of profile.otherSections) {
      addItem(
        section.id,
        {
          fieldTexts: [section.title],
          dates: [],
          isCurrent: false,
          companies: [],
          titles: [],
          locations: [],
        },
        section.items,
      );
    }
    this.allLocations.push(...nonEmpty([profile.contact.location]).map(phraseWords));
    if (profile.headline) this.allTexts.push(profile.headline);
  }

  has(id: string): boolean {
    return this.entries.has(id);
  }

  /**
   * Facts of the cited entries. Citing an item covers its fields and all its bullets; citing a
   * bullet covers its text and its item's fields; `implicitParentId` (a plan bullet's own item,
   * ddd-02 decision 2) adds that item's fields only.
   */
  factsFor(sourceIds: readonly string[], implicitParentId: string | null): SourceFacts {
    const texts: string[] = [];
    const facts: SourceFacts = {
      numbers: [],
      dates: [],
      hasCurrent: false,
      companies: [],
      titles: [],
      locations: [],
    };
    const addFields = (entry: ProfileEntry) => {
      texts.push(...entry.fieldTexts);
      facts.dates.push(...entry.dates.map(toDateFact));
      facts.hasCurrent ||= entry.isCurrent;
      facts.companies.push(...entry.companies.map(phraseWords));
      facts.titles.push(...entry.titles.map(phraseWords));
      facts.locations.push(...entry.locations.map(phraseWords));
    };
    for (const id of sourceIds) {
      const entry = this.entries.get(id);
      if (!entry) continue;
      addFields(entry);
      texts.push(...entry.bodyTexts);
      const parent = entry.parentId === null ? undefined : this.entries.get(entry.parentId);
      if (parent) addFields(parent);
    }
    const parent = implicitParentId === null ? undefined : this.entries.get(implicitParentId);
    if (parent) addFields(parent);

    for (const text of texts) {
      const extracted = extractFacts(text);
      facts.numbers.push(...extracted.numbers);
      facts.dates.push(...extracted.dates);
      facts.hasCurrent ||= extracted.hasPresent;
    }
    return facts;
  }
}

function nonEmptyDates(dates: (CvDate | null)[]): CvDate[] {
  return dates.filter((date): date is CvDate => date !== null);
}

function toDateFact(date: CvDate): DateFact {
  return { year: date.year, month: date.month, raw: String(date.year) };
}
