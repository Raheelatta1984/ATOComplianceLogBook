import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cars, carExpenses, serviceRecords, mechanics, trips } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await requireAuth();
  const type = request.nextUrl.searchParams.get("type") || "all";

  const result: Record<string, unknown> = {};

  if (type === "all" || type === "cars") {
    result.cars = await db.select().from(cars).where(eq(cars.userId, user.id)).orderBy(desc(cars.createdAt));
  }
  if (type === "all" || type === "expenses") {
    result.expenses = await db.select().from(carExpenses).where(eq(carExpenses.userId, user.id)).orderBy(desc(carExpenses.expenseDate)).limit(50);
  }
  if (type === "all" || type === "service") {
    result.services = await db.select().from(serviceRecords).where(eq(serviceRecords.userId, user.id)).orderBy(desc(serviceRecords.serviceDate)).limit(20);
  }
  if (type === "all" || type === "mechanics") {
    result.mechanics = await db.select().from(mechanics).where(eq(mechanics.userId, user.id)).orderBy(desc(mechanics.rating));
  }
  if (type === "all" || type === "service") {
    // Latest odometer for service-due alerts
    const [lastTrip] = await db.select({ endOdometer: trips.endOdometer })
      .from(trips).where(eq(trips.userId, user.id))
      .orderBy(sql`COALESCE(${trips.endOdometer}, 0) DESC`).limit(1);
    result.currentOdometer = lastTrip?.endOdometer ? parseFloat(String(lastTrip.endOdometer)) : 0;
  }

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const user = await requireAuth();
  const body = await request.json();
  const { entity, action, ...data } = body;

  if (entity === "car") {
    const [created] = await db.insert(cars).values({
      userId: user.id, make: data.make, model: data.model,
      year: data.year ? parseInt(data.year) : null, color: data.color || null,
      rego: data.rego || null, vin: data.vin || null,
    }).returning();
    return NextResponse.json({ car: created });
  }

  if (entity === "service") {
    const [car] = await db.select().from(cars).where(eq(cars.userId, user.id)).limit(1);
    const [created] = await db.insert(serviceRecords).values({
      userId: user.id, carId: car?.id || null,
      serviceDate: data.serviceDate, odometer: String(data.odometer),
      serviceType: data.serviceType, amount: data.amount ? String(data.amount) : null,
      vendor: data.vendor || null, notes: data.notes || null,
      nextDueDate: data.nextDueDate || null,
      nextDueOdometer: data.nextDueOdometer ? String(data.nextDueOdometer) : null,
      invoiceImage: data.invoiceImage || null,
    }).returning();
    return NextResponse.json({ service: created });
  }

  if (entity === "mechanic") {
    const [car] = await db.select().from(cars).where(eq(cars.userId, user.id)).limit(1);
    const [created] = await db.insert(carExpenses).values({
      userId: user.id, carId: car?.id || null,
      expenseDate: data.expenseDate, category: data.category || "maintenance",
      description: data.description, amount: String(data.amount),
      vendor: data.vendor || null, odometerAt: data.odometerAt ? String(data.odometerAt) : null,
      invoiceImage: data.invoiceImage || null, ocrText: data.ocrText || null,
    }).returning();
    return NextResponse.json({ expense: created });
  }

  if (entity === "mechanicProfile") {
    const [created] = await db.insert(mechanics).values({
      userId: user.id, name: data.name, phone: data.phone || null,
      email: data.email || null, address: data.address,
      suburb: data.suburb || null, state: data.state || null,
      postcode: data.postcode || null,
      rating: data.rating ? String(data.rating) : null,
      topReviews: data.topReviews || null, notes: data.notes || null,
    }).returning();
    return NextResponse.json({ mechanic: created });
  }

  if (entity === "expense") {
    const [car] = await db.select().from(cars).where(eq(cars.userId, user.id)).limit(1);
    const [created] = await db.insert(carExpenses).values({
      userId: user.id, carId: car?.id || null,
      expenseDate: data.expenseDate, category: data.category || "maintenance",
      description: data.description, amount: String(data.amount),
      vendor: data.vendor || null, odometerAt: data.odometerAt ? String(data.odometerAt) : null,
      invoiceImage: data.invoiceImage || null, ocrText: data.ocrText || null,
    }).returning();
    return NextResponse.json({ expense: created });
  }

  return NextResponse.json({ error: "Unknown entity" }, { status: 400 });
}
