import { connection } from "next/server";

// Endpoint usado por el HEALTHCHECK del Dockerfile.
export async function GET() {
  await connection();

  return Response.json({
    status: "ok",
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}
