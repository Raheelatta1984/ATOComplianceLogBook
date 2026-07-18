import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { hashPassword } from "@/lib/auth";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

// Australian addresses for realistic data
const australianAddresses = [
  { address: "259 George St, Sydney NSW 2000", suburb: "Sydney", state: "NSW", postcode: "2000", lat: "-33.8612", lng: "151.2089" },
  { address: "500 Bourke St, Melbourne VIC 3000", suburb: "Melbourne", state: "VIC", postcode: "3000", lat: "-37.8136", lng: "144.9631" },
  { address: "100 Queen St, Brisbane QLD 4000", suburb: "Brisbane", state: "QLD", postcode: "4000", lat: "-27.4698", lng: "153.0251" },
  { address: "King William St, Adelaide SA 5000", suburb: "Adelaide", state: "SA", postcode: "5000", lat: "-34.9289", lng: "138.6011" },
  { address: "100 St Georges Terrace, Perth WA 6000", suburb: "Perth", state: "WA", postcode: "6000", lat: "-31.9505", lng: "115.8605" },
  { address: "24 Murray St, Hobart TAS 7000", suburb: "Hobart", state: "TAS", postcode: "7000", lat: "-42.8821", lng: "147.3257" },
  { address: "102-112 Gouger St, Adelaide SA 5000", suburb: "Adelaide", state: "SA", postcode: "5000", lat: "-34.9328", lng: "138.5978" },
  { address: "45 Northbourne Ave, Canberra ACT 2601", suburb: "Canberra", state: "ACT", postcode: "2601", lat: "-35.2777", lng: "149.1307" },
  { address: "1 Railway Square, Sydney NSW 2000", suburb: "Sydney", state: "NSW", postcode: "2000", lat: "-33.8896", lng: "151.2006" },
  { address: "185 Acland St, St Kilda VIC 3182", suburb: "St Kilda", state: "VIC", postcode: "3182", lat: "-37.8689", lng: "144.9808" },
  { address: "380 Queen St, Brisbane QLD 4000", suburb: "Brisbane", state: "QLD", postcode: "4000", lat: "-27.4631", lng: "153.0248" },
  { address: "91 Wattle St, Ultimo NSW 2007", suburb: "Ultimo", state: "NSW", postcode: "2007", lat: "-33.8776", lng: "151.1990" },
  { address: "55 Swanston St, Melbourne VIC 3000", suburb: "Melbourne", state: "VIC", postcode: "3000", lat: "-37.8142", lng: "144.9638" },
  { address: "200 Kent St, Sydney NSW 2000", suburb: "Sydney", state: "NSW", postcode: "2000", lat: "-33.8661", lng: "151.2054" },
  { address: "400 George St, Brisbane QLD 4000", suburb: "Brisbane", state: "QLD", postcode: "4000", lat: "-27.4644", lng: "153.0255" },
  { address: "123 Collins St, Melbourne VIC 3000", suburb: "Melbourne", state: "VIC", postcode: "3000", lat: "-37.8147", lng: "144.9716" },
  { address: "10 Macquarie St, Sydney NSW 2000", suburb: "Sydney", state: "NSW", postcode: "2000", lat: "-33.8688", lng: "151.2142" },
  { address: "240 Sturt St, Adelaide SA 5000", suburb: "Adelaide", state: "SA", postcode: "5000", lat: "-34.9349", lng: "138.5975" },
  { address: "140 St Georges Rd, Fitzroy North VIC 3068", suburb: "Fitzroy North", state: "VIC", postcode: "3068", lat: "-37.7874", lng: "144.9824" },
  { address: "88 Acland St, St Kilda VIC 3182", suburb: "St Kilda", state: "VIC", postcode: "3182", lat: "-37.8686", lng: "144.9805" },
];

const tripPurposes = [
  "Airport pickup - Passenger to CBD",
  "Corporate transfer - Business meeting",
  "Medical appointment transport",
  "Night shift worker commute",
  "Tourist transfer - Hotel to attractions",
  "Event transport - Concert/Show",
  "Shopping trip - Elderly passenger",
  "Student commute - University",
  "Airport dropoff - Business traveler",
  "Hospital visit transport",
  "Weekend gig - City to Beach",
  "Late night transport - CBD",
  "Business breakfast meeting transport",
  "Conference delegate transfer",
  "Real estate inspection transport",
];

