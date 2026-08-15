import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "../../lib/Firebase/serverAuth";
import { ROUTES } from "utils/routes";
import { AdminNavigation } from "./_components/AdminNavigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(ROUTES.LOGIN);
  }

  return <AdminNavigation>{children}</AdminNavigation>;
}
