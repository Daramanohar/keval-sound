import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import OnboardingClient from "./OnboardingClient";

export const metadata = {
  title: "Welcome to Keval Sound",
  description: "Tell us what you create with so we can tune your catalog.",
};

interface OnboardingMetadata {
  useCase?: string;
  sounds?: string[];
  completedAt?: string;
}

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  // Returning user with onboarding already done? Skip straight to /browse.
  // We read `publicMetadata` (the server-controlled source of truth).
  const user = await currentUser();
  const onboarding = user?.publicMetadata?.onboarding as
    | OnboardingMetadata
    | undefined;

  if (onboarding?.completedAt) {
    redirect("/browse");
  }

  return <OnboardingClient />;
}
