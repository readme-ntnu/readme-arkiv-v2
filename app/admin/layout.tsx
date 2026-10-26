import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { getAuthenticatedUser, isReadmeMember } from "server/auth";
import { addReturnTo, ROUTES } from "utils/routes";
import { AdminNavigation } from "./_components/AdminNavigation";
import { LoadingSpinner } from "../../components/LoadingSpinner";

async function AdminAuthGuard({ children }: { children: ReactNode }) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(addReturnTo(ROUTES.LOGIN, ROUTES.ADMIN));
  }

  if (!isReadmeMember(user)) {
    redirect(ROUTES.HOME);
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
