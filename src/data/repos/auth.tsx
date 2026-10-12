import { createContext, type ReactNode, useContext } from "react";
import type { SignInAuth } from "./session";

const SignInAuthContext = createContext<SignInAuth | undefined>(undefined);

export function SignInAuthProvider({ auth, children }: { auth: SignInAuth; children: ReactNode }) {
  return <SignInAuthContext value={auth}>{children}</SignInAuthContext>;
}

export function useSignInAuth(): SignInAuth {
  const auth = useContext(SignInAuthContext);

  if (auth === undefined) throw new Error("useSignInAuth needs a SignInAuthProvider");

  return auth;
}
