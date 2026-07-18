import { NextResponse } from "next/server";
import { db } from "@/db";
import { trips, dailyOdometer } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const user = await requireAuth();

  // Get the highest endOdometer from trips (cast to numeric for proper ordering)
  const [lastTrip] = await db.select({ endOdometer: trips.endOdometer })
    .from(trips)
    .where(eq(trips.userId, user.id))
    .orderBy(sql`COALESCE(${trips.endOdometer}, 0) DESC`)
    .limit(1);

  // Get today's trip count
  const today = new Date().toISOString().split("T")[0];
  const todayTrips = await db.select({ tripDate: trips.tripDate })
    .from(trips)
    .where(eq(trips.userId, user.id));
  const todayCount = todayTrips.filter((t) => t.tripDate === today).length;

  // The highest odometer is always the latest trip's end reading
  const lastOdometer = lastTrip?.endOdometer ? parseFloat(String(lastTrip.endOdometer)) : null;

  return NextResponse.json({ lastOdometer, todayCount });
}
