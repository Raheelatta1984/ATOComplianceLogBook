import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { trips } from "@/db/schema";
import { eq, desc, and, like, gte, lte, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    
    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;
    
    // Filters
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");
    const source = searchParams.get("source");
    const businessOnly = searchParams.get("businessOnly") === "true";
    
    // Build where conditions
    const conditions = [eq(trips.userId, user.id)];
    
    if (startDate) {
      conditions.push(gte(trips.tripDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(trips.tripDate, endDate));
    }
    if (source) {
      conditions.push(eq(trips.source, source));
    }
    if (businessOnly) {
      conditions.push(eq(trips.isBusinessTrip, true));
    }
    if (search) {
      conditions.push(
        sql`(${trips.pickupAddress} ILIKE ${`%${search}%`} OR ${trips.dropoffAddress} ILIKE ${`%${search}%`})`
      );
    }
    
    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];
    
    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(trips)
      .where(whereClause);
    
    // Get trips
    const userTrips = await db
      .select()
      .from(trips)
      .where(whereClause)
      .orderBy(desc(trips.tripDate), desc(trips.startTime))
      .limit(limit)
      .offset(offset);
    
    return NextResponse.json({
      trips: userTrips,
      pagination: {
        page,
        limit,
        total: Number(countResult.count),
        totalPages: Math.ceil(Number(countResult.count) / limit),
      },
    });
  } catch (error) {
    console.error("Get trips error:", error);
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "An error occurred while fetching trips" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    
    const {
      tripDate, startTime, endTime,
      startOdometer, endOdometer,
      pickupAddress, pickupLat, pickupLng, pickupSuburb, pickupState, pickupPostcode,
      dropoffAddress, dropoffLat, dropoffLng, dropoffSuburb, dropoffState, dropoffPostcode,
      isBusinessTrip, tripPurpose, fareAmount, source, notes,
    } = body;
    
    if (!tripDate || !startTime || !startOdometer || !pickupAddress || !dropoffAddress) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Calculate distance
    const distanceKm = endOdometer ? endOdometer - startOdometer : null;
    
    const [newTrip] = await db
      .insert(trips)
      .values({
        userId: user.id,
        tripDate,
        startTime,
        endTime: endTime || null,
        startOdometer,
        endOdometer: endOdometer || null,
        distanceKm: distanceKm?.toString() || null,
        pickupAddress,
        pickupLat: pickupLat || null,
        pickupLng: pickupLng || null,
        pickupSuburb: pickupSuburb || null,
        pickupState: pickupState || null,
        pickupPostcode: pickupPostcode || null,
        dropoffAddress,
        dropoffLat: dropoffLat || null,
        dropoffLng: dropoffLng || null,
        dropoffSuburb: dropoffSuburb || null,
        dropoffState: dropoffState || null,
        dropoffPostcode: dropoffPostcode || null,
        isBusinessTrip: isBusinessTrip !== false,
        tripPurpose: tripPurpose || null,
        fareAmount: fareAmount || null,
        source: source || "manual",
        notes: notes || null,
      })
      .returning();
    
    return NextResponse.json({ success: true, trip: newTrip }, { status: 201 });
  } catch (error) {
    console.error("Create trip error:", error);
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "An error occurred while creating the trip" },
      { status: 500 }
    );
  }
}
