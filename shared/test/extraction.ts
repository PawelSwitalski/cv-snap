import type { CvProfileExtraction } from "../src/cv-profile.js";

/** A synthetic, ID-less extraction as Claude would return it (fictional person). */
export function extractionFixture(): CvProfileExtraction {
  return {
    sourceLanguage: "pl",
    contact: {
      fullName: "Jan Testowy",
      email: "jan.testowy@example.com",
      phone: null,
      location: "Kraków",
      links: [],
    },
    headline: "Frontend Developer",
    summary: ["Frontend developer z 5-letnim doświadczeniem.", "Lubi testy."],
    experience: [
      {
        company: "Acme Sp. z o.o.",
        title: "Frontend Developer",
        location: "Kraków",
        startDate: { year: 2021, month: 3 },
        endDate: null,
        isCurrent: true,
        bullets: ["Migracja do TypeScript.", "Skrócenie czasu ładowania o 40%."],
        skills: ["React", "TypeScript"],
      },
      {
        company: "Beta Soft",
        title: "Junior Developer",
        location: null,
        startDate: { year: 2019, month: null },
        endDate: { year: 2021, month: 2 },
        isCurrent: false,
        bullets: ["Panele administracyjne w Angular."],
        skills: ["Angular"],
      },
    ],
    projects: [
      {
        name: "cv-snap",
        role: null,
        url: null,
        startDate: null,
        endDate: null,
        isCurrent: true,
        bullets: ["Rozszerzenie Chrome."],
        skills: [],
      },
    ],
    education: [
      {
        institution: "AGH",
        degree: "inż.",
        field: "Informatyka",
        startDate: { year: 2015, month: 10 },
        endDate: { year: 2019, month: 2 },
        isCurrent: false,
        bullets: [],
      },
    ],
    skills: [
      { name: "React", category: null },
      { name: "TypeScript", category: null },
    ],
    languages: [{ name: "angielski", level: "B2" }],
    certifications: [{ name: "AWS Cloud Practitioner", issuer: "AWS", date: null }],
    otherSections: [{ title: "Zainteresowania", items: ["Wspinaczka"] }],
  };
}
