import { getPrisma, isDatabaseConfigured } from "@/lib/db";
import { createKevalUserId } from "@/lib/keval-user-id";

type ClerkEmailAddress = {
  id?: string | null;
  email_address?: string | null;
  emailAddress?: string | null;
};

type ClerkMetadata = {
  onboarding?: {
    useCase?: unknown;
    sounds?: unknown;
    completedAt?: unknown;
  };
};

export type ClerkUserSyncPayload = {
  id?: string | null;
  email_addresses?: ClerkEmailAddress[] | null;
  emailAddresses?: ClerkEmailAddress[] | null;
  primary_email_address_id?: string | null;
  primaryEmailAddressId?: string | null;
  first_name?: string | null;
  firstName?: string | null;
  last_name?: string | null;
  lastName?: string | null;
  image_url?: string | null;
  imageUrl?: string | null;
  public_metadata?: ClerkMetadata | null;
  publicMetadata?: ClerkMetadata | null;
  created_at?: number | string | Date | null;
  createdAt?: number | string | Date | null;
  updated_at?: number | string | Date | null;
  updatedAt?: number | string | Date | null;
};

export type ClerkUserSyncResult =
  | { ok: true; userId: string }
  | { ok: false; skipped?: boolean; reason: string };

function toDate(value: number | string | Date | null | undefined) {
  if (!value) return undefined;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function getPrimaryEmail(data: ClerkUserSyncPayload) {
  const emails = data.email_addresses ?? data.emailAddresses ?? [];
  const primaryId = data.primary_email_address_id ?? data.primaryEmailAddressId;
  const primary = emails.find((email) => email.id && email.id === primaryId) ?? emails[0];
  return primary?.email_address ?? primary?.emailAddress ?? null;
}

function getOnboarding(data: ClerkUserSyncPayload) {
  const metadata = data.public_metadata ?? data.publicMetadata;
  const onboarding = metadata?.onboarding;
  if (!onboarding || typeof onboarding !== "object") return {};

  const useCase = typeof onboarding.useCase === "string" ? onboarding.useCase : undefined;
  const sounds = Array.isArray(onboarding.sounds)
    ? onboarding.sounds.filter((sound): sound is string => typeof sound === "string")
    : undefined;
  const completedAt =
    typeof onboarding.completedAt === "string" ? toDate(onboarding.completedAt) : undefined;

  return { useCase, sounds, completedAt };
}

export async function upsertUserFromClerk(
  data: ClerkUserSyncPayload
): Promise<ClerkUserSyncResult> {
  if (!isDatabaseConfigured()) {
    return { ok: false, skipped: true, reason: "database_not_configured" };
  }

  if (!data.id) {
    return { ok: false, reason: "missing_clerk_user_id" };
  }

  const onboarding = getOnboarding(data);
  const email = getPrimaryEmail(data);
  const firstName = data.first_name ?? data.firstName ?? null;
  const lastName = data.last_name ?? data.lastName ?? null;
  const imageUrl = data.image_url ?? data.imageUrl ?? null;
  const clerkCreatedAt = toDate(data.created_at ?? data.createdAt);
  const clerkUpdatedAt = toDate(data.updated_at ?? data.updatedAt);
  const prisma = getPrisma();

  const user = await prisma.user.upsert({
    where: { clerkUserId: data.id },
    create: {
      clerkUserId: data.id,
      kevalUserId: createKevalUserId(),
      email,
      firstName,
      lastName,
      imageUrl,
      onboardingUseCase: onboarding.useCase,
      onboardingSounds: onboarding.sounds,
      onboardingCompletedAt: onboarding.completedAt,
      clerkCreatedAt,
      clerkUpdatedAt,
    },
    update: {
      email,
      firstName,
      lastName,
      imageUrl,
      onboardingUseCase: onboarding.useCase,
      onboardingSounds: onboarding.sounds,
      onboardingCompletedAt: onboarding.completedAt,
      clerkUpdatedAt,
      deletedAt: null,
    },
    select: { id: true },
  });

  return { ok: true, userId: user.id };
}

export async function markUserDeletedFromClerk(clerkUserId: string): Promise<ClerkUserSyncResult> {
  if (!isDatabaseConfigured()) {
    return { ok: false, skipped: true, reason: "database_not_configured" };
  }

  const prisma = getPrisma();
  const result = await prisma.user.updateMany({
    where: { clerkUserId },
    data: { deletedAt: new Date() },
  });

  if (result.count === 0) {
    return { ok: false, skipped: true, reason: "user_not_found" };
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId },
    select: { id: true },
  });

  return user ? { ok: true, userId: user.id } : { ok: false, reason: "user_not_found" };
}
