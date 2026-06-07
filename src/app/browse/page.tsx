import { redirect } from "next/navigation";

// `/browse` is the post-sign-in landing target (per NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL).
// The authenticated home experience already lives at `/` — when a signed-in
// user hits `/`, page.tsx renders `<AuthenticatedHome />` automatically. So
// /browse just forwards there and avoids duplicating the homepage layout.
export default function BrowsePage() {
  redirect("/");
}
