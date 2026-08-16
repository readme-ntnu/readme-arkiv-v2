"use client";

import { FC } from "react";
import { useSettings } from "../../../../lib/Firebase/client/hooks";
import { Description, Switch, toast } from "@heroui/react";
import { updateEditionsCache } from "lib/Firebase/server/actions";

export const ShowListingToggle: FC = () => {
  const [settings, loading, _, updateSettings] = useSettings();

  function toggleShowListing() {
    updateSettings({ ...settings, showListing: !settings?.showListing })
      .then(() => updateEditionsCache())
      .then(() =>
        toast.success("Instilling er oppdatert", {
          description:
            "Det kan ta 5-10 minutter før endringer blir synlig på forsiden.",
          timeout: 5000,
        }),
      );
  }
  return (
    <div className="flex flex-col items-start gap-[8px]">
      <Switch
        onChange={toggleShowListing}
        isSelected={settings?.showListing ?? false}
        isDisabled={loading}
      >
        <Switch.Content>
          Vis listingutgaver:
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Content>
      </Switch>
      <Description>
        Brukes for å vise/skjule Listingsløp utgaver på arkivets forside.
      </Description>
    </div>
  );
};
