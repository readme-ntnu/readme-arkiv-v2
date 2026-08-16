"use client";

import { useTheme } from "next-themes";
import { Button } from "@heroui/react";
import { Moon, Sun } from "@gravity-ui/icons";

export function LightSwitch() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      isIconOnly
      variant="tertiary"
      className="rounded-full"
      aria-label="Bytt fargetema"
      onPress={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Moon className="dark:hidden" />
      <Sun className="hidden dark:block" />
    </Button>
  );
}
