import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { getAuthenticatedUser } from "../../lib/Firebase/server/auth";
import { ROUTES } from "utils/routes";
import { LoadingSpinner } from "../../components/LoadingSpinner";

async function LoginAuthGuard({ children }: { children: ReactNode }) {
  const user = await getAuthenticatedUser();

  if (user) {
    redirect(ROUTES.ADMIN);
  }

  return <>{children}</>;
}

export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <LoginAuthGuard>{children}</LoginAuthGuard>
    </Suspense>
  );
}
