import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/**
 * False in the static HTML and during hydration, true once React is running.
 * Toggle buttons use it to stay out of the tab order until they work, so a
 * visitor without JavaScript never tabs onto a control that does nothing.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(noSubscribe, () => true, () => false);
}
