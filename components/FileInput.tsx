import { Button, ErrorMessage, Label } from "@heroui/react";
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
    <div className={`flex flex-col w-full gap-[5px]`}>
      {label && (
        <Label
          isRequired={isRequired}
          isInvalid={error}
          isDisabled={isDisabled}
        >
          {label}
        </Label>
      )}
      <div
      // className={`w-full h-[150px]  ${
      //   error ? "bg-danger-50" : "bg-default-100"
      // } rounded-medium ${isDisabled && "opacity-disabled"}`}
      >
        {!value ? (
          <>
            <label
              htmlFor="dropzone-file"
              className={
                "w-full h-full flex flex-col items-center justify-center input-group p-4"
              }
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
              <ArrowUpFromSquare height={20} width={20} className="mb-2" />
              <span className="font-semibold">Trykk for å laste opp</span>
              <span>eller dra og slipp</span>
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
          <div className="w-full h-full flex flex-col items-center justify-center input-group p-4">
            <File height={20} width={20} className="mb-2" />
            <span className="flex items-center gap-[5px]">
              <span className="truncate max-w-[220px] text-default-foreground">
                {value.name}
              </span>
              <Button
                isIconOnly
                variant="ghost"
                className="rounded-full"
                onPress={() => onChange(undefined)}
                isDisabled={isDisabled}
                size="sm"
                aria-label="Fjern fil"
              >
                <Xmark />
              </Button>
            </span>
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
