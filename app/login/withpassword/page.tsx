import { Metadata } from "next";
import SignInForm from "./_components/SignInForm";
import { getSafeReturnTo } from "../../../utils/routes";

export const metadata: Metadata = {
  title: "readme - logg inn",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const returnToParam = (await searchParams).returnTo;
  const returnTo = getSafeReturnTo(
    Array.isArray(returnToParam) ? returnToParam[0] : returnToParam,
  );

  return (
    <div className="w-[300px] flex flex-col gap-4 items-center">
      <h1 className="text-3xl font-bold text-default-foreground">Logg inn</h1>
      <SignInForm returnTo={returnTo} />
    </div>
  );
}
