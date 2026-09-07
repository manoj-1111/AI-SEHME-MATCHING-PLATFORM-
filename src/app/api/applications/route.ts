import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { eq, desc, and } from "drizzle-orm";
import type { TimelineEntry } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ applications: [] });
    }

    await ensureSeeded();
    const { searchParams } = new URL(req.url);
    const userId = Number(searchParams.get("userId") ?? 0);
    const rows = userId
      ? await db
          .select()
          .from(applications)
          .where(eq(applications.userId, userId))
          .orderBy(desc(applications.updatedAt))
      : await db.select().from(applications).orderBy(desc(applications.updatedAt));
    return NextResponse.json({ applications: rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load applications" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      userId: number;
      schemeId: string;
      schemeName: string;
    };
    if (!body.userId || !body.schemeId)
      return NextResponse.json({ error: "userId and schemeId required" }, { status: 400 });

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        application: {
          id: Date.now(),
          userId: body.userId,
          schemeId: body.schemeId,
          schemeName: body.schemeName,
          status: "Not Started",
          timeline: [
            {
              status: "Not Started",
              date: new Date().toISOString(),
              note: "Application tracking started (demo)",
            },
          ],
        },
      });
    }

    await ensureSeeded();

    const existing = (
      await db
        .select()
        .from(applications)
        .where(
          and(eq(applications.userId, body.userId), eq(applications.schemeId, body.schemeId)),
        )
    )[0];
    if (existing) return NextResponse.json({ application: existing, existed: true });

    const timeline: TimelineEntry[] = [
      {
        status: "Not Started",
        date: new Date().toISOString(),
        note: "Application tracking started (demo)",
      },
    ];
    const inserted = await db
      .insert(applications)
      .values({
        userId: body.userId,
        schemeId: body.schemeId,
        schemeName: body.schemeName,
        status: "Not Started",
        timeline,
      })
      .returning();
    return NextResponse.json({ application: inserted[0] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create application" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as { id: number; status: string; note?: string };
    if (!body.id || !body.status)
      return NextResponse.json({ error: "id and status required" }, { status: 400 });

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        application: {
          id: body.id,
          status: body.status,
          updatedAt: new Date(),
        },
      });
    }

    const row = (
      await db.select().from(applications).where(eq(applications.id, body.id))
    )[0];
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const timeline = [
      ...((row.timeline as TimelineEntry[]) ?? []),
      { status: body.status, date: new Date().toISOString(), note: body.note },
    ];
    const updated = await db
      .update(applications)
      .set({ status: body.status, timeline, updatedAt: new Date() })
      .where(eq(applications.id, body.id))
      .returning();
    return NextResponse.json({ application: updated[0] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update application" }, { status: 500 });
  }
}
