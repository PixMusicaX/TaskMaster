"use client";

import { createContext, useContext } from "react";

// Where the player stands in the era system right now (null until the pace data loads).
// Kept apart from the progress provider so cards can read it without pulling in its imports.
export interface EraStanding {
  index: number;
  startIndex: number;
  lastMonthName: string;
  lastMonthPaceXP: number;
}

export const EraStandingContext = createContext<EraStanding | null>(null);

export function useEraStanding(): EraStanding | null {
  return useContext(EraStandingContext);
}
