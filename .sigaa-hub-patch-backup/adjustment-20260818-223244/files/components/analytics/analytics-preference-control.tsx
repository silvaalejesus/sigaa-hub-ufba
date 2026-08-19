"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  ANALYTICS_CONSENT_CHANGED_EVENT,
  getStoredAnalyticsConsent,
  storeAnalyticsConsent,
  type AnalyticsConsentValue,
} from "@/lib/analytics/consent";

export function AnalyticsPreferenceControl() {
  const [consent, setConsent] = useState<AnalyticsConsentValue>(null);

  useEffect(() => {
    const syncConsent = () => setConsent(getStoredAnalyticsConsent());

    syncConsent();
    window.addEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, syncConsent);

    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, syncConsent);
    };
  }, []);

  function changeConsent(value: "granted" | "denied") {
    storeAnalyticsConsent(value);
    setConsent(value);
  }

  const currentLabel =
    consent === "granted"
      ? "Analytics autorizado neste navegador."
      : consent === "denied"
        ? "Analytics recusado neste navegador."
        : "Nenhuma preferência de analytics foi salva neste navegador.";

  return (
    <div className="mt-4 rounded-2xl border bg-muted/30 p-4">
      <p className="text-sm text-muted-foreground">{currentLabel}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" onClick={() => changeConsent("granted")}>
          Permitir analytics
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => changeConsent("denied")}
        >
          Não permitir
        </Button>
      </div>
    </div>
  );
}