async function seed() {
  console.log("🌱 Seeding database...");
  
  // Create demo user
  const passwordHash = hashPassword("demo123456");
  
  const [demoUser] = await db
    .insert(schema.users)
    .values({
      email: "demo@triplogger.com.au",
      passwordHash,
      name: "James Mitchell",
      businessName: "Mitchell Rideshare Pty Ltd",
      abn: "12345678901",
      phone: "0412345678",
    })
    .returning();
  
  console.log(`✅ Created demo user: ${demoUser.email}`);
  
  // Generate trips for the last 12 months
  const trips = [];
  const now = new Date();
  
  for (let monthsBack = 0; monthsBack < 12; monthsBack++) {
    const monthDate = new Date(now);
    monthDate.setMonth(monthDate.getMonth() - monthsBack);
    
    const tripsInMonth = Math.floor(Math.random() * 15) + 8; // 8-22 trips per month
    
    for (let day = 0; day < tripsInMonth; day++) {
      const tripDate = new Date(monthDate);
      tripDate.setDate(Math.floor(Math.random() * 28) + 1);
      
      const pickup = australianAddresses[Math.floor(Math.random() * australianAddresses.length)];
      let dropoff = australianAddresses[Math.floor(Math.random() * australianAddresses.length)];
      while (dropoff.address === pickup.address) {
        dropoff = australianAddresses[Math.floor(Math.random() * australianAddresses.length)];
      }
      
      const startHour = Math.floor(Math.random() * 14) + 6; // 6 AM to 8 PM
      const startMinute = Math.floor(Math.random() * 60);
      const durationMinutes = Math.floor(Math.random() * 60) + 15; // 15-75 minutes
      const endHour = startHour + Math.floor((startMinute + durationMinutes) / 60);
      const endMinute = (startMinute + durationMinutes) % 60;
      
      const baseOdometer = 45000 + (12 - monthsBack) * 1500;
      const startOdometer = baseOdometer + day * 30 + Math.floor(Math.random() * 50);
      const distance = Math.floor(Math.random() * 30) + 5; // 5-35 km
      const endOdometer = startOdometer + distance;
      
      const fare = Math.round((distance * 2.5 + Math.random() * 10) * 100) / 100;
      
      trips.push({
        userId: demoUser.id,
        tripDate: tripDate.toISOString().split("T")[0],
        startTime: `${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}`,
        endTime: `${String(Math.min(endHour, 23)).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`,
        startOdometer: startOdometer.toString(),
        endOdometer: endOdometer.toString(),
        distanceKm: distance.toString(),
        pickupAddress: pickup.address,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        pickupSuburb: pickup.suburb,
        pickupState: pickup.state,
        pickupPostcode: pickup.postcode,
        dropoffAddress: dropoff.address,
        dropoffLat: dropoff.lat,
        dropoffLng: dropoff.lng,
        dropoffSuburb: dropoff.suburb,
        dropoffState: dropoff.state,
        dropoffPostcode: dropoff.postcode,
        isBusinessTrip: Math.random() > 0.1, // 90% business trips
        tripPurpose: tripPurposes[Math.floor(Math.random() * tripPurposes.length)],
        fareAmount: fare.toFixed(2),
        source: Math.random() > 0.8 ? (Math.random() > 0.5 ? "google_maps" : "waze") : "manual",
        notes: Math.random() > 0.7 ? "Smooth trip, passenger was friendly" : null,
      });
    }
  }
  
  // Insert trips in batches
  const batchSize = 50;
  for (let i = 0; i < trips.length; i += batchSize) {
    const batch = trips.slice(i, i + batchSize);
    await db.insert(schema.trips).values(batch);
  }
  
  console.log(`✅ Created ${trips.length} demo trips`);
  
  console.log("\n🎉 Seed completed!");
  console.log("📧 Login: demo@triplogger.com.au");
  console.log("🔑 Password: demo123456");
  
  await pool.end();
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
