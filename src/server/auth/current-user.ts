import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { Prisma, UserRole } from "@prisma/client";
import { upsertUserFromClerk } from "@/lib/clerk-user-sync";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";
import { ApiError } from "@/server/http/api";

const appUserSelect = {
  id: true,
  clerkUserId: true,
  kevalUserId: true,
  role: true,
  email: true,
  firstName: true,
  lastName: true,
  imageUrl: true,
  onboardingCompletedAt: true,
  deletedAt: true,
} satisfies Prisma.UserSelect;

export type AppUser = Prisma.UserGetPayload<{ select: typeof appUserSelect }>;

async function findOrSyncUser(clerkUserId: string) {
  if (!isDatabaseConfigured()) {
    throw new ApiError(503, "database_unavailable", "The account service is temporarily unavailable.");
  }

  const prisma = getPrisma();
  let user = await prisma.user.findUnique({
    where: { clerkUserId },
    select: appUserSelect,
  });

  if (!user) {
    const clerkUser = await currentUser();
    if (!clerkUser || clerkUser.id !== clerkUserId) {
      throw new ApiError(401, "unauthorized", "Sign in is required.");
    }

    const syncResult = await upsertUserFromClerk(clerkUser);
    if (!syncResult.ok) {
      throw new ApiError(503, "account_sync_failed", "Your account could not be prepared. Please retry.");
    }

    user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: appUserSelect,
    });
  }

  if (!user) {
    throw new ApiError(404, "user_not_found", "The signed-in account was not found.");
  }
  if (user.deletedAt) {
    throw new ApiError(403, "account_inactive", "This account is not active.");
  }

  return user;
}

export async function getOptionalAppUser(): Promise<AppUser | null> {
  const { userId } = await auth();
  return userId ? findOrSyncUser(userId) : null;
}

export async function requireAppUser(): Promise<AppUser> {
  const user = await getOptionalAppUser();
  if (!user) {
    throw new ApiError(401, "unauthorized", "Sign in is required.");
  }
  return user;
}

export async function requireUserRole(allowedRoles: readonly UserRole[]) {
  const user = await requireAppUser();
  if (!allowedRoles.includes(user.role)) {
    throw new ApiError(403, "forbidden", "You do not have permission to perform this action.");
  }
  return user;
}
