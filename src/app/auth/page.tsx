import { redirect } from "next/navigation";

// Legacy mock-auth route. Real auth now lives at /sign-in (Clerk).
// Kept as a permanent redirect so any cached link or external bookmark
// still lands users in the right place.
export default function LegacyAuthPage() {
  redirect("/sign-in");
}
