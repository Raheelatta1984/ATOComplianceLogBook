import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { chitfundPools, chitfundMembers, chitfundEntries, chitfundDraws } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const user = await requireAuth();
  const pools = await db.select().from(chitfundPools).orderBy(chitfundPools.createdAt);
  const result = [];
  for (const pool of pools) {
    const members = await db.select().from(chitfundMembers).where(eq(chitfundMembers.poolId, pool.id));
    const draws = await db.select().from(chitfundDraws).where(eq(chitfundDraws.poolId, pool.id)).orderBy(sql`${chitfundDraws.createdAt} DESC`).limit(10);
    const entries = await db.select().from(chitfundEntries).where(eq(chitfundEntries.poolId, pool.id));
    const totalContrib = entries.reduce((s, e) => s + parseFloat(String(e.amount || 0)), 0);
    result.push({ ...pool, members, draws, entries, totalContrib });
  }
  return NextResponse.json({ pools: result, currentUserId: user.id });
}

export async function POST(request: NextRequest) {
  const user = await requireAuth();
  const body = await request.json();
  const { action, poolId, name, entryDate } = body;

  // Create pool (max 30 members, $5/day default)
  if (action === "create") {
    const [pool] = await db.insert(chitfundPools).values({
      name: name || `${user.name}'s Chit Fund`,
      dailyAmount: "5", maxMembers: 30, createdBy: user.id,
    }).returning();
    await db.insert(chitfundMembers).values({
      poolId: pool.id, userId: user.id, userName: user.name,
    });
    return NextResponse.json({ pool });
  }

  // Join pool (respects 30-driver cap)
  if (action === "join") {
    const [pool] = await db.select().from(chitfundPools).where(eq(chitfundPools.id, poolId)).limit(1);
    if (!pool) return NextResponse.json({ error: "Pool not found" }, { status: 404 });
    const members = await db.select().from(chitfundMembers).where(eq(chitfundMembers.poolId, poolId));
    if (members.length >= pool.maxMembers) return NextResponse.json({ error: "Pool is full (30 drivers max)" }, { status: 400 });
    if (members.some(m => m.userId === user.id)) return NextResponse.json({ error: "Already joined" }, { status: 400 });
    const [member] = await db.insert(chitfundMembers).values({
      poolId, userId: user.id, userName: user.name,
    }).returning();
    return NextResponse.json({ member });
  }

  // Mark daily $5 contribution
  if (action === "pay") {
    const date = entryDate || new Date().toISOString().split("T")[0];
    const existing = await db.select().from(chitfundEntries)
      .where(and(eq(chitfundEntries.poolId, poolId), eq(chitfundEntries.userId, user.id), eq(chitfundEntries.entryDate, date))).limit(1);
    if (existing.length > 0) return NextResponse.json({ error: "Today already paid" }, { status: 400 });
    const [entry] = await db.insert(chitfundEntries).values({
      poolId, userId: user.id, entryDate: date, amount: "5",
    }).returning();
    return NextResponse.json({ entry });
  }

  // Lucky draw — picks unique driver who hasn't won yet
  if (action === "draw") {
    const members = await db.select().from(chitfundMembers).where(eq(chitfundMembers.poolId, poolId));
    const eligible = members.filter(m => !m.hasWon);
    if (eligible.length === 0) return NextResponse.json({ error: "All members have already won — pool complete!" }, { status: 400 });
    const today = new Date().toISOString().split("T")[0];
    const [existingDraw] = await db.select().from(chitfundDraws)
      .where(and(eq(chitfundDraws.poolId, poolId), eq(chitfundDraws.drawDate, today))).limit(1);
    if (existingDraw) return NextResponse.json({ error: `Winner already drawn today: ${existingDraw.userName}`, draw: existingDraw }, { status: 400 });

    // Pool amount = entries paid today (or total day's pot)
    const todayEntries = await db.select().from(chitfundEntries)
      .where(and(eq(chitfundEntries.poolId, poolId), eq(chitfundEntries.entryDate, today)));
    const pot = todayEntries.reduce((s, e) => s + parseFloat(String(e.amount || 0)), 0);
    const winAmount = pot > 0 ? pot : parseFloat(String(eligible.length * 5));

    const winner = eligible[Math.floor(Math.random() * eligible.length)];
    const [draw] = await db.insert(chitfundDraws).values({
      poolId, userId: winner.userId, userName: winner.userName, drawDate: today, amountWon: String(winAmount),
    }).returning();
    await db.update(chitfundMembers).set({ hasWon: true, wonDate: today, wonAmount: String(winAmount) })
      .where(eq(chitfundMembers.id, winner.id));
    return NextResponse.json({ draw, winnerName: winner.userName, amount: winAmount });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
