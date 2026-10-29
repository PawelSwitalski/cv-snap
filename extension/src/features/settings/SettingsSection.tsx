import { useId, type ReactNode } from "react";
import { useT } from "@/lib/i18n/i18n";
import type { MessageKey } from "@/lib/i18n/messages";

/** One titled group of the settings screen (a labelled region). */
export function SettingsSection({
  heading,
  children,
}: {
  heading: MessageKey;
  children: ReactNode;
}) {
  const t = useT();
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2 rounded-md border p-3">
      <h3 id={headingId} className="text-sm font-semibold">
        {t(heading)}
      </h3>
      {children}
    </section>
  );
}
