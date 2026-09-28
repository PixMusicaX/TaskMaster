import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// False during SSR and hydration, true once running in the browser (no effect round-trip)
export function useMounted() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
