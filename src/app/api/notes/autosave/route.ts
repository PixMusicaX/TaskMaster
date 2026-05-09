import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { note } from "@/db/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, content, mood = "neutral" } = body as {
      date: string;
      content: string;
      mood?: string;
    };

    if (!date || !content) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    await db
      .insert(note)
      .values({ date, content, mood, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [note.date],
        set: { content, mood, updatedAt: new Date() },
      });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[autosave]", err);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
