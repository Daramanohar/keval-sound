import { UserRole } from "@prisma/client";
import { notFound } from "next/navigation";
import AdminConsole from "@/components/admin/AdminConsole";
import { requireAppUser } from "@/server/auth/current-user";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireAppUser();
  if (user.role !== UserRole.ADMIN && user.role !== UserRole.FINANCE) notFound();
  return <AdminConsole />;
}
