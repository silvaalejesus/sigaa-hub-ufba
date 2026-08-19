"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { Button } from "@/components/ui/button";
import {
  ANALYTICS_CONSENT_CHANGED_EVENT,
  getStoredAnalyticsConsent,
  storeAnalyticsConsent,
  type AnalyticsConsentValue,
} from "@/lib/analytics/consent";

interface AnalyticsConsentProps {
  measurementId: string;
}

export function AnalyticsConsent({ measurementId }: AnalyticsConsentProps) {
  const [consent, setConsent] = useState<AnalyticsConsentValue>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const syncConsent = () => setConsent(getStoredAnalyticsConsent());

    syncConsent();
    setHydrated(true);
    window.addEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, syncConsent);

    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, syncConsent);
    };
  }, []);

  function chooseConsent(value: "granted" | "denied") {
    storeAnalyticsConsent(value);
    setConsent(value);
  }

  if (!hydrated) return null;

  return (
    <>
      {consent === "granted" ? (
        <GoogleAnalytics measurementId={measurementId} />
      ) : null}

      {consent === null ? (
        <aside
          className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-3xl rounded-2xl border bg-background/95 p-4 shadow-xl backdrop-blur md:p-5"
          aria-label="Preferências de analytics"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <p className="text-sm font-semibold">Analytics opcional</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                O SIGAA Hub usa o Google Analytics 4 para entender o uso da
                plataforma. A coleta só começa se você aceitar.{" "}
                <Link
                  href="/privacidade"
                  className="font-medium text-foreground underline underline-offset-2"
                >
                  Ver política de privacidade
                </Link>
                .
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => chooseConsent("denied")}
              >
                Recusar
              </Button>
              <Button type="button" onClick={() => chooseConsent("granted")}>
                Aceitar analytics
              </Button>
            </div>
          </div>
        </aside>
      ) : null}
    </>
  );
}
