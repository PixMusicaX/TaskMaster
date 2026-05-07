"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getNoteByDate(date: string) {
  return await prisma.note.findUnique({
    where: { date },
  });
}

export async function saveNote(date: string, content: string, mood: string = "neutral") {
  const note = await prisma.note.upsert({
    where: { date },
    update: { content, mood },
    create: { date, content, mood },
  });
  revalidatePath("/notes");
  revalidatePath("/");
  return note;
}

export async function getRecentNotes(limit: number = 7) {
  return await prisma.note.findMany({
    take: limit,
    orderBy: { date: "desc" },
  });
}
