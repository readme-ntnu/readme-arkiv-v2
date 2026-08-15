import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getAuthenticatedUser } from "../../lib/Firebase/serverAuth";
import { ROUTES } from "utils/routes";

export default async function LoginLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getAuthenticatedUser();

  if (user) {
    redirect(ROUTES.ADMIN);
  }

  return <>{children}</>;
}
