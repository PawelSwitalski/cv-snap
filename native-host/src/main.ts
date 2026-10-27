#!/usr/bin/env node
import { NATIVE_HOST_NAME, promptBuilders } from "@cv-snap/shared";
import { checkHealth } from "./health/check-health.js";
import { createLogger, createRotatingFileSink, stderrSink, teeSinks } from "./lib/logger.js";
import { logDir } from "./lib/paths.js";
import { extractPdfText } from "./pdf/extract-text.js";
import { runHost } from "./protocol/host.js";
import { ClaudeCodeProvider } from "./providers/claude-code-provider.js";
import { HOST_VERSION } from "./version.js";

const logger = createLogger(
  process.env.CV_SNAP_LOG_LEVEL === "debug" ? "debug" : "info",
  teeSinks(stderrSink, createRotatingFileSink({ directory: logDir() })),
);

// stdout carries protocol frames only. Route any console output from dependencies to the log.
/* eslint-disable no-console -- redirecting, not using, the console */
// Only the part count is logged: dependency output could contain CV or job-ad text.
const redirectTo =
  (level: "debug" | "warn") =>
  (...args: unknown[]) => {
    logger[level]("console output redirected", { parts: args.length });
  };
console.log = redirectTo("debug");
console.info = redirectTo("debug");
console.debug = redirectTo("debug");
console.warn = redirectTo("warn");
console.error = redirectTo("warn");
/* eslint-enable no-console */

process.on("uncaughtException", (error) => {
  logger.error("uncaught exception", { name: error.name });
});
process.on("unhandledRejection", () => {
  logger.error("unhandled rejection");
});

// Every AI step runs through the user's Claude Code with the shared prompts (bolt 005).
const provider = new ClaudeCodeProvider({ prompts: promptBuilders });

logger.info("host started", { host: NATIVE_HOST_NAME, version: HOST_VERSION, pid: process.pid });

await runHost({
  input: process.stdin,
  output: process.stdout,
  logger,
  handlers: {
    health: (_request, { signal }) => checkHealth({ signal }),
    extractPdfText: (request, { signal, progress }) => {
      progress("extracting-pdf-text");
      return extractPdfText(request.pdfBase64, { signal });
    },
    createProfile: (request, { signal, progress }) =>
      provider.createProfile(
        { cvText: request.cvText },
        { model: request.model, signal, onProgress: progress },
      ),
    parseRequirements: (request, { signal, progress }) =>
      provider.parseRequirements(
        {
          adText: request.adText,
          url: request.url,
          structuredFields: request.structuredFields ?? null,
        },
        { model: request.model, signal, onProgress: progress },
      ),
    tailor: (request, { signal, progress }) =>
      provider.tailor(
        {
          profile: request.profile,
          requirements: request.requirements,
          outputLanguage: request.outputLanguage,
          validatorFeedback: request.validatorFeedback,
        },
        { model: request.model, signal, onProgress: progress },
      ),
  },
});

logger.info("host stopped");
