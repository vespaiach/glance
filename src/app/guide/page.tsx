import type { Metadata } from "next";
import { copy } from "@/copy";
import { seasonFor } from "@/domain/season";
import { GuideScreen } from "@/features/guide";

export const metadata: Metadata = { title: `${copy.guide.title} · ${copy.appName}` };

export const revalidate = 86400;

export default function GuidePage() {
  return <GuideScreen season={seasonFor("auto", new Date(), "UTC")} />;
}
