import { ROUTES } from "../../../../utils/routes";
import PageHeader from "@/components/PageHeader";
import EditionForm from "../_components/EditionForm";

export default function Page() {
  return (
    <div className="flex w-full max-w-[600px] flex-col items-start gap-5 mx-auto">
      <PageHeader
        title="Ny utgave"
        backButtonRoute={ROUTES.EDITION_LIST}
        disablePrefetch
      />
      <EditionForm />
    </div>
  );
}
