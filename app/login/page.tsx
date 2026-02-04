import SignInForm from "./_components/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "readme - logg inn",
};

export default function Page() {
  return (
    <div className="w-[300px] flex flex-col gap-4 items-center">
      <h1 className="text-3xl font-bold text-default-foreground">Logg inn</h1>
      <SignInForm />
    </div>
  );
}
