import { EXTENSION_PUBLIC_KEY } from "@cv-snap/shared";
import { defineConfig } from "wxt";

// See standards/system-architecture.md → Security Patterns for the permission model.
export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "cv-snap",
    // Fixed ID so the native host can allow exactly this extension (story 003-host-install-scripts).
    key: EXTENSION_PUBLIC_KEY,
    description: "Tailor your CV to the job ad in the current tab with one click.",
    permissions: ["storage", "unlimitedStorage", "nativeMessaging", "scripting", "sidePanel"],
    // No host permissions by default: sites are granted one by one by the user (FR-6).
    optional_host_permissions: ["https://*/*"],
    action: { default_title: "cv-snap" },
  },
});
