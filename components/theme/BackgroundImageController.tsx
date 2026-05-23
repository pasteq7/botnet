"use client";

import { useEffect } from "react";

type InterfaceSettings = {
  background_image_enabled?: boolean;
  background_image_url?: string | null;
};

function applyBackground(settings: InterfaceSettings) {
  if (settings.background_image_url) {
    document.body.style.setProperty("--app-background-image", `url(${settings.background_image_url})`);
  } else {
    document.body.style.removeProperty("--app-background-image");
  }
}

export function BackgroundImageController() {
  useEffect(() => {
    let cancelled = false;

    fetch("/api/interface")
      .then((res) => (res.ok ? res.json() : null))
      .then((settings: InterfaceSettings | null) => {
        if (!cancelled && settings) applyBackground(settings);
      })
      .catch(() => {
        if (!cancelled) applyBackground({ background_image_enabled: true, background_image_url: null });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
