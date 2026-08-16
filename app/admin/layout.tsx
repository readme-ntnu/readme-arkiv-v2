import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { getAuthenticatedUser } from "../../lib/Firebase/server/auth";
import { ROUTES } from "utils/routes";
import { AdminNavigation } from "./_components/AdminNavigation";
import { LoadingSpinner } from "../../components/LoadingSpinner";

async function AdminAuthGuard({ children }: { children: ReactNode }) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(ROUTES.LOGIN);
  }

  return <AdminNavigation>{children}</AdminNavigation>;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AdminAuthGuard>{children}</AdminAuthGuard>
    </Suspense>
  );
}
