import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useDeskChangedAt } from "./desk";

const STALE_MS = 60_000;

export function useFocusRefresh(load: () => Promise<void>, staleMs = STALE_MS) {
  const changedAt = useDeskChangedAt();
  const loaded = useRef<{ load: (() => Promise<void>) | null; at: number }>({ load: null, at: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(() => {
    loaded.current = { load, at: Date.now() };
    return load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      const last = loaded.current;

      if (last.load === load && changedAt <= last.at && Date.now() - last.at < staleMs) {
        return;
      }

      void reload().catch(() => undefined);
    }, [changedAt, load, reload, staleMs])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void reload()
      .catch(() => undefined)
      .finally(() => setRefreshing(false));
  }, [reload]);

  return { reload, refreshing, onRefresh };
}
