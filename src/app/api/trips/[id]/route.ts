import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { trips } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    
    const [trip] = await db
      .select()
      .from(trips)
      .where(and(eq(trips.id, id), eq(trips.userId, user.id)))
      .limit(1);
    
    if (!trip) {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ trip });
  } catch (error) {
    console.error("Get trip error:", error);
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    
    // Check trip exists and belongs to user
    const [existingTrip] = await db
      .select()
      .from(trips)
      .where(and(eq(trips.id, id), eq(trips.userId, user.id)))
      .limit(1);
    
    if (!existingTrip) {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 }
      );
    }
    
    const {
      tripDate, startTime, endTime,
      startOdometer, endOdometer,
      pickupAddress, pickupLat, pickupLng, pickupSuburb, pickupState, pickupPostcode,
      dropoffAddress, dropoffLat, dropoffLng, dropoffSuburb, dropoffState, dropoffPostcode,
      isBusinessTrip, tripPurpose, fareAmount, source, notes,
    } = body;
    
    // Calculate distance
    const startOdo = startOdometer || existingTrip.startOdometer;
    const endOdo = endOdometer || existingTrip.endOdometer;
    const distanceKm = endOdo ? Number(endOdo) - Number(startOdo) : null;
    
    const [updatedTrip] = await db
      .update(trips)
      .set({
        ...(tripDate !== undefined && { tripDate }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime: endTime || null }),
        ...(startOdometer !== undefined && { startOdometer }),
        ...(endOdometer !== undefined && { endOdometer: endOdometer || null }),
        ...(distanceKm !== null && distanceKm !== undefined && { distanceKm: distanceKm.toString() }),
        ...(pickupAddress !== undefined && { pickupAddress }),
        ...(pickupLat !== undefined && { pickupLat: pickupLat || null }),
        ...(pickupLng !== undefined && { pickupLng: pickupLng || null }),
        ...(pickupSuburb !== undefined && { pickupSuburb: pickupSuburb || null }),
        ...(pickupState !== undefined && { pickupState: pickupState || null }),
        ...(pickupPostcode !== undefined && { pickupPostcode: pickupPostcode || null }),
        ...(dropoffAddress !== undefined && { dropoffAddress }),
        ...(dropoffLat !== undefined && { dropoffLat: dropoffLat || null }),
        ...(dropoffLng !== undefined && { dropoffLng: dropoffLng || null }),
        ...(dropoffSuburb !== undefined && { dropoffSuburb: dropoffSuburb || null }),
        ...(dropoffState !== undefined && { dropoffState: dropoffState || null }),
        ...(dropoffPostcode !== undefined && { dropoffPostcode: dropoffPostcode || null }),
        ...(isBusinessTrip !== undefined && { isBusinessTrip }),
        ...(tripPurpose !== undefined && { tripPurpose: tripPurpose || null }),
        ...(fareAmount !== undefined && { fareAmount: fareAmount || null }),
        ...(source !== undefined && { source }),
        ...(notes !== undefined && { notes: notes || null }),
        updatedAt: new Date(),
      })
      .where(eq(trips.id, id))
      .returning();
    
    return NextResponse.json({ success: true, trip: updatedTrip });
  } catch (error) {
    console.error("Update trip error:", error);
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "An error occurred while updating the trip" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    
    // Check trip exists and belongs to user
    const [existingTrip] = await db
      .select()
      .from(trips)
      .where(and(eq(trips.id, id), eq(trips.userId, user.id)))
      .limit(1);
    
    if (!existingTrip) {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 }
      );
    }
    
    await db.delete(trips).where(eq(trips.id, id));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete trip error:", error);
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "An error occurred while deleting the trip" },
      { status: 500 }
    );
  }
}
