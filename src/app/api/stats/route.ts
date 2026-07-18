import { NextResponse } from "next/server";
import { db } from "@/db";
import { trips } from "@/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireAuth();
    
    // Current financial year (July 1 to June 30)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    let fyStartYear: number;
    let fyEndYear: number;
    
    if (currentMonth >= 7) {
      fyStartYear = currentYear;
      fyEndYear = currentYear + 1;
    } else {
      fyStartYear = currentYear - 1;
      fyEndYear = currentYear;
    }
    
    const fyStart = `${fyStartYear}-07-01`;
    const fyEnd = `${fyEndYear}-06-30`;
    
    // Current month stats
    const monthStart = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
    const lastDay = new Date(currentYear, currentMonth, 0).getDate();
    const monthEnd = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    
    // Total trips
    const [totalTripsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(trips)
      .where(eq(trips.userId, user.id));
    
    // Business trips this FY
    const [businessTripsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(trips)
      .where(
        and(
          eq(trips.userId, user.id),
          eq(trips.isBusinessTrip, true),
          gte(trips.tripDate, fyStart),
          lte(trips.tripDate, fyEnd)
        )
      );
    
    // Total distance this FY
    const [totalDistanceResult] = await db
      .select({ 
        total: sql<string>`coalesce(sum(${trips.distanceKm}::numeric), 0)` 
      })
      .from(trips)
      .where(
        and(
          eq(trips.userId, user.id),
          gte(trips.tripDate, fyStart),
          lte(trips.tripDate, fyEnd)
        )
      );
    
    // Total fare this FY
    const [totalFareResult] = await db
      .select({ 
        total: sql<string>`coalesce(sum(${trips.fareAmount}::numeric), 0)` 
      })
      .from(trips)
      .where(
        and(
          eq(trips.userId, user.id),
          gte(trips.tripDate, fyStart),
          lte(trips.tripDate, fyEnd)
        )
      );
    
    // Month trips
    const [monthTripsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(trips)
      .where(
        and(
          eq(trips.userId, user.id),
          gte(trips.tripDate, monthStart),
          lte(trips.tripDate, monthEnd)
        )
      );
    
    // Month distance
    const [monthDistanceResult] = await db
      .select({ 
        total: sql<string>`coalesce(sum(${trips.distanceKm}::numeric), 0)` 
      })
      .from(trips)
      .where(
        and(
          eq(trips.userId, user.id),
          gte(trips.tripDate, monthStart),
          lte(trips.tripDate, monthEnd)
        )
      );
    
    // Recent trips
    const recentTrips = await db
      .select()
      .from(trips)
      .where(eq(trips.userId, user.id))
      .orderBy(sql`${trips.tripDate} desc, ${trips.startTime} desc`)
      .limit(5);
    
    // Monthly breakdown for chart (last 6 months)
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyBreakdown = await db
      .select({
        month: sql<string>`to_char(${trips.tripDate}::date, 'YYYY-MM')`,
        count: sql<number>`count(*)`,
        distance: sql<string>`coalesce(sum(${trips.distanceKm}::numeric), 0)`,
      })
      .from(trips)
      .where(
        and(
          eq(trips.userId, user.id),
          gte(trips.tripDate, sixMonthsAgo.toISOString().split("T")[0])
        )
      )
      .groupBy(sql`to_char(${trips.tripDate}::date, 'YYYY-MM')`)
      .orderBy(sql`to_char(${trips.tripDate}::date, 'YYYY-MM')`);
    
    return NextResponse.json({
      overview: {
        totalTrips: totalTripsResult.count,
        businessTripsFY: businessTripsResult.count,
        totalDistanceFY: Number(totalDistanceResult.total),
        totalFareFY: Number(totalFareResult.total),
        monthTrips: monthTripsResult.count,
        monthDistance: Number(monthDistanceResult.total),
      },
      financialYear: `${fyStartYear}-${fyEndYear}`,
      recentTrips,
      monthlyBreakdown,
    });
  } catch (error) {
    console.error("Stats error:", error);
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "An error occurred while fetching stats" },
      { status: 500 }
    );
  }
}
