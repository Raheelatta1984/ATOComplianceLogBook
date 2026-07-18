import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { User } from "@/db/schema";

const COOKIE_NAME = "sid";
const SECRET = "triplog-secret-2024-at0-compliant-rideshare";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(salt + password).digest("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const verify = createHash("sha256").update(salt + password).digest("hex");
  return hash === verify;
}

function makeToken(userId: string): string {
  const payload = `${userId}:${Date.now() + 30 * 24 * 60 * 60 * 1000}`;
  const sig = createHash("sha256").update(payload + SECRET).digest("hex").slice(0, 32);
  return Buffer.from(payload).toString("base64url") + "." + sig;
}

function readToken(token: string): string | null {
  try {
    const [data, sig] = token.split(".");
    if (!data || !sig) return null;
    const payload = Buffer.from(data, "base64url").toString();
    const expected = createHash("sha256").update(payload + SECRET).digest("hex").slice(0, 32);
    if (sig !== expected) return null;
    const [userId, exp] = payload.split(":");
    if (Number(exp) < Date.now()) return null;
    return userId;
  } catch {
    return null;
  }
}

export function setAuthCookie(response: NextResponse, userId: string): NextResponse {
  const token = makeToken(userId);
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: false,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

export function clearAuthCookie(response: NextResponse): NextResponse {
  response.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return response;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const userId = readToken(token);
    if (!userId) return null;

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return user || null;
  } catch (e) {
    console.error("getCurrentUser error:", e);
    return null;
  }
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}
