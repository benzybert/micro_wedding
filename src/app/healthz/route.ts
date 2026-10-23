/** Liveness probe for the host (Railway healthcheck). Touches no data and needs no identity. */
export const dynamic = "force-dynamic";

export function GET() {
  return new Response("ok", { headers: { "cache-control": "no-store", "content-type": "text/plain" } });
}
