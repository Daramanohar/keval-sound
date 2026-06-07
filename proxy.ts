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
    // Skip Next.js internals + static assets. /api/media IS included so the
    // route handler can call auth() and read the session, but it's NOT in
    // `isProtectedRoute` above — we gate inside the handler instead, which
    // lets us return clean 401 JSON without redirecting the <audio> element.
    "/((?!_next/|_next/static|_next/image|favicon.ico|logo/|packs/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|mp3|wav|txt|woff2?)$).*)",
    "/(api/.*)",
  ],
};
