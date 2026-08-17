import { ROUTES } from "../../../../utils/routes";
import NewEditionForm from "app/admin/editions/new/_components/NewEditionForm";
import PageHeader from "@/components/PageHeader";

export default function Page() {
  return (
    <div className="flex flex-col items-left gap-5 max-w-[350px] w-full mx-auto">
      <PageHeader
        title="Ny utgave"
        backButtonRoute={ROUTES.EDITION_LIST}
        disablePrefetch
      />
      <NewEditionForm />
    </div>
  );
}
