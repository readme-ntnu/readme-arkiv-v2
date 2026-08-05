import {
  Button,
  CloseButton,
  Description,
  ErrorMessage,
  Label,
} from "@heroui/react";
import { FC } from "react";
import { Xmark, File, ArrowUpFromSquare } from "@gravity-ui/icons";

interface FileInputProps {
  value: File | undefined;
  onChange: (file: File | undefined) => void;
  label?: string;
  isRequired?: boolean;
  error?: boolean;
  errorMessage?: string | string[];
  isDisabled?: boolean;
  acceptFormat?: string;
}

export const FileInput: FC<FileInputProps> = ({
  value,
  onChange,
  label,
  isRequired,
  error,
  errorMessage,
  isDisabled,
  acceptFormat,
}) => {
  return (
    <div className={`flex flex-col w-full gap-[5px] min-height-[350px]`}>
      {label && (
        <Label
          isRequired={isRequired}
          isInvalid={error}
          isDisabled={isDisabled}
        >
          {label}
        </Label>
      )}
      <div>
        {!value ? (
          <>
            <label
              htmlFor="dropzone-file"
              className={"w-full h-full flex gap-4 input-group p-4"}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) {
                  onChange(file);
                }
              }}
              data-invalid={error}
              data-disabled={isDisabled}
            >
              <ArrowUpFromSquare height={16} width={16} className="m-1" />
              <span className="flex flex-col">
                <span className="font-semibold">Last opp fil</span>
                <Description>Trykk eller dra og slipp</Description>
              </span>
            </label>
            <input
              name="editionFile"
              id="dropzone-file"
              type="file"
              className="hidden"
              onChange={(event) =>
                onChange((event.currentTarget as any).files[0])
              }
              accept={acceptFormat}
              disabled={isDisabled}
            />
          </>
        ) : (
          <div className="w-full h-full flex gap-4 input-group p-4">
            <File height={16} width={16} className="m-1" />
            <span className="flex flex-col flex-grow">
              <span className="font-semibold">{value.name}</span>
              <Description>{(value.size / 1000000).toFixed(1)} Mb</Description>
            </span>
            <CloseButton
              className="rounded-full"
              onPress={() => onChange(undefined)}
              isDisabled={isDisabled}
              aria-label="Fjern fil"
            >
              <Xmark />
            </CloseButton>
          </div>
        )}
      </div>
      {error && (
        <span className="flex flex-col">
          {(Array.isArray(errorMessage) ? errorMessage : [errorMessage]).map(
            (error, i) => (
              <ErrorMessage key={i}>{error}</ErrorMessage>
            ),
          )}
        </span>
      )}
    </div>
  );
};
