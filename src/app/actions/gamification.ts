"use server";

import { requireUserId } from "@/lib/current-user";
import {
  statsForPeriod, profileFor, seasonHistoryFor, seasonPaceFor, seasonXPBeforeTodayFor,
  seasonTimelineFor, eraProgressFor, invalidateSnapshots,
} from "@/lib/data/stats";

// Every action here answers for the signed-in user only; the work is in lib/data/stats.ts

export async function getStatsForPeriod(startDate: Date, endDate: Date, referenceDate: Date = new Date()) {
  return statsForPeriod(await requireUserId(), startDate, endDate, referenceDate);
}

export async function getProfile(clientDateStr?: string) {
  return profileFor(await requireUserId(), clientDateStr);
}

export async function getSeasonHistory(monthsCount: number = 6, clientDateStr?: string) {
  return seasonHistoryFor(await requireUserId(), monthsCount, clientDateStr);
}

export async function getSeasonPace(clientDateStr?: string) {
  return seasonPaceFor(await requireUserId(), clientDateStr);
}

export async function getSeasonXPBeforeToday(clientDateStr?: string) {
  return seasonXPBeforeTodayFor(await requireUserId(), clientDateStr);
}

export async function getSeasonTimeline(clientDateStr?: string, minMonths: number = 1) {
  return seasonTimelineFor(await requireUserId(), clientDateStr, minMonths);
}

export async function getEraProgress(clientDateStr?: string) {
  return eraProgressFor(await requireUserId(), clientDateStr);
}

export async function invalidateSeasonSnapshots(...dates: (string | null | undefined)[]) {
  return invalidateSnapshots(await requireUserId(), ...dates);
}
