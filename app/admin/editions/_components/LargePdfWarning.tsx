import { Alert } from "@heroui/react";

export function LargePdfWarning() {
  return (
    <Alert status="warning" className="rounded-xl">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>Stor fil valgt</Alert.Title>
        <Alert.Description>
          PDF-en er over 40 MB. En filstørrelse på 10–30 MB gir vanligvis bedre
          ytelse.
        </Alert.Description>
      </Alert.Content>
    </Alert>
  );
}
