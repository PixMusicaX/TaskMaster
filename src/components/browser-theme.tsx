"use client";

import { useBrowserTheme } from "@/components/theme-provider";

// Drop into a signed-out page that is otherwise rendered on the server, so it starts light or
// dark as the visitor's browser prefers (the app itself goes by the time of day)
export default function BrowserTheme() {
  useBrowserTheme();
  return null;
}
