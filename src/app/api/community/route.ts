import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { communityMessages } from "@/db/schema";
import { desc, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const user = await requireAuth();
  const messages = await db.select().from(communityMessages)
    .orderBy(desc(communityMessages.createdAt))
    .limit(50);
  return NextResponse.json({ messages, userId: user.id });
}

export async function POST(request: NextRequest) {
  const user = await requireAuth();
  const { message, lat, lng } = await request.json();

  if (!message || message.trim().length === 0) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  const [created] = await db.insert(communityMessages).values({
    userId: user.id,
    userName: user.name,
    message: message.trim().slice(0, 280),
    lat: lat || null,
    lng: lng || null,
  }).returning();

  return NextResponse.json({ message: created });
}
