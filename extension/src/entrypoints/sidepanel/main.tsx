import "@/assets/tailwind.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createNativeHostClient } from "@/lib/native-host-client";
import { logger } from "@/lib/logger";
import { panelHostClient } from "@/lib/panel-host";
import { indexedDbFileStore } from "@/lib/storage/file-store";
import { chromeLocalStore } from "@/lib/storage/local-store";
import { App } from "./App";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Side panel root element missing");

createRoot(rootElement).render(
  <StrictMode>
    <App
      deps={{
        store: chromeLocalStore,
        files: indexedDbFileStore,
        hostClient: panelHostClient,
        createHostClient: () => createNativeHostClient(),
        browserLanguage: browser.i18n.getUILanguage(),
      }}
    />
  </StrictMode>,
);

if (import.meta.env.DEV) {
  // Startup budget check (story 001: interactive in ≤ 500 ms).
  requestAnimationFrame(() => {
    logger.debug("side panel first frame", Math.round(performance.now()));
  });
  // Dev-only console handle for manual checks (bolts 007/008) until the settings UI exists. On
  // this page, not the service worker: permissions.request needs a user gesture in a document,
  // and DevTools console commands count as one. Removed from production builds.
  void import("./dev-hook").then(({ createDevHook }) => {
    Object.assign(globalThis, { cvSnapDev: createDevHook() });
  });
}
