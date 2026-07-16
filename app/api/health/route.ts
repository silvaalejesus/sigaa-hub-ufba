import { executeHealthCheck } from "@/features/status/health";
import { reportServerError } from "@/lib/observability/report-server-error";
import { createPublicServerClient } from "@/lib/supabase/public-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function checkDatabase(): Promise<boolean> {
  const supabase = createPublicServerClient();
  const { data, error } = await supabase.rpc("app_health_check");

  if (error !== null || data !== true) {
    throw new Error("Dependência essencial do health check indisponível.");
  }

  return true;
}

export async function GET(): Promise<Response> {
  return executeHealthCheck(checkDatabase, undefined, (error) => {
    reportServerError(error, "api_health_check");
  });
}
