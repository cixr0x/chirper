import HomePage from "../page";
import { SignedOutGate } from "../../components/signed-out-gate";
import { getSessionState } from "../../lib/session";

export const dynamic = "force-dynamic";

type HomeAliasPageProps = {
  searchParams?: Promise<{
    auth?: string;
    account?: string;
    feedTrail?: string;
    redirectTo?: string;
    view?: string;
  }>;
};

export default async function HomeAliasPage(props: HomeAliasPageProps) {
  const session = await getSessionState();

  if (!session) {
    return (
      <SignedOutGate
        active="home"
        copy="Sign in to view your timeline, post updates, and keep following the accounts you care about."
        returnTo="/home"
        title="Sign in to view your timeline"
      />
    );
  }

  return <HomePage {...props} />;
}
