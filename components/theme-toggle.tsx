"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      aria-label={
        mounted
          ? isDark
            ? "Ativar modo claro"
            : "Ativar modo escuro"
          : "Alternar tema"
      }
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex size-11 items-center justify-center rounded-full border-2 border-foreground bg-background text-foreground transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {mounted ? (
        isDark ? (
          <Sun className="size-5" aria-hidden="true" />
        ) : (
          <Moon className="size-5" aria-hidden="true" />
        )
      ) : (
        <span className="size-5" aria-hidden="true" />
      )}
    </button>
  );
}
