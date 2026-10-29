import type { CvProfile } from "@cv-snap/shared";
import { FileUp, PencilLine, Sparkles } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useT } from "@/lib/i18n/i18n";

/**
 * Home with a confirmed profile. The Generate flow itself arrives in bolt 011; until then the
 * button is shown disabled with a note, so the layout is final.
 */
export function HomeView({
  profile,
  onEditProfile,
  onUploadNew,
}: {
  profile: CvProfile;
  onEditProfile: () => void;
  onUploadNew: () => void;
}) {
  const t = useT();
  const noteId = useId();
  return (
    <Card aria-labelledby="home-title">
      <CardHeader>
        <CardTitle id="home-title">{t("home_title")}</CardTitle>
        <CardDescription>{t("home_profile_ready", profile.contact.fullName)}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button disabled aria-describedby={noteId}>
          <Sparkles aria-hidden="true" />
          {t("generate_button")}
        </Button>
        <p id={noteId} className="text-xs text-muted-foreground">
          {t("generate_coming_soon")}
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" onClick={onEditProfile}>
          <PencilLine aria-hidden="true" />
          {t("home_edit_profile")}
        </Button>
        <Button variant="ghost" onClick={onUploadNew}>
          <FileUp aria-hidden="true" />
          {t("home_upload_new")}
        </Button>
      </CardFooter>
    </Card>
  );
}
