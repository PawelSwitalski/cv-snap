#!/usr/bin/env node
import { NATIVE_HOST_NAME } from "@cv-snap/shared";
import { logger } from "./lib/logger.js";

// Placeholder entry point: the stdio protocol arrives in story 002-native-messaging-protocol.
logger.info("host started", { host: NATIVE_HOST_NAME, pid: process.pid });
