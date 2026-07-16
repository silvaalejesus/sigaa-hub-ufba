export type HealthCheck = () => Promise<boolean>;

export async function executeHealthCheck(
  check: HealthCheck,
  now: () => Date = () => new Date(),
  onError?: (error: unknown) => void,
): Promise<Response> {
  let healthy = false;

  try {
    healthy = await check();
  } catch (error) {
    healthy = false;
    onError?.(error);
  }

  return Response.json(
    {
      status: healthy ? "ok" : "degraded",
      timestamp: now().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}
