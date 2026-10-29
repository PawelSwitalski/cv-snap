import type { CvProfile } from "@cv-snap/shared";
import { FileUp, PencilLine } from "lucide-react";
import { useStore } from "zustand";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GenerateView, type GenerateViewDeps } from "@/features/generate/GenerateView";
import { useT } from "@/lib/i18n/i18n";

/**
 * Home with a confirmed profile: the generate flow (bolt 011) and the profile actions. Editing or
 * replacing the profile is disabled while a generation runs, so the facts can't change under it.
 */
export function HomeView({
  profile,
  generate,
  onEditProfile,
  onUploadNew,
}: {
  profile: CvProfile;
  generate: GenerateViewDeps;
  onEditProfile: () => void;
  onUploadNew: () => void;
}) {
  const t = useT();
  const isRunning = useStore(generate.store, (state) => state.status.kind === "running");
  return (
    <Card aria-labelledby="home-title">
      <CardHeader>
        <CardTitle id="home-title">{t("home_title")}</CardTitle>
        <CardDescription>{t("home_profile_ready", profile.contact.fullName)}</CardDescription>
      </CardHeader>
      <CardContent>
        <GenerateView deps={generate} profile={profile} />
      </CardContent>
      <CardFooter>
        <Button variant="outline" disabled={isRunning} onClick={onEditProfile}>
          <PencilLine aria-hidden="true" />
          {t("home_edit_profile")}
        </Button>
        <Button variant="ghost" disabled={isRunning} onClick={onUploadNew}>
          <FileUp aria-hidden="true" />
          {t("home_upload_new")}
        </Button>
      </CardFooter>
    </Card>
  );
}
