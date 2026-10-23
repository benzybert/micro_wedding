import { redirect } from "next/navigation";
import { getContext } from "@/lib/session";

export const dynamic = "force-dynamic";

/** No landing page: this is a private tool. Send people where they need to be. */
export default async function Index() {
  const ctx = await getContext();
  redirect(!ctx ? "/onboarding" : !ctx.who ? "/who" : "/home");
}
