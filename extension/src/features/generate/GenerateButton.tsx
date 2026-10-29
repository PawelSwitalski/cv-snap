import { Globe, MousePointerClick, Plus, Sparkles } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AddSiteResult } from "@/features/allowed-sites/allowed-sites";
import { useT } from "@/lib/i18n/i18n";
import type { MessageKey } from "@/lib/i18n/messages";
import type { PageState } from "./page-state";

/**
 * The one button of the generate flow (story 005). It adapts to the page: Generate on an allowed
 * page (with a selection hint when no ad was detected: the content script then takes the user's
 * selection, FR-8), "Add this site" on an unlisted one, or a disabled button with the reason.
 */
export function GenerateButton({
  pageState,
  isProfileConfirmed,
  onGenerate,
  onAddSite,
}: {
  pageState: PageState;
  isProfileConfirmed: boolean;
  onGenerate: (tabId: number) => void;
  /** Must call `permissions.request` synchronously (user gesture). */
  onAddSite: (url: string) => Promise<AddSiteResult>;
}) {
  const t = useT();
  const noteId = useId();
  const [addProblem, setAddProblem] = useState<MessageKey | null>(null);

  const note = (key: MessageKey | null, role?: "status") =>
    key ? (
      <p id={noteId} role={role} className="text-xs text-muted-foreground">
        {t(key)}
      </p>
    ) : null;

  if (!isProfileConfirmed) {
    return (
      <div className="flex flex-col gap-1">
        <Button disabled aria-describedby={noteId}>
          <Sparkles aria-hidden="true" />
          {t("generate_button")}
        </Button>
        {note("generate_confirm_first")}
      </div>
    );
  }

  switch (pageState.kind) {
    case "site-not-allowed": {
      const { url } = pageState;
      return (
        <div className="flex flex-col gap-1">
          <Button
            aria-describedby={noteId}
            onClick={() => {
              setAddProblem(null);
              // No await before this call: Chrome needs the click's user gesture.
              void onAddSite(url).then((result) => {
                if (!result.ok)
                  setAddProblem(
                    result.reason === "DENIED" ? "generate_add_denied" : "generate_add_failed",
                  );
              });
            }}
          >
            <Plus aria-hidden="true" />
            {t("generate_add_site")}
          </Button>
          {note(addProblem ?? "generate_add_site_note", addProblem ? "status" : undefined)}
        </div>
      );
    }
    case "ad-detected":
    case "no-ad": {
      const { tabId } = pageState;
      return (
        <div className="flex flex-col gap-1">
          <Button
            aria-describedby={pageState.kind === "no-ad" ? noteId : undefined}
            onClick={() => {
              onGenerate(tabId);
            }}
          >
            <Sparkles aria-hidden="true" />
            {t("generate_button")}
          </Button>
          {pageState.kind === "no-ad" ? (
            <p id={noteId} className="flex items-center gap-1 text-xs text-muted-foreground">
              <MousePointerClick aria-hidden="true" className="size-3.5 shrink-0" />
              {t("generate_select_hint")}
            </p>
          ) : null}
        </div>
      );
    }
    default: {
      const reason: MessageKey =
        pageState.kind === "unknown-site"
          ? "generate_click_icon"
          : pageState.kind === "unsupported"
            ? "generate_unsupported_page"
            : "generate_no_tab";
      return (
        <div className="flex flex-col gap-1">
          <Button disabled aria-describedby={noteId}>
            <Globe aria-hidden="true" />
            {t("generate_button")}
          </Button>
          {note(reason)}
        </div>
      );
    }
  }
}
