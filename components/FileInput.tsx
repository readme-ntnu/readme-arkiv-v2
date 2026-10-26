import { CloseButton, Description, ErrorMessage, Label } from "@heroui/react";
import { ArrowUpFromSquare, File, Xmark } from "@gravity-ui/icons";
import { type FC, useId } from "react";

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
  const inputId = useId();

  return (
    <div className="flex min-h-[70px] w-full flex-col gap-[5px]">
      {label ? (
        <Label
          htmlFor={inputId}
          isRequired={isRequired}
          isInvalid={error}
          isDisabled={isDisabled}
        >
          {label}
        </Label>
      ) : null}
      <div>
        {!value ? (
          <>
            <input
              id={inputId}
              type="file"
              className="peer sr-only"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                onChange(file);
              }}
              accept={acceptFormat}
              disabled={isDisabled}
              data-disabled={isDisabled}
              aria-disabled={isDisabled}
            />
            <label
              htmlFor={inputId}
              className="input-group flex h-full w-full gap-4 p-4 peer-focus-visible:ring-2 peer-focus-visible:ring-focus peer-focus-visible:ring-offset-2"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (isDisabled) return;

                const file = event.dataTransfer.files[0];
                if (file) onChange(file);
              }}
              data-invalid={error}
              data-disabled={isDisabled}
              aria-disabled={isDisabled}
            >
              <ArrowUpFromSquare
                height={16}
                width={16}
                className="m-1"
                aria-hidden="true"
              />
              <span className="flex flex-col">
                <span className="font-semibold">Last opp fil</span>
                <Description>Trykk eller dra og slipp</Description>
              </span>
            </label>
          </>
        ) : (
          <div
            className="input-group flex h-full w-full gap-4 p-4"
            data-disabled={isDisabled}
            aria-disabled={isDisabled}
          >
            <File height={16} width={16} className="m-1" aria-hidden="true" />
            <span className="flex grow flex-col overflow-hidden">
              <span className="truncate font-semibold">{value.name}</span>
              <Description>
                {(value.size / 1_000_000).toFixed(1)} MB
              </Description>
            </span>
            <CloseButton
              className="rounded-full"
              onPress={() => onChange(undefined)}
              isDisabled={isDisabled}
              aria-label="Fjern fil"
            >
              <Xmark aria-hidden="true" />
            </CloseButton>
          </div>
        )}
      </div>
      {error ? (
        <span className="flex flex-col">
          {(Array.isArray(errorMessage) ? errorMessage : [errorMessage]).map(
            (message, index) =>
              message ? (
                <ErrorMessage key={index}>{message}</ErrorMessage>
              ) : null,
          )}
        </span>
      ) : null}
    </div>
  );
};
