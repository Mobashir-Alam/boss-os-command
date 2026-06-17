import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Executive ("CEO") UI mode — a bold red / yellow / black re-skin of the
 * connector dashboards (GitHub, Slack, YouTube). It's a global, persisted
 * toggle: every page reads the same flag so the look survives navigation.
 *
 * Implementation note: the skin itself lives in `.exec-theme` in index.css,
 * which overrides the design tokens. This context just flips the flag.
 */
const STORAGE_KEY = "founder-os:exec-mode";

interface ExecThemeValue {
  exec: boolean;
  toggle: () => void;
  setExec: (v: boolean) => void;
}

const ExecThemeContext = createContext<ExecThemeValue>({
  exec: false,
  toggle: () => {},
  setExec: () => {},
});

export function ExecThemeProvider({ children }: { children: ReactNode }) {
  const [exec, setExec] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, exec ? "1" : "0");
  }, [exec]);

  return (
    <ExecThemeContext.Provider value={{ exec, toggle: () => setExec((v) => !v), setExec }}>
      {children}
    </ExecThemeContext.Provider>
  );
}

export function useExecTheme() {
  return useContext(ExecThemeContext);
}
