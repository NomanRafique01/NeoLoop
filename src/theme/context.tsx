/**
 * NeoLoop CLI — React Ink Theme Context & Hooks
 *
 * Provides reactive theme state to all Ink components.
 * Whenever the theme changes (e.g. via slash command), all rendered
 * Ink components automatically re-render with the latest tokens.
 */

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { ThemeTokens } from './types.js';
import { defaultTheme } from './themes.js';
import { getCurrentTheme, setCurrentTheme, onThemeChange } from './manager.js';

export interface ThemeContextValue {
  theme: ThemeTokens;
  setTheme: (themeOrId: string | ThemeTokens) => ThemeTokens;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: defaultTheme,
  setTheme: (t) => setCurrentTheme(t),
});

export interface ThemeProviderProps {
  initialTheme?: ThemeTokens;
  children: React.ReactNode;
}

export function ThemeProvider({ initialTheme, children }: ThemeProviderProps) {
  const [theme, setLocalTheme] = useState<ThemeTokens>(
    initialTheme || getCurrentTheme()
  );

  useEffect(() => {
    // Synchronize React state whenever the global theme changes
    const unsub = onThemeChange((nextTheme) => {
      setLocalTheme(nextTheme);
    });
    return unsub;
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme: (next: string | ThemeTokens) => setCurrentTheme(next),
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to retrieve the current active theme tokens in any Ink component.
 */
export function useTheme(): ThemeTokens {
  const ctx = useContext(ThemeContext);
  return ctx.theme;
}

/**
 * Hook to retrieve both the current theme and setter function.
 */
export function useThemeContext(): ThemeContextValue {
  return useContext(ThemeContext);
}
