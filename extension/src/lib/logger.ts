/* eslint-disable no-console -- the logger is the only module allowed to write to the console */

/** Dev-only console logger for the extension. Never pass CV, job-ad or personal data. */
export const logger = {
  debug: (message: string, ...details: unknown[]) => {
    if (import.meta.env.DEV) console.debug(`[cv-snap] ${message}`, ...details);
  },
  info: (message: string, ...details: unknown[]) => {
    console.info(`[cv-snap] ${message}`, ...details);
  },
  warn: (message: string, ...details: unknown[]) => {
    console.warn(`[cv-snap] ${message}`, ...details);
  },
  error: (message: string, ...details: unknown[]) => {
    console.error(`[cv-snap] ${message}`, ...details);
  },
};
