import { createContext, useContext, type ReactNode } from "react";
import { TextField, type TextFieldProps } from "react-aria-components";

interface TagFieldContextValue {
  tags: string[];
  setTags: (tags: string[]) => void;
}

const TagFieldContext = createContext<TagFieldContextValue | null>(null);

interface TagFieldProps extends Omit<
  TextFieldProps,
  "value" | "defaultValue" | "onChange"
> {
  value: string[];
  onChange: (tags: string[]) => void;
  children: ReactNode;
}

export function TagField({
  value,
  onChange,
  children,
  ...fieldProps
}: TagFieldProps) {
  return (
    <TagFieldContext.Provider
      value={{
        tags: value,
        setTags: onChange,
      }}
    >
      <TextField {...fieldProps}>{children}</TextField>
    </TagFieldContext.Provider>
  );
}

export function useTagFieldContext() {
  const context = useContext(TagFieldContext);

  if (!context) {
    throw new Error("TagInput must be rendered inside a TagField.");
  }

  return context;
}
