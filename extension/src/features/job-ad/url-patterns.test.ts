import { describe, expect, it } from "vitest";
import { matchJobAdUrl } from "./url-patterns";

describe("matchJobAdUrl", () => {
  it.each([
    ["linkedin", "https://www.linkedin.com/jobs/view/4012345678/"],
    ["linkedin", "https://pl.linkedin.com/jobs/view/frontend-developer-at-acme-4012345678"],
    ["indeed", "https://www.indeed.com/viewjob?jk=abc123def456"],
    ["indeed", "https://de.indeed.com/m/viewjob?jk=abc123"],
    ["indeed", "https://pl.indeed.com/jobs?q=java&vjk=1&jk=0a1b2c3d"],
    ["pracuj", "https://www.pracuj.pl/praca/frontend-developer-krakow,oferta,1003456789"],
    ["justjoin", "https://justjoin.it/job-offer/acme-senior-frontend-developer-krakow-react"],
    ["nofluffjobs", "https://nofluffjobs.com/pl/job/senior-frontend-developer-acme-krakow"],
    ["nofluffjobs", "https://nofluffjobs.com/job/senior-frontend-developer-acme"],
    ["bulldogjob", "https://bulldogjob.pl/companies/jobs/123456-frontend-developer-krakow"],
    [
      "stepstone",
      "https://www.stepstone.de/stellenangebote--Frontend-Entwickler-Berlin-Acme--1234567-inline.html",
    ],
    [
      "theprotocol",
      "https://theprotocol.it/szczegoly/praca/java-developer-acme-krakow,oferta,a1b2c3d4",
    ],
  ])("recognises a %s job-ad URL", (preset, url) => {
    expect(matchJobAdUrl(url)).toBe(preset);
  });

  it.each([
    "https://www.linkedin.com/jobs/search/?keywords=java",
    "https://www.linkedin.com/feed/",
    "https://www.indeed.com/jobs?q=java&l=Krakow",
    "https://www.indeed.com/q-java-jobs.html",
    "https://www.pracuj.pl/praca/java;kw",
    "https://justjoin.it/job-offers/all-locations/java",
    "https://justjoin.it/",
    "https://nofluffjobs.com/pl/praca-it/java",
    "https://bulldogjob.pl/companies/jobs",
    "https://www.stepstone.de/jobs/java/in-berlin",
    "https://theprotocol.it/filtry/java;t",
    "https://theprotocol.it/szczegoly/praca/",
    "https://theprotocol.it/",
    "http://justjoin.it/job-offer/plain-http-is-not-allowed",
  ])("does not match search, listing or other pages: %s", (url) => {
    expect(matchJobAdUrl(url)).toBeNull();
  });
});
