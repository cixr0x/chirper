"use client";

import { useLayoutEffect } from "react";

export function RouteAnnouncerGuard() {
  useLayoutEffect(() => {
    const normalizeEmptyAlerts = () => {
      const alerts = document.querySelectorAll<HTMLElement>('[role="alert"], [data-chirper-empty-live-region="true"]');

      for (const element of Array.from(alerts)) {
        if (element.textContent?.trim()) {
          if (element.dataset.chirperEmptyLiveRegion) {
            element.setAttribute("role", "alert");
            element.removeAttribute("aria-hidden");
            delete element.dataset.chirperEmptyLiveRegion;
          }
          continue;
        }

        element.removeAttribute("role");
        element.setAttribute("aria-live", "polite");
        element.setAttribute("aria-hidden", "true");
        element.dataset.chirperEmptyLiveRegion = "true";
      }
    };

    normalizeEmptyAlerts();
    const observer = new MutationObserver(normalizeEmptyAlerts);
    observer.observe(document.body, { characterData: true, childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
