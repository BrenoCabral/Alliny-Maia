import { checkHealth } from "@/modules/health/service";

// Diagnóstico de conexão, só em desenvolvimento. Em produção a rota não existe.
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new Response(null, { status: 404 });
  }

  const report = await checkHealth();
  return Response.json(report, { status: report.ok ? 200 : 503 });
}
