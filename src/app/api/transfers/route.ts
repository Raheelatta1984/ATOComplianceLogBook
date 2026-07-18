import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  await requireAuth();
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, "transfer_providers")).limit(1);
  return NextResponse.json({ providers: row?.value || [] });
}

export async function POST(request: NextRequest) {
  const user = await requireAuth();
  const { providers } = await request.json();

  await db.insert(appSettings).values({
    key: "transfer_providers", value: providers, updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: appSettings.key, set: { value: providers, updatedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
