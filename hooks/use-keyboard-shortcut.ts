import { useEffect, useCallback } from "react";

type KeyboardModifier = "meta" | "ctrl" | "alt" | "shift";

interface UseKeyboardShortcutOptions {
  key: string;
  modifiers?: KeyboardModifier[];
  callback: () => void;
  enabled?: boolean;
}

/**
 * Custom hook for handling keyboard shortcuts
 * Properly cleans up event listeners and handles SSR
 *
 * @example
 * useKeyboardShortcut({
 *   key: "k",
 *   modifiers: ["meta", "ctrl"],
 *   callback: () => console.log("Search opened"),
 * });
 */
export function useKeyboardShortcut({
  key,
  modifiers = [],
  callback,
  enabled = true,
}: UseKeyboardShortcutOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const keyMatches = event.key.toLowerCase() === key.toLowerCase();
      if (!keyMatches) return;

      // Check modifiers
      const metaRequired = modifiers.includes("meta");
      const ctrlRequired = modifiers.includes("ctrl");
      const altRequired = modifiers.includes("alt");
      const shiftRequired = modifiers.includes("shift");

      // For meta/ctrl, we accept either (cross-platform support)
      const metaOrCtrlSatisfied =
        (!metaRequired && !ctrlRequired) ||
        (metaRequired && event.metaKey) ||
        (ctrlRequired && event.ctrlKey);

      const altSatisfied = !altRequired || event.altKey;
      const shiftSatisfied = !shiftRequired || event.shiftKey;

      if (metaOrCtrlSatisfied && altSatisfied && shiftSatisfied) {
        event.preventDefault();
        callback();
      }
    },
    [key, modifiers, callback, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, enabled]);
}

