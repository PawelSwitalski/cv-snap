import { describe, expect, it } from "vitest";
import { buildCvFileName, toAsciiToken } from "./file-name";

describe("buildCvFileName", () => {
  it("builds CV_First_Last_Company.pdf", () => {
    expect(buildCvFileName("Jan Testowy", "Acme")).toBe("CV_Jan_Testowy_Acme.pdf");
  });

  it("transliterates Polish letters, including ł and Ł, to ASCII", () => {
    expect(buildCvFileName("Łukasz Żółć-Gęślą", "Spółka Łódź")).toBe(
      "CV_Lukasz_Zolc_Gesla_Spolka_Lodz.pdf",
    );
    expect(buildCvFileName("Paweł Świątek", null)).toBe("CV_Pawel_Swiatek.pdf");
  });

  it("leaves middle names out", () => {
    expect(buildCvFileName("Jan Maria Testowy", "Acme")).toBe("CV_Jan_Testowy_Acme.pdf");
  });

  it("omits the company when it is unknown or has no usable characters", () => {
    expect(buildCvFileName("Jan Testowy", null)).toBe("CV_Jan_Testowy.pdf");
    expect(buildCvFileName("Jan Testowy", "")).toBe("CV_Jan_Testowy.pdf");
    expect(buildCvFileName("Jan Testowy", "株式会社")).toBe("CV_Jan_Testowy.pdf");
  });

  it("caps the company part at 40 characters without a trailing underscore", () => {
    const name = buildCvFileName("Jan Testowy", `${"Alpha Beta ".repeat(10)}Ltd`);
    const company = name.replace(/^CV_Jan_Testowy_/, "").replace(/\.pdf$/, "");

    expect(company.length).toBeLessThanOrEqual(40);
    expect(company.endsWith("_")).toBe(false);
  });

  it.each([
    ["Jan / Testowy", 'A<c>m:e"|?*\\Corp'],
    ["Jan..Testowy", "../../etc/passwd"],
    ["  Jan   Testowy  ", "Acme, Inc. (Poland) & Co."],
  ])("produces only safe ASCII characters for %j / %j", (fullName, company) => {
    expect(buildCvFileName(fullName, company)).toMatch(/^CV(_[A-Za-z0-9]+)+\.pdf$/);
  });

  it("works for a single name", () => {
    expect(buildCvFileName("Madonna", "Acme")).toBe("CV_Madonna_Acme.pdf");
  });
});

describe("toAsciiToken", () => {
  it("handles letters NFKD can't decompose", () => {
    expect(toAsciiToken("Søren Straße Æsir Œuvre Þór Đorđe")).toBe(
      "Soren_Strasse_AEsir_OEuvre_Thor_Dorde",
    );
  });
});
