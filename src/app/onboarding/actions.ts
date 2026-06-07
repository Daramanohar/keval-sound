"use server";

import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { upsertUserFromClerk } from "@/lib/clerk-user-sync";

const USE_CASE_IDS = new Set([
  "films-videos",
  "social-content",
  "ads-brands",
  "games-apps",
  "personal",
]);

const SOUND_IDS = new Set([
  "hip-hop-rap",
  "pop",
  "edm",
  "bollywood",
  "indie",
  "culture",
  "classic",
  "occasion",
]);

export interface OnboardingPayload {
  useCase: string;
  sounds: string[];
}

export interface OnboardingResult {
  ok: boolean;
  error?: string;
}

/**
 * Server action: persist onboarding answers to Clerk `publicMetadata`.
 *
 * publicMetadata is server-writable only, so this can't be tampered with
 * from the browser. The client previously wrote to `unsafeMetadata`; we
 * keep that field empty going forward so there's one source of truth.
 *
 * When the real Postgres `users` table lands, this action grows a second
 * write to the DB. The Clerk-side copy stays as a fast read-cache for the
 * sign-in landing decision.
 */
export async function saveOnboarding(
  payload: OnboardingPayload
): Promise<OnboardingResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, error: "unauthorized" };
  }

  if (!USE_CASE_IDS.has(payload.useCase)) {
    return { ok: false, error: "invalid_use_case" };
  }

  const sounds = Array.from(new Set(payload.sounds)).filter((id) =>
    SOUND_IDS.has(id)
  );

  if (sounds.length === 0) {
    return { ok: false, error: "no_sounds_selected" };
  }

  try {
    const onboarding = {
      useCase: payload.useCase,
      sounds,
      completedAt: new Date().toISOString(),
    };
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        onboarding,
      },
    });

    const user = await currentUser();
    if (user) {
      const result = await upsertUserFromClerk({
        id: user.id,
        emailAddresses: user.emailAddresses,
        primaryEmailAddressId: user.primaryEmailAddressId,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
        publicMetadata: { onboarding },
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });

      if (!result.ok && !result.skipped) {
        console.error("[onboarding] database mirror failed", result.reason);
      }
    }

    return { ok: true };
  } catch (error) {
    console.error("[onboarding] saveOnboarding failed", error);
    return { ok: false, error: "save_failed" };
  }
}
