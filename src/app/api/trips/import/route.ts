import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { trips, importHistory } from "@/db/schema";
import { requireAuth } from "@/lib/auth";

// Parse Google Maps timeline JSON export
function parseGoogleMapsData(data: any[], userId: string) {
  const parsedTrips: any[] = [];
  
  for (const segment of data) {
    // Google Maps timeline can have different structures
    if (segment.activity && segment.activity.length > 0) {
      for (const activity of segment.activity) {
        if (activity.activityType === "IN_VEHICLE" && activity.waypointPath) {
          const waypoint = segment.waypointPath;
          parsedTrips.push({
            userId,
            tripDate: new Date(activity.startTime).toISOString().split("T")[0],
            startTime: new Date(activity.startTime).toTimeString().slice(0, 5),
            endTime: new Date(activity.endTime).toTimeString().slice(0, 5),
            startOdometer: 0,
            pickupAddress: activity.waypointPath?.waypoints?.[0]?.latitudeE7 
              ? `Lat: ${activity.waypointPath.waypoints[0].latitudeE7 / 1e7}` 
              : "Unknown location",
            pickupLat: activity.waypointPath?.waypoints?.[0]?.latitudeE7 
              ? (activity.waypointPath.waypoints[0].latitudeE7 / 1e7).toString() 
              : null,
            pickupLng: activity.waypointPath?.waypoints?.[0]?.longitudeE7 
              ? (activity.waypointPath.waypoints[0].longitudeE7 / 1e7).toString() 
              : null,
            dropoffAddress: activity.waypointPath?.waypoints?.[activity.waypointPath.waypoints.length - 1]?.latitudeE7 
              ? `Lat: ${activity.waypointPath.waypoints[activity.waypointPath.waypoints.length - 1].latitudeE7 / 1e7}` 
              : "Unknown location",
            dropoffLat: activity.waypointPath?.waypoints?.[activity.waypointPath.waypoints.length - 1]?.latitudeE7 
              ? (activity.waypointPath.waypoints[activity.waypointPath.waypoints.length - 1].latitudeE7 / 1e7).toString() 
              : null,
            dropoffLng: activity.waypointPath?.waypoints?.[activity.waypointPath.waypoints.length - 1]?.longitudeE7 
              ? (activity.waypointPath.waypoints[activity.waypointPath.waypoints.length - 1].longitudeE7 / 1e7).toString() 
              : null,
            isBusinessTrip: true,
            source: "google_maps",
            rawData: activity,
          });
        }
      }
    }
  }
  
  return parsedTrips;
}

// Parse Waze trip data (CSV-like format or JSON)
function parseWazeData(data: any, userId: string) {
  const parsedTrips: any[] = [];
  
  // Handle array of trips
  const tripData = Array.isArray(data) ? data : data.trips || [];
  
  for (const trip of tripData) {
    parsedTrips.push({
      userId,
      tripDate: trip.date || trip.start_time?.split("T")[0] || new Date().toISOString().split("T")[0],
      startTime: trip.start_time ? new Date(trip.start_time).toTimeString().slice(0, 5) : "00:00",
      endTime: trip.end_time ? new Date(trip.end_time).toTimeString().slice(0, 5) : null,
      startOdometer: 0,
      pickupAddress: trip.start_location || trip.origin || "Unknown location",
      pickupLat: trip.start_lat || trip.origin_lat || null,
      pickupLng: trip.start_lng || trip.origin_lng || null,
      dropoffAddress: trip.end_location || trip.destination || "Unknown location",
      dropoffLat: trip.end_lat || trip.dest_lat || null,
      dropoffLng: trip.end_lng || trip.dest_lng || null,
      isBusinessTrip: true,
      source: "waze",
      rawData: trip,
    });
  }
  
  return parsedTrips;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const formData = await request.formData();
    
    const source = formData.get("source") as string;
    const file = formData.get("file") as File;
    
    if (!source || !file) {
      return NextResponse.json(
        { error: "Source and file are required" },
        { status: 400 }
      );
    }
    
    if (!["google_maps", "waze"].includes(source)) {
      return NextResponse.json(
        { error: "Invalid source. Must be google_maps or waze" },
        { status: 400 }
      );
    }
    
    // Read file content
    const fileContent = await file.text();
    let parsedData: any;
    
    try {
      parsedData = JSON.parse(fileContent);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON file" },
        { status: 400 }
      );
    }
    
    // Parse based on source
    let parsedTrips: any[] = [];
    
    if (source === "google_maps") {
      parsedTrips = parseGoogleMapsData(parsedData, user.id);
    } else if (source === "waze") {
      parsedTrips = parseWazeData(parsedData, user.id);
    }
    
    // Import trips
    let importedCount = 0;
    const errors: string[] = [];
    
    for (const trip of parsedTrips.slice(0, 1000)) { // Limit to 1000 trips per import
      try {
        await db.insert(trips).values({
          userId: user.id,
          tripDate: trip.tripDate,
          startTime: trip.startTime,
          endTime: trip.endTime,
          startOdometer: trip.startOdometer || 0,
          endOdometer: trip.endOdometer || null,
          distanceKm: trip.distanceKm || null,
          pickupAddress: trip.pickupAddress,
          pickupLat: trip.pickupLat || null,
          pickupLng: trip.pickupLng || null,
          pickupSuburb: trip.pickupSuburb || null,
          pickupState: trip.pickupState || null,
          pickupPostcode: trip.pickupPostcode || null,
          dropoffAddress: trip.dropoffAddress,
          dropoffLat: trip.dropoffLat || null,
          dropoffLng: trip.dropoffLng || null,
          dropoffSuburb: trip.dropoffSuburb || null,
          dropoffState: trip.dropoffState || null,
          dropoffPostcode: trip.dropoffPostcode || null,
          isBusinessTrip: trip.isBusinessTrip,
          source: source as "google_maps" | "waze",
        });
        importedCount++;
      } catch (err) {
        errors.push(`Failed to import trip: ${(err as Error).message}`);
      }
    }
    
    // Record import history
    await db.insert(importHistory).values({
      userId: user.id,
      source: source as "google_maps" | "waze",
      fileName: file.name,
      tripsImported: importedCount,
      status: errors.length > 0 ? "completed" : "completed",
      errorMessage: errors.length > 0 ? errors.join("; ") : null,
    });
    
    return NextResponse.json({
      success: true,
      importedCount,
      totalFound: parsedTrips.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Import error:", error);
    if ((error as Error).message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "An error occurred during import" },
      { status: 500 }
    );
  }
}
