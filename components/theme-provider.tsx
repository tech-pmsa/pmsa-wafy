"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"
import { type ThemeProviderProps } from "next-themes"

const CUSTOM_THEME_CLASSES = ["theme-blue", "theme-green", "theme-red"]; // Add more here

function ThemeWatcher() {
  const { theme } = useTheme();

  React.useEffect(() => {
    const root = window.document.documentElement;
    CUSTOM_THEME_CLASSES.forEach((className) => {
      root.classList.remove(className);
    });

    if (theme && CUSTOM_THEME_CLASSES.includes(theme)) {
      root.classList.add(theme);
    }
  }, [theme]);

  return null;
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <ThemeWatcher />
      {children}
    </NextThemesProvider>
  )
}
