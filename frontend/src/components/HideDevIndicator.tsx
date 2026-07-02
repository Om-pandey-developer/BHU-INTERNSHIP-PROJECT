"use client";
import { useEffect } from "react";

export default function HideDevIndicator() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    // Next.js injects the dev indicator into a shadow DOM inside <nextjs-portal>.
    // This hack periodically checks for it and hides the specific dev tools button.
    const interval = setInterval(() => {
      const portals = document.querySelectorAll("nextjs-portal");
      portals.forEach(portal => {
        if (portal.shadowRoot) {
          if (!portal.shadowRoot.querySelector('#hide-devtools-style')) {
            const style = document.createElement("style");
            style.id = 'hide-devtools-style';
            // Target the DevTools toast or button to hide it
            style.innerHTML = `
              [data-nextjs-toast], 
              .nextjs-toast, 
              button[title="Next.js DevTools"],
              [data-nextjs-dev-tools-button] {
                display: none !important;
              }
            `;
            portal.shadowRoot.appendChild(style);
          }
        }
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return null;
}
