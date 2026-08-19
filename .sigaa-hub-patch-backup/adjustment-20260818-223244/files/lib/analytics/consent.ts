export const ANALYTICS_CONSENT_STORAGE_KEY =
  "sigaa-hub-analytics-consent-v1";

export const ANALYTICS_CONSENT_CHANGED_EVENT =
  "sigaa-hub:analytics-consent-changed";

export type AnalyticsConsentValue = "granted" | "denied" | null;

export function getStoredAnalyticsConsent(): AnalyticsConsentValue {
  if (typeof window === "undefined") return null;

  const storedValue = window.localStorage.getItem(
    ANALYTICS_CONSENT_STORAGE_KEY,
  );

  if (storedValue === "granted" || storedValue === "denied") {
    return storedValue;
  }

  return null;
}

export function storeAnalyticsConsent(
  value: Exclude<AnalyticsConsentValue, null>,
): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, value);
  window.dispatchEvent(new Event(ANALYTICS_CONSENT_CHANGED_EVENT));
}
