import * as Sentry from "@sentry/nextjs";

export function reportServerError(error: unknown, operation: string): void {
  Sentry.withScope((scope) => {
    scope.setTag("status.operation", operation);
    Sentry.captureException(error);
  });
}
