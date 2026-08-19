"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect } from "react";

interface GoogleAnalyticsProps {
  measurementId: string;
}

const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/i;
const ANALYTICS_READY_EVENT = "sigaa-hub:analytics-ready";

function AnalyticsPageView({ measurementId }: GoogleAnalyticsProps) {
  const pathname = usePathname();

  useEffect(() => {
    function sendPageView(): boolean {
      if (typeof window.gtag !== "function") return false;

      const pageLocation = `${window.location.origin}${pathname}`;

      window.gtag("config", measurementId, {
        update: true,
        page_location: pageLocation,
        page_title: document.title,
      });
      window.gtag("event", "page_view", {
        page_location: pageLocation,
        page_path: pathname,
        page_title: document.title,
      });

      return true;
    }

    if (sendPageView()) return;

    window.addEventListener(ANALYTICS_READY_EVENT, sendPageView, {
      once: true,
    });

    return () =>
      window.removeEventListener(ANALYTICS_READY_EVENT, sendPageView);
  }, [measurementId, pathname]);

  return null;
}

export function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  const normalizedMeasurementId = measurementId.trim().toUpperCase();

  // Only load Google Analytics in production to avoid dev-only script behaviors
  // (like eval in third-party scripts) triggering CSP report-only violations.
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) return null;

  if (!GA_MEASUREMENT_ID_PATTERN.test(normalizedMeasurementId)) {
    return null;
  }

  const serializedMeasurementId = JSON.stringify(normalizedMeasurementId);

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${normalizedMeasurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics-4" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', ${serializedMeasurementId}, {
            send_page_view: false,
            page_location: window.location.origin + window.location.pathname,
            allow_google_signals: false,
            allow_ad_personalization_signals: false
          });
          window.dispatchEvent(new Event('${ANALYTICS_READY_EVENT}'));
        `}
      </Script>
      <AnalyticsPageView measurementId={normalizedMeasurementId} />
    </>
  );
}
