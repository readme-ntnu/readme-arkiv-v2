"use client";

import {
  Button,
  Card,
  CardBody,
  Tooltip,
  Image,
  Link,
  Modal,
  ModalContent,
  ModalFooter,
  ModalBody,
  ModalHeader,
  useDisclosure,
  addToast,
} from "@heroui/react";
import { FC, useState } from "react";
import { deleteEdition } from "../../../../lib/Firebase/firebaseClientAPIs";
import { IEdition, IEditionData } from "../../../../lib/types";
import React from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRightFromSquare, TrashBin } from "@gravity-ui/icons";

const EditionsOverview: FC<{ editionData: IEditionData[] }> = ({
  editionData,
}) => {
  const router = useRouter();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [selectedEdition, setSelectedEdition] = useState<string | undefined>();

  const handleOpenDeleteModal = (edition: string) => {
    setSelectedEdition(edition);
    onOpen();
  };

  const handleDeleteEdition = (edition: string) => {
    deleteEdition(edition)
      .then(() => {
        addToast({
          title: `Utgave ${edition} er slettet!`,
          description:
            "Merk at det kan ta 5-10 minutter før endringen er synlig på forsiden.",
          color: "success",
          timeout: 10000,
        });
        router.refresh();
      })
      .catch((error) => {
        addToast({
          title: `Kunne ikke slette utgave ${edition}!`,
          description:
            "Kun redaktør, nestleder og webansvarlig har tilgang til å slette utgaver. Ta kontakt med webansvarlig dersom du mener noe er feil.",
          color: "danger",
          timeout: 15000,
        });
        console.log(error);
      });
  };

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,_1fr))] w-full gap-3">
        {editionData.map((year, i) => (
          <React.Fragment key={year.year}>
            <h2 className="text-xl font-bold px-1 col-span-full mt-2">
              {year.year}
            </h2>
            {year.editions.map((edition) => (
              <EditionCard
                key={`${year.year}-${edition.edition}`}
                year={year.year}
                edition={edition}
                onDeletePressed={() => {
                  handleOpenDeleteModal(`${year.year}-${edition.edition}`);
                }}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        onClose={() => setSelectedEdition(undefined)}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Slett utgave</ModalHeader>
              <ModalBody>
                <p>Er du sikker på at du vil slette {selectedEdition}?</p>
              </ModalBody>
              <ModalFooter>
                <Button color="default" onPress={onClose}>
                  Avbryt
                </Button>
                <Button
                  color="danger"
                  onPress={() => {
                    selectedEdition && handleDeleteEdition(selectedEdition);
                    onClose();
                  }}
                >
                  Slett
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

const EditionCard: FC<{
  year: number;
  edition: IEdition;
  onDeletePressed: () => void;
}> = ({ year, edition, onDeletePressed }) => (
  <Card isFooterBlurred radius="sm">
    <CardBody className="flex flex-row gap-[20px] items-center p-3">
      <Image src={edition.imageUrl} width={50} className="rounded-none" />
      <span className="font-bold grow">{`Utgave ${edition.edition}`}</span>
      <div className="flex gap-[10px] m-2">
        <Tooltip content="Åpne opp i ny fane" delay={1000}>
          <Button
            color="default"
            variant="bordered"
            isIconOnly
            startContent={<ArrowUpRightFromSquare />}
          />
        </Tooltip>
        <Tooltip content="Slett utgave" color="danger" delay={1000}>
          <Button
            color="danger"
            variant="flat"
            isIconOnly
            startContent={<TrashBin />}
            onPress={onDeletePressed}
          />
        </Tooltip>
      </div>
    </CardBody>
  </Card>
);

export default EditionsOverview;
