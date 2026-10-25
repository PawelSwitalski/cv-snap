/**
 * Structured JSON-lines logger for the native host.
 *
 * stdout is the Chrome native-messaging channel, so every log line goes to **stderr**.
 * Never log CV contents, job-ad text, generated text or personal data; log codes, sizes,
 * durations and request IDs instead (coding standards → Logging).
 * A rotating log file is added with the protocol in story 002-native-messaging-protocol.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export type LogFields = Record<string, string | number | boolean | null | undefined>;

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}

export function createLogger(
  minLevel: LogLevel = "info",
  write: (line: string) => void = (line) => {
    process.stderr.write(`${line}\n`);
  },
): Logger {
  const log = (level: LogLevel, message: string, fields: LogFields = {}) => {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;
    write(JSON.stringify({ time: new Date().toISOString(), level, message, ...fields }));
  };
  return {
    debug: (message, fields) => {
      log("debug", message, fields);
    },
    info: (message, fields) => {
      log("info", message, fields);
    },
    warn: (message, fields) => {
      log("warn", message, fields);
    },
    error: (message, fields) => {
      log("error", message, fields);
    },
  };
}

export const logger = createLogger(process.env.CV_SNAP_LOG_LEVEL === "debug" ? "debug" : "info");
