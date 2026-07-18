import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dailyOdometer } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const user = await requireAuth();

  // Get today's record
  const today = new Date().toISOString().split("T")[0];
  const [todayRecord] = await db.select().from(dailyOdometer)
    .where(and(eq(dailyOdometer.userId, user.id), eq(dailyOdometer.date, today)))
    .limit(1);

  // Get last end odometer (for auto-filling next day's start)
  const [lastRecord] = await db.select().from(dailyOdometer)
    .where(and(eq(dailyOdometer.userId, user.id)))
    .orderBy(desc(dailyOdometer.date))
    .limit(1);

  return NextResponse.json({
    today: todayRecord || null,
    lastEndOdometer: lastRecord?.endOdometer || lastRecord?.startOdometer || null,
    lastDate: lastRecord?.date || null,
  });
}

export async function POST(request: NextRequest) {
  const user = await requireAuth();
  const { startOdometer, endOdometer } = await request.json();
  const today = new Date().toISOString().split("T")[0];

  const [existing] = await db.select().from(dailyOdometer)
    .where(and(eq(dailyOdometer.userId, user.id), eq(dailyOdometer.date, today)))
    .limit(1);

  if (existing) {
    const [updated] = await db.update(dailyOdometer).set({
      ...(startOdometer !== undefined && { startOdometer }),
      ...(endOdometer !== undefined && { endOdometer }),
    }).where(eq(dailyOdometer.id, existing.id)).returning();
    return NextResponse.json({ record: updated });
  }

  const [created] = await db.insert(dailyOdometer).values({
    userId: user.id,
    date: today,
    startOdometer: startOdometer || 0,
    endOdometer: endOdometer || null,
  }).returning();

  return NextResponse.json({ record: created });
}
