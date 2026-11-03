import { HISTORY_SCHEMA_VERSION, type HistoryEntry } from "@/features/history/history-entry";

/** A valid history entry (intent 004); override what a test is about. */
export function historyEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    schemaVersion: HISTORY_SCHEMA_VERSION,
    adKey: "https://jobs.example.com/1#abc",
    title: "Senior Frontend Developer",
    company: "Acme",
    url: "https://jobs.example.com/1",
    isManualSelection: false,
    outputLanguage: "pl",
    fileName: "CV_Jan_Testowy_Acme.pdf",
    createdAt: "2026-11-01T10:00:00.000Z",
    lastDownloadedAt: "2026-11-01T10:00:00.000Z",
    sentOn: null,
    snapshot: "saved",
    sizes: { pdf: 4, snapshot: 13, adText: 7 },
    ...overrides,
  };
}
