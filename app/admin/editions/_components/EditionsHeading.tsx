import {
  Button,
  buttonGroupVariants,
  buttonVariants,
  cn,
  Description,
  Dropdown,
  Label,
  toast,
} from "@heroui/react";
import { ROUTES } from "../../../../utils/routes";
import PageHeader from "@/components/PageHeader";
import { ArrowsRotateRight, ChevronDown, Plus } from "@gravity-ui/icons";
import Link from "next/link";
import { updateEditionsCache } from "actions/settings";

export default function EditionsHeading() {
  return (
    <PageHeader
      title="Utgaver"
      endContent={
        <div className={buttonGroupVariants().base()}>
          <Link
            className={cn(buttonVariants({ size: "sm" }))}
            href={ROUTES.NEW_EDITION}
          >
            <Plus />
            Ny utgave
          </Link>
          <Dropdown>
            <Button size="sm" isIconOnly aria-label={`Flere handlinger`}>
              <span
                className={buttonGroupVariants().separator()}
                aria-hidden="true"
              />
              <ChevronDown />
            </Button>
            <Dropdown.Popover className="max-w-[290px]" placement="bottom end">
              <Dropdown.Menu>
                <Dropdown.Item id="delete-file" onAction={updateEditionsCache}>
                  <div className="flex h-8 items-start justify-center pt-px">
                    <ArrowsRotateRight className="text-muted" />
                  </div>
                  <div className="flex flex-col">
                    <Label>Oppdater utgave cache</Label>
                    <Description>
                      Oppdaterer cachen manuelt for å sørge for at riktig
                      innhold blir vist på forsiden.
                    </Description>
                  </div>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>
      }
    />
  );
}
