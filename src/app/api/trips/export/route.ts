import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { trips } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { format, parseISO } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    
    const format_type = searchParams.get("format") || "csv";
    const financialYear = searchParams.get("financialYear"); // e.g., "2024-2025"
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const businessOnly = searchParams.get("businessOnly") === "true";
    
    // Build where conditions
    const conditions = [eq(trips.userId, user.id)];
    
    // Financial year dates (July 1 to June 30 in Australia)
    if (financialYear) {
      const [startYear, endYear] = financialYear.split("-").map(Number);
      if (startYear && endYear) {
        conditions.push(gte(trips.tripDate, `${startYear}-07-01`));
        conditions.push(lte(trips.tripDate, `${endYear}-06-30`));
      }
    } else if (startDate && endDate) {
      conditions.push(gte(trips.tripDate, startDate));
      conditions.push(lte(trips.tripDate, endDate));
    }
    
    if (businessOnly) {
      conditions.push(eq(trips.isBusinessTrip, true));
    }
    
    // Get trips
    const userTrips = await db
      .select()
      .from(trips)
      .where(and(...conditions))
      .orderBy(trips.tripDate, trips.startTime);
    
    // Calculate summary
    const totalDistance = userTrips.reduce((sum, trip) => {
      return sum + (trip.distanceKm ? Number(trip.distanceKm) : 0);
    }, 0);
    
    const businessTrips = userTrips.filter(t => t.isBusinessTrip);
    const totalBusinessDistance = businessTrips.reduce((sum, trip) => {
      return sum + (trip.distanceKm ? Number(trip.distanceKm) : 0);
    }, 0);
    
    const totalFare = userTrips.reduce((sum, trip) => {
      return sum + (trip.fareAmount ? Number(trip.fareAmount) : 0);
    }, 0);
    
    if (format_type === "csv") {
      // Generate CSV
      const headers = [
        "Date",
        "Start Time",
        "End Time",
        "Pickup Address",
        "Pickup Latitude",
        "Pickup Longitude",
        "Pickup Suburb",
        "Pickup State",
        "Pickup Postcode",
        "Dropoff Address",
        "Dropoff Latitude",
        "Dropoff Longitude",
        "Dropoff Suburb",
        "Dropoff State",
        "Dropoff Postcode",
        "Start Odometer (km)",
        "End Odometer (km)",
        "Distance (km)",
        "Business Trip",
        "Trip Purpose",
        "Fare Amount (AUD)",
        "Source",
        "Notes",
      ];
      
      const rows = userTrips.map(trip => [
        trip.tripDate,
        trip.startTime,
        trip.endTime || "",
        `"${trip.pickupAddress.replace(/"/g, '""')}"`,
        trip.pickupLat || "",
        trip.pickupLng || "",
        trip.pickupSuburb || "",
        trip.pickupState || "",
        trip.pickupPostcode || "",
        `"${trip.dropoffAddress.replace(/"/g, '""')}"`,
        trip.dropoffLat || "",
        trip.dropoffLng || "",
        trip.dropoffSuburb || "",
        trip.dropoffState || "",
        trip.dropoffPostcode || "",
        trip.startOdometer,
        trip.endOdometer || "",
        trip.distanceKm || "",
        trip.isBusinessTrip ? "Yes" : "No",
        trip.tripPurpose ? `"${trip.tripPurpose.replace(/"/g, '""')}"` : "",
        trip.fareAmount || "0.00",
        trip.source,
        trip.notes ? `"${trip.notes.replace(/"/g, '""')}"` : "",
      ]);
      
      const csv = [
        "# ATO Travel Logbook Export",
        `# Driver: ${user.name}`,
        user.businessName ? `# Business: ${user.businessName}` : null,
        user.abn ? `# ABN: ${user.abn}` : null,
        `# Export Date: ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
        `# Financial Year: ${financialYear || "All Time"}`,
        `# Total Trips: ${userTrips.length}`,
        `# Business Trips: ${businessTrips.length}`,
        `# Total Distance: ${totalDistance.toFixed(2)} km`,
        `# Business Distance: ${totalBusinessDistance.toFixed(2)} km`,
        `# Total Fare: $${totalFare.toFixed(2)}`,
        "#",
        headers.join(","),
        ...rows.map(row => row.join(",")),
      ].filter(Boolean).join("\n");
      
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="travel-logbook-${financialYear || "export"}.csv"`,
        },
      });
    }
    
    // JSON format
    return NextResponse.json({
      exportDate: new Date().toISOString(),
      driver: {
        name: user.name,
        businessName: user.businessName,
        abn: user.abn,
      },
      financialYear,
      summary: {
        totalTrips: userTrips.length,
        businessTrips: businessTrips.length,
        totalDistance: Number(totalDistance.toFixed(2)),
        businessDistance: Number(totalBusinessDistance.toFixed(2)),
        totalFare: Number(totalFare.toFixed(2)),
      },
      trips: userTrips.map(trip => ({
        date: trip.tripDate,
        startTime: trip.startTime,
        endTime: trip.endTime,
        pickup: {
          address: trip.pickupAddress,
          lat: trip.pickupLat,
          lng: trip.pickupLng,
          suburb: trip.pickupSuburb,
          state: trip.pickupState,
          postcode: trip.pickupPostcode,
        },
        dropoff: {
          address: trip.dropoffAddress,
          lat: trip.dropoffLat,
          lng: trip.dropoffLng,
          suburb: trip.dropoffSuburb,
          state: trip.dropoffState,
          postcode: trip.dropoffPostcode,
        },
        odometer: {
          start: trip.startOdometer,
          end: trip.endOdometer,
          distance: trip.distanceKm,
        },
        isBusinessTrip: trip.isBusinessTrip,
        tripPurpose: trip.tripPurpose,
        fareAmount: trip.fareAmount,
        source: trip.source,
        notes: trip.notes,
      })),
    });
  } catch (error) {
    console.error("Export error:", error);
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "An error occurred during export" },
      { status: 500 }
    );
  }
}
