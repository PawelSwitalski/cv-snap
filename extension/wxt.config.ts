import { EXTENSION_PUBLIC_KEY } from "@cv-snap/shared";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

// See standards/system-architecture.md → Security Patterns for the permission model.
export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [tailwindcss()],
    // The preview chunk loads react-pdf lazily. Pre-bundled at dev-server start, so discovering it
    // on the first result can't make Vite reload the side panel (which would lose the result).
    optimizeDeps: { include: ["@react-pdf/renderer"] },
  }),
  manifest: {
    // Strings come from public/_locales (FR-19); English is the fallback language.
    name: "__MSG_extName__",
    description: "__MSG_extDescription__",
    default_locale: "en",
    // Fixed ID so the native host can allow exactly this extension (story 003-host-install-scripts).
    key: EXTENSION_PUBLIC_KEY,
    permissions: [
      "storage",
      "unlimitedStorage",
      "nativeMessaging",
      "scripting",
      "sidePanel",
      "activeTab",
    ],
    // activeTab only reveals the address of the tab where the icon was clicked, for "Add this site"
    // (bolt 011 decision); reading a page still needs a site the user granted.
    // No host permissions by default: sites are granted one by one by the user (FR-6).
    optional_host_permissions: ["https://*/*"],
    action: { default_title: "__MSG_extName__" },
  },
});
