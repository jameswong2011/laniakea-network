import { createContext, useContext, type ReactNode } from "react";
import type { DeskProfile } from "./floor";

const DeskContext = createContext<DeskProfile | null>(null);
const DeskRefreshContext = createContext<() => Promise<void>>(async () => {});

export function DeskProvider({
  profile,
  refresh,
  children,
}: {
  profile: DeskProfile;
  refresh: () => Promise<void>;
  children: ReactNode;
}) {
  return (
    <DeskRefreshContext.Provider value={refresh}>
      <DeskContext.Provider value={profile}>{children}</DeskContext.Provider>
    </DeskRefreshContext.Provider>
  );
}

export function useDesk() {
  const profile = useContext(DeskContext);

  if (!profile) {
    throw new Error("User missing");
  }

  return profile;
}

export function useDeskRefresh() {
  return useContext(DeskRefreshContext);
}
