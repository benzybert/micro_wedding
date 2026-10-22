import "server-only";
import { headers } from "next/headers";

/** Public origin of this deployment, used to build absolute RSVP links. */
export async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
}
