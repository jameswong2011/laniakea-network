import { createContext, useContext, type ReactNode } from "react";
import type { DeskProfile } from "./floor";

const DeskContext = createContext<DeskProfile | null>(null);

export function DeskProvider({
  profile,
  children,
}: {
  profile: DeskProfile;
  children: ReactNode;
}) {
  return <DeskContext.Provider value={profile}>{children}</DeskContext.Provider>;
}

export function useDesk() {
  const profile = useContext(DeskContext);

  if (!profile) {
    throw new Error("Desk missing");
  }

  return profile;
}
