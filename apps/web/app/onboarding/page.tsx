import { redirect } from "next/navigation";
import { getSessionState } from "../../lib/session";

export const dynamic = "force-dynamic";

export default async function OnboardingRedirectPage() {
  const session = await getSessionState();

  if (!session) {
    redirect("/");
  }

  redirect(`/u/${session.viewer.handle}`);
}
