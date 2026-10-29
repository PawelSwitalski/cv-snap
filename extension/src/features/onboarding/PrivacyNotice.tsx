import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/lib/i18n/i18n";

/**
 * First-run privacy notice (FR-2). Also shown again from the header's "Privacy" button; then
 * `onAcknowledge` only closes it.
 */
export function PrivacyNotice({
  onAcknowledge,
  isReview = false,
}: {
  onAcknowledge: () => void;
  isReview?: boolean;
}) {
  const t = useT();
  return (
    <Card aria-labelledby="privacy-title">
      <CardHeader>
        <CardTitle id="privacy-title" className="flex items-center gap-2">
          <ShieldCheck aria-hidden="true" className="size-5" />
          {t("privacy_title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc space-y-2 pl-5 text-sm">
          <li>{t("privacy_point_anthropic")}</li>
          <li>{t("privacy_point_no_server")}</li>
          <li>{t("privacy_point_local")}</li>
          <li>{t("privacy_point_logs")}</li>
        </ul>
      </CardContent>
      <CardFooter>
        <Button onClick={onAcknowledge}>
          {isReview ? t("privacy_close") : t("privacy_acknowledge")}
        </Button>
      </CardFooter>
    </Card>
  );
}
