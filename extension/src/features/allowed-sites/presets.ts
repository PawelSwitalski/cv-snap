/**
 * One-click job-board presets (FR-6). Each grants HTTPS access to its origins only.
 * Subdomain wildcards where boards serve ads from subdomains (pl.linkedin.com, de.indeed.com…).
 */
export const SITE_PRESETS = [
  { id: "linkedin", label: "LinkedIn", patterns: ["https://*.linkedin.com/*"] },
  { id: "indeed", label: "Indeed", patterns: ["https://*.indeed.com/*"] },
  { id: "pracuj", label: "Pracuj.pl", patterns: ["https://*.pracuj.pl/*"] },
  { id: "justjoin", label: "justjoin.it", patterns: ["https://justjoin.it/*"] },
  { id: "nofluffjobs", label: "NoFluffJobs", patterns: ["https://nofluffjobs.com/*"] },
  { id: "bulldogjob", label: "Bulldogjob", patterns: ["https://bulldogjob.pl/*"] },
  { id: "stepstone", label: "StepStone", patterns: ["https://*.stepstone.de/*"] },
  { id: "theprotocol", label: "theprotocol.it", patterns: ["https://theprotocol.it/*"] },
] as const;

export type SitePreset = (typeof SITE_PRESETS)[number];
export type PresetId = SitePreset["id"];

export function findPreset(id: string): SitePreset | undefined {
  return SITE_PRESETS.find((preset) => preset.id === id);
}

/** The preset that owns a granted match pattern, if any. */
export function presetForPattern(pattern: string): SitePreset | undefined {
  return SITE_PRESETS.find((preset) => (preset.patterns as readonly string[]).includes(pattern));
}
