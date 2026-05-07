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

export async function toggleEventCompletion(id: string, completed: boolean) {
  const event = await prisma.event.update({
    where: { id },
    data: { completed },
  });
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
