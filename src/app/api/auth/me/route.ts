import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, businessName: user.businessName, abn: user.abn, phone: user.phone },
  });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { name, businessName, abn, phone } = await request.json();

  const [updated] = await db.update(users).set({
    ...(name !== undefined && { name: name.trim() }),
    ...(businessName !== undefined && { businessName: businessName?.trim() || null }),
    ...(abn !== undefined && { abn: abn?.trim() || null }),
    ...(phone !== undefined && { phone: phone?.trim() || null }),
    updatedAt: new Date(),
  }).where(eq(users.id, user.id)).returning();

  return NextResponse.json({
    success: true,
    user: { id: updated.id, email: updated.email, name: updated.name, businessName: updated.businessName, abn: updated.abn, phone: updated.phone },
  });
}
