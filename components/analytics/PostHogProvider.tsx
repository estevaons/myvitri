"use client";

import { useEffect } from "react";
import { analytics } from "@/lib/analytics/client";

/** Inicia o PostHog em todas as páginas (pageviews). Não renderiza nada. */
export function PostHogProvider() {
  useEffect(() => {
    analytics();
  }, []);
  return null;
}
