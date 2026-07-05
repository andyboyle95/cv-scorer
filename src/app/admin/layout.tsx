import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getSession } from "@/lib/session";

// Server-side guard for the entire /admin tree. Anything under here is
// visible only to signed-in ADMINs. Non-admins get bounced to /.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user) redirect("/login?callbackUrl=/admin");
  if (session.user.role !== Role.ADMIN) redirect("/");
  return <>{children}</>;
}
