"use client";

import { useEffect, useRef } from "react";

const TURNSTILE_SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: Record<string, unknown>,
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let turnstileLoader: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Turnstile requires a browser."));
  }

  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }

  if (turnstileLoader) return turnstileLoader;

  turnstileLoader = new Promise<TurnstileApi>((resolve, reject) => {
    const resolveApi = () => {
      if (window.turnstile) {
        resolve(window.turnstile);
        return;
      }

      reject(new Error("Turnstile API unavailable after script load."));
    };

    const rejectLoad = () => {
      turnstileLoader = null;
      reject(new Error("Failed to load Turnstile."));
    };

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${TURNSTILE_SCRIPT_URL}"]`,
    );

    if (existing) {
      existing.addEventListener("load", resolveApi, { once: true });
      existing.addEventListener("error", rejectLoad, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", resolveApi, { once: true });
    script.addEventListener("error", rejectLoad, { once: true });
    document.head.appendChild(script);
  });

  return turnstileLoader;
}

interface TurnstileWidgetProps {
  onTokenChange: (token: string) => void;
  resetNonce: number;
}

export function TurnstileWidget({
  onTokenChange,
  resetNonce,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const configuredSiteKey =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || "";
  const siteKey =
    configuredSiteKey ||
    (process.env.NODE_ENV !== "production" ? TURNSTILE_TEST_SITE_KEY : "");

  useEffect(() => {
    let cancelled = false;

    if (!siteKey || !containerRef.current) {
      onTokenChange("");
      return;
    }

    void loadTurnstile()
      .then((api) => {
        if (cancelled || !containerRef.current || widgetIdRef.current) return;

        widgetIdRef.current = api.render(containerRef.current, {
          sitekey: siteKey,
          action: "add_link",
          theme: "auto",
          callback: (token: string) => onTokenChange(token),
          "expired-callback": () => onTokenChange(""),
          "timeout-callback": () => onTokenChange(""),
          "error-callback": () => {
            onTokenChange("");
            return true;
          },
        });
      })
      .catch(() => {
        if (!cancelled) onTokenChange("");
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [onTokenChange, siteKey]);

  useEffect(() => {
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
      onTokenChange("");
    }
  }, [onTokenChange, resetNonce]);

  if (!siteKey) {
    return (
      <p className="text-xs text-destructive">
        A verificação antirobô não está configurada. Tente novamente mais tarde.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium">Verificação antirobô</p>
      <div ref={containerRef} />
    </div>
  );
}
