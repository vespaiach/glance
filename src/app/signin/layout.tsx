import type { ReactNode } from "react";
import { SignedOutProviders } from "@/shell/SignedOutProviders";

export default function SignInLayout({ children }: { children: ReactNode }) {
  return <SignedOutProviders>{children}</SignedOutProviders>;
}
