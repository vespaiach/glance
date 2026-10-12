import { createContext, type ReactNode, useContext } from "react";
import type { SignedOutAccount, SignInAuth } from "./session";

const SignInAuthContext = createContext<SignInAuth | undefined>(undefined);

export function SignInAuthProvider({ auth, children }: { auth: SignInAuth; children: ReactNode }) {
  return <SignInAuthContext value={auth}>{children}</SignInAuthContext>;
}

export function useSignInAuth(): SignInAuth {
  const auth = useContext(SignInAuthContext);

  if (auth === undefined) throw new Error("useSignInAuth needs a SignInAuthProvider");

  return auth;
}

const SignedOutAccountContext = createContext<SignedOutAccount | undefined>(undefined);

export function SignedOutAccountProvider({
  account,
  children,
}: {
  account: SignedOutAccount | undefined;
  children: ReactNode;
}) {
  return <SignedOutAccountContext value={account}>{children}</SignedOutAccountContext>;
}

export function useSignedOutAccount(): SignedOutAccount | undefined {
  return useContext(SignedOutAccountContext);
}
