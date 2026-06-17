// Next.js 16 uses `proxy.ts` for request interception. In this project the
// app source lives under `src/`, so Clerk expects this file at `src/proxy.ts`.
// TODO(security): add Cloudflare Turnstile / Clerk bot protection in a
// follow-up milestone. Auth comes first; bot protection layers on top.
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/browse(.*)",
  "/player(.*)",
  "/playlists(.*)",
  "/explore(.*)",
  "/radio(.*)",
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
    // Skip Next.js internals + static assets. /api/media is still matched so
    // route handlers can call auth() and read the session, but it is gated
    // inside the handler to return clean 401 JSON instead of a redirect.
    "/((?!_next/|_next/static|_next/image|favicon.ico|logo/|packs/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|mp3|wav|txt|woff2?)$).*)",
    "/(api/.*)",
  ],
};
