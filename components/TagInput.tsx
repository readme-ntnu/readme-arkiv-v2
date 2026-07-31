import { Xmark } from "@gravity-ui/icons";
import { Label, Chip, InputGroup, TextField, cn } from "@heroui/react";
import { useState } from "react";
import { useTagFieldContext } from "./TagField";

interface TagInputProps {
  addOnBlur?: boolean;
  placeholder?: string;
  className?: string;
}

export function TagInput({
  addOnBlur = true,
  placeholder,
  className,
}: TagInputProps) {
  const { tags, setTags } = useTagFieldContext();
  const [inputValue, setInputValue] = useState("");

  function addTag(value: string) {
    const tag = value.trim();

    if (!tag || tags.includes(tag)) {
      return;
    }

    setTags([...tags, tag]);
    setInputValue("");
  }

  function removeTag(tag: string) {
    setTags(tags.filter((item) => item !== tag));
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(inputValue);
    }

    if (event.key === "Backspace" && !inputValue && tags.length) {
      removeTag(tags.at(-1)!);
    }
  }

  function handleBlur(event: React.FocusEvent<HTMLInputElement>) {
    if (addOnBlur) {
      addTag(inputValue);
    }
  }

  return (
    <InputGroup
      className={cn("w-full flex flex-wrap py-[6px] px-2 gap-1", className)}
    >
      {Array.isArray(tags) && (
        <>
          {tags.map((tag) => (
            <Chip key={tag} className="h-[24px]">
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="text-muted cursor-pointer"
              >
                <Xmark width={12} height={12} />
              </button>
            </Chip>
          ))}
        </>
      )}
      <InputGroup.Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="flex-1 min-w-[90px] p-[2px]"
      />
    </InputGroup>
  );
}
