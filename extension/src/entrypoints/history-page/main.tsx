import "@/assets/tailwind.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SavedPage } from "@/features/history/SavedPage";
import { indexedDbHistoryRepository } from "@/features/history/history-repository";
import { I18nProvider } from "@/lib/i18n/i18n";
import { chromeLocalStore } from "@/lib/storage/local-store";

/** A saved job-ad page from the history (story 004-open-saved-files): `history-page.html?id=…`. */
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("History page root element missing");

createRoot(rootElement).render(
  <StrictMode>
    <I18nProvider store={chromeLocalStore} browserLanguage={browser.i18n.getUILanguage()}>
      <SavedPage
        adKey={new URLSearchParams(location.search).get("id") ?? ""}
        history={indexedDbHistoryRepository}
      />
    </I18nProvider>
  </StrictMode>,
);
