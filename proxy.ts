// Next.js 16 renamed `middleware.ts` to `proxy.ts`. Clerk's clerkMiddleware
// still works here — same Edge runtime signature.
// TODO(security): add Cloudflare Turnstile / Clerk bot protection in a
// follow-up milestone. Auth comes first; bot protection layers on top.
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/browse(.*)",
  "/player(.*)",
  "/explore(.*)",
  "/packs(.*)",
  "/pack(.*)",
  "/samples(.*)",
  "/song(.*)",
  "/account(.*)",
  "/cart(.*)",
  "/onboarding(.*)",
  "/api/protected(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals, static assets, and the media stream API so
    // MP3 preview flow keeps working without Clerk gating.
    "/((?!_next/|_next/static|_next/image|favicon.ico|logo/|packs/|api/media/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|mp3|wav|txt|woff2?)$).*)",
    "/(api(?!/media)/.*)",
  ],
};
