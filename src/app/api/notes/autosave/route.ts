import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/current-user";
import { saveNoteFor } from "@/lib/data/notes";

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const body = await req.json();
    const { date, content, mood = "neutral" } = body as {
      date: string;
      content: string;
      mood?: string;
    };

    if (!date || !content) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    await saveNoteFor(userId, date, content, mood);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[autosave]", err);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
