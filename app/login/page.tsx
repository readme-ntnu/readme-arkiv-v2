import { Metadata } from "next";
import SignInWithLego from "./_components/SignInWithLego";
import SignInWithPassword from "./_components/SignInWithPassword";
import { Separator } from "@heroui/react";

export const metadata: Metadata = {
  title: "readme - logg inn",
};

export default function Page() {
  return (
    <div className="w-[300px] flex flex-col gap-4 items-center">
      <h1 className="text-3xl font-bold text-default-foreground">Logg inn</h1>
      <SignInWithLego />
      <div className="relative my-4 flex items-center w-full">
        <Separator />
        <span className="absolute left-1/2 -translate-x-1/2 bg-background px-3 text-xs uppercase">
          eller
        </span>
      </div>
      <SignInWithPassword />
    </div>
  );
}
