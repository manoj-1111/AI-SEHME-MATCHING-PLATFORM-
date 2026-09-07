import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { schemes, matchRuns, profiles, users } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { matchSchemes } from "@/lib/matching/engine";
import type { Scheme, UserProfile } from "@/types";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    await ensureSeeded();
    const body = (await req.json()) as { profile: UserProfile; userId?: number };
    const profile = body.profile;
    if (!profile || !profile.state || !profile.category)
      return NextResponse.json(
        { error: "Incomplete profile — state and category are required" },
        { status: 400 },
      );

    const rows = await db.select().from(schemes).where(eq(schemes.isActive, true));
    const list = rows.map((r) => ({
      ...(r.data as Scheme),
      verificationStatus: r.verificationStatus as Scheme["verificationStatus"],
      lastVerified: r.lastVerified,
    }));

    const { eligible, ineligible } = matchSchemes(profile, list);

    // Persist run + profile snapshot for analytics (best-effort)
    try {
      let userId = body.userId ?? null;
      if (userId) {
        const u = (await db.select().from(users).where(eq(users.id, userId)))[0];
        if (!u) userId = null;
      }
      if (userId) {
        const existing = (
          await db.select().from(profiles).where(eq(profiles.userId, userId))
        )[0];
        const values = {
          state: profile.state,
          category: profile.category,
          gender: profile.gender,
          sector: profile.sector,
          area: profile.area,
          data: profile,
          updatedAt: new Date(),
        };
        if (existing)
          await db.update(profiles).set(values).where(eq(profiles.userId, userId));
        else await db.insert(profiles).values({ userId, ...values });
      }
      await db.insert(matchRuns).values({
        userId,
        profileSummary: {
          state: profile.state,
          category: profile.category,
          gender: profile.gender,
          sector: profile.sector,
        },
        topSchemes: eligible.slice(0, 5).map((m) => ({
          id: m.schemeId,
          name: m.schemeName,
          score: m.score,
        })),
      });
    } catch (e) {
      console.error("match run persist failed", e);
    }

    return NextResponse.json({ eligible, ineligible });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Matching failed" }, { status: 500 });
  }
}
