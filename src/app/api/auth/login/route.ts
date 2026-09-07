import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { eq } from "drizzle-orm";

/** Demo authentication — no passwords/Aadhaar. Creates or returns a user. */
export async function POST(req: NextRequest) {
  try {
    await ensureSeeded();
    const { name, email } = (await req.json()) as { name?: string; email?: string };
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });

    const existing = (await db.select().from(users).where(eq(users.email, email)))[0];
    if (existing)
      return NextResponse.json({
        user: { id: existing.id, name: existing.name, email: existing.email, role: existing.role },
      });

    const inserted = await db
      .insert(users)
      .values({ name: name?.trim() || email.split("@")[0], email, role: "entrepreneur" })
      .returning();
    const u = inserted[0];
    return NextResponse.json({
      user: { id: u.id, name: u.name, email: u.email, role: u.role },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
