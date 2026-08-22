"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/** Refresh server data without blocking the click. */
export function useSilentRefresh() {
  const router = useRouter();
  const [, start] = useTransition();

  return () => {
    start(() => {
      router.refresh();
    });
  };
}
