# KEVAL SOUND Frontend Follow-Up TODOs

## Current status

- Auth flow is wired and route-protected
- Navbar/top bar alignment is fixed
- Discovery Panel is implemented and visible
- Shared cart, wishlist, checkout, and ownership flow are connected
- Pack detail flow is live
- Persistent player and waveform timeline are functional
- `npm run lint` passes
- `npx tsc --noEmit` passes
- `npm run build` passes

## Step-by-step next tasks

1. Run the app locally with `npm run dev`.
2. Verify the auth journey manually.
   - Open the app in a browser
   - Confirm unauthenticated access redirects to `/auth`
   - Test Sign Up, Sign In, Google login, reload persistence, and Sign Out
3. Verify the full buyer flow manually.
   - Search from the top bar and the explore page
   - Preview tracks, packs, and samples
   - Add items to cart
   - Complete checkout
   - Confirm ownership and license IDs appear in cart success state and account history
4. QA the Discovery Panel.
   - Check sticky behavior on desktop
   - Check stacked responsive behavior on smaller screens
   - Confirm preview and Get Pack actions work
5. QA the player waveform.
   - Confirm the waveform stretches across the full timeline
   - Confirm scrubbing updates the current time correctly
   - Confirm progress stays synced while previews play
6. Replace the mock auth layer with real backend authentication when ready.
7. Replace the mock checkout with real payment and order APIs when ready.
8. Replace simulated preview playback with real audio assets when available.
9. Add automated tests for auth, cart, checkout, and pack detail routing.
10. Add analytics and error monitoring before deployment.

## Recommended release checklist

- Test desktop and mobile layouts
- Test wishlist and cart badges after reload
- Test account tabs and purchase history
- Test invalid pack URLs
- Run a final `npm run lint`
- Run a final `npm run build`
