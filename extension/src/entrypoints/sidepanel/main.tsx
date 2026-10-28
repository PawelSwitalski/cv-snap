import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Side panel root element missing");

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Dev-only console handle for the manual allowed-sites check (bolt 007) until the settings UI
// exists. On this page, not the service worker: permissions.request needs a user gesture in a
// document, and DevTools console commands count as one. Removed from production builds.
if (import.meta.env.DEV) {
  void import("./dev-hook").then(({ createDevHook }) => {
    Object.assign(globalThis, { cvSnapDev: createDevHook() });
  });
}
