import { appendFileSync, mkdirSync, renameSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Structured JSON-lines logger for the native host.
 *
 * stdout is the Chrome native-messaging channel, so log lines go to **stderr** and a rotating
 * file, never stdout. Never log CV contents, job-ad text, generated text or personal data; log
 * codes, sizes, durations and request IDs instead (coding standards → Logging).
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

export type LogSink = (line: string) => void;

export const stderrSink: LogSink = (line) => {
  process.stderr.write(`${line}\n`);
};

export function createLogger(minLevel: LogLevel = "info", write: LogSink = stderrSink): Logger {
  const log = (level: LogLevel, message: string, fields: LogFields = {}) => {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;
    try {
      write(JSON.stringify({ time: new Date().toISOString(), level, message, ...fields }));
    } catch {
      // Logging must never break the host.
    }
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

export interface RotatingFileOptions {
  directory: string;
  fileName?: string;
  maxBytes?: number;
  /** Rotated files kept besides the current one (`host.1.log` … `host.N.log`). */
  maxFiles?: number;
}

/** File sink that rotates at `maxBytes` (default 5 × 1 MB). Errors are swallowed. */
export function createRotatingFileSink({
  directory,
  fileName = "host.log",
  maxBytes = 1024 * 1024,
  maxFiles = 4,
}: RotatingFileOptions): LogSink {
  const current = join(directory, fileName);
  const rotated = (index: number) =>
    join(directory, fileName.replace(/\.log$/, `.${String(index)}.log`));
  let isReady = false;
  return (line) => {
    try {
      if (!isReady) {
        mkdirSync(directory, { recursive: true });
        isReady = true;
      }
      if (fileSize(current) >= maxBytes) {
        rmSync(rotated(maxFiles), { force: true });
        for (let index = maxFiles - 1; index >= 1; index--) {
          if (fileSize(rotated(index)) >= 0) renameSync(rotated(index), rotated(index + 1));
        }
        renameSync(current, rotated(1));
      }
      appendFileSync(current, `${line}\n`);
    } catch {
      // A broken log file must never break the host.
    }
  };
}

function fileSize(path: string): number {
  try {
    return statSync(path).size;
  } catch {
    return -1;
  }
}

/** Writes each line to every sink. */
export function teeSinks(...sinks: LogSink[]): LogSink {
  return (line) => {
    for (const sink of sinks) sink(line);
  };
}
