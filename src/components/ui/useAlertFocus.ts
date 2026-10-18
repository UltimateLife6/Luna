"use client";

import { useEffect, useRef } from "react";

export function useAlertFocus(errors: readonly string[]) {
  const node = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (errors.length > 0) {
      node.current?.focus();
    }
  }, [errors]);

  return (element: HTMLElement | null) => {
    node.current = element;
  };
}
