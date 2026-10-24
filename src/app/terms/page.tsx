import type { Metadata } from "next";
import { copy } from "@/copy";
import { TermsScreen } from "@/features/terms";

export const metadata: Metadata = { title: `${copy.terms.title} · ${copy.appName}` };

export default function TermsPage() {
  return <TermsScreen />;
}
