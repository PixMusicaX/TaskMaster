"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getEventsByDateRange(start: Date, end: Date) {
  // We store date as string YYYY-MM-DD for easier filtering, 
  // but we can also use startTime/endTime.
  return await prisma.event.findMany({
    where: {
      startTime: {
        gte: start,
        lte: end,
      },
    },
    orderBy: {
      startTime: "asc",
    },
  });
}

export async function addEvent(data: {
  title: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  date: string;
  type: string;
  notification?: boolean;
}) {
  const event = await prisma.event.create({
    data,
  });
  revalidatePath("/calendar");
  revalidatePath("/");
  return event;
}

import { addXP } from "./gamification";
import { XP_VALUES } from "@/lib/constants";

export async function toggleEventCompletion(id: string, completed: boolean) {
  const event = await prisma.event.update({
    where: { id },
    data: { completed },
  });

  if (completed) {
    let xp = XP_VALUES.SIDE_QUEST;
    if (event.tier === "main") xp = XP_VALUES.MAIN_QUEST;
    if (event.tier === "epic") xp = XP_VALUES.EPIC_QUEST;
    
    await addXP(xp, event.stat || undefined);
  }

  revalidatePath("/calendar");
  revalidatePath("/");
  return event;
}

export async function deleteEvent(id: string) {
  await prisma.event.delete({ where: { id } });
  revalidatePath("/calendar");
}
export async function updateEvent(id: string, data: any) {
  const event = await prisma.event.update({
    where: { id },
    data,
  });
  revalidatePath("/calendar");
  revalidatePath("/");
  return event;
}
