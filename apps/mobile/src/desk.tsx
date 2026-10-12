import { createContext, useContext, type ReactNode } from "react";
import type { DeskProfile } from "./floor";

const DeskContext = createContext<DeskProfile | null>(null);
const DeskRefreshContext = createContext<() => Promise<void>>(async () => {});
const DeskChangedContext = createContext(0);

export function DeskProvider({
  profile,
  refresh,
  changedAt,
  children,
}: {
  profile: DeskProfile;
  refresh: () => Promise<void>;
  changedAt: number;
  children: ReactNode;
}) {
  return (
    <DeskRefreshContext.Provider value={refresh}>
      <DeskChangedContext.Provider value={changedAt}>
        <DeskContext.Provider value={profile}>{children}</DeskContext.Provider>
      </DeskChangedContext.Provider>
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

export function useDeskChangedAt() {
  return useContext(DeskChangedContext);
}
