import { ArrowLeft } from "@gravity-ui/icons";
import { buttonVariants, cn } from "@heroui/react";
import Link from "next/link";

interface IProps {
  title: string;
  backButtonRoute?: string;
  endContent?: React.ReactNode;
}

export default function PageHeader(props: IProps) {
  return (
    <div className="flex place-content-between items-center w-full">
      <div className="flex items-center gap-2">
        {props.backButtonRoute && (
          <Link
            href={props.backButtonRoute}
            className={cn(
              "rounded-full",
              buttonVariants({ variant: "ghost", isIconOnly: true }),
            )}
          >
            <ArrowLeft className="h-[28px] w-[28px]" />
          </Link>
        )}
        <h1 className="text-3xl font-bold text-default-foreground ">
          {props.title}
        </h1>
      </div>
      {props.endContent}
    </div>
  );
}
