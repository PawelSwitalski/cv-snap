import { createNativeHostClient, type NativeHostClient } from "@/lib/native-host-client";

let client: NativeHostClient | undefined;

/**
 * The side panel's long-lived native-host connection, opened on first use (not at panel start).
 * Closing the panel closes the port, which makes the host abort running work (bolt 003).
 */
export function panelHostClient(): NativeHostClient {
  client ??= createNativeHostClient();
  return client;
}
