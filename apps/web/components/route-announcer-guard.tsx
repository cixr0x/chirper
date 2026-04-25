"use client";

import { useEffect } from "react";

export function RouteAnnouncerGuard() {
  useEffect(() => {
    const normalizeEmptyAlerts = () => {
      for (const element of Array.from(document.querySelectorAll<HTMLElement>('[role="alert"]'))) {
        if (element.textContent?.trim()) {
          continue;
        }

        element.removeAttribute("role");
        element.setAttribute("aria-live", "polite");
        element.dataset.chirperEmptyLiveRegion = "true";
      }
    };

    normalizeEmptyAlerts();
    const observer = new MutationObserver(normalizeEmptyAlerts);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
