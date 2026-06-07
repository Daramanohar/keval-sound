import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import OnboardingClient from "./OnboardingClient";

export const metadata = {
  title: "Welcome to Keval Sound",
  description: "Tell us what you create with so we can tune your catalog.",
};

export default async function OnboardingPage() {
  // Belt-and-braces: middleware already protects /onboarding, but this
  // also makes the redirect explicit if someone changes the matcher.
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  return <OnboardingClient />;
}
