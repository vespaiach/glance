import type { ReactNode } from "react";
import { DisplayProviders } from "@/shell/DisplayProviders";

export default function DisplayLayout({ children }: { children: ReactNode }) {
  return <DisplayProviders>{children}</DisplayProviders>;
}
