import { NextResponse } from "next/server";
import { db } from "@/db";
import { applications, matchRuns, profiles, schemes, users } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { SCHEMES } from "@/data/schemes";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        totals: {
          entrepreneurs: 5,
          schemes: SCHEMES.length,
          recommendations: 12,
          applications: 3,
          successfulMatches: 12,
        },
        byState: [{ name: "Tamil Nadu", value: 3 }, { name: "Karnataka", value: 2 }],
        byCategory: [{ name: "SC", value: 2 }, { name: "ST", value: 1 }, { name: "OBC", value: 1 }],
        bySector: [{ name: "Food Processing", value: 2 }, { name: "Agriculture", value: 1 }],
        byAppStatus: [{ name: "Under Review", value: 2 }, { name: "Submitted", value: 1 }],
        mostRecommended: SCHEMES.slice(0, 5).map((s) => ({ name: s.name, value: 5 })),
        schemes: SCHEMES.map((s) => ({
          id: s.id,
          name: s.name,
          ministry: s.ministry,
          verificationStatus: s.verificationStatus,
          lastVerified: s.lastVerified,
          isActive: true,
        })),
      });
    }

    await ensureSeeded();
    const [userCount, schemeCount, runCount, appCount] = await Promise.all([
      db.select({ c: sql<number>`count(*)::int` }).from(users),
      db.select({ c: sql<number>`count(*)::int` }).from(schemes),
      db.select({ c: sql<number>`count(*)::int` }).from(matchRuns),
      db.select({ c: sql<number>`count(*)::int` }).from(applications),
    ]);

    const profileRows = await db.select().from(profiles);
    const appRows = await db.select().from(applications);
    const runRows = await db.select().from(matchRuns);
    const schemeRows = await db.select().from(schemes);

    const countBy = (arr: (string | null)[]) => {
      const m = new Map<string, number>();
      for (const v of arr) {
        const k = v || "Unknown";
        m.set(k, (m.get(k) ?? 0) + 1);
      }
      return [...m.entries()].map(([name, value]) => ({ name, value }));
    };

    const byState = countBy(profileRows.map((p) => p.state));
    const byCategory = countBy(profileRows.map((p) => p.category));
    const bySector = countBy(profileRows.map((p) => p.sector));
    const byAppStatus = countBy(appRows.map((a) => a.status));

    // Most recommended schemes across match runs
    const schemeCounts = new Map<string, number>();
    for (const r of runRows) {
      const tops = r.topSchemes as { id: string; name: string; score: number }[];
      for (const t of tops ?? [])
        schemeCounts.set(t.name, (schemeCounts.get(t.name) ?? 0) + 1);
    }
    const mostRecommended = [...schemeCounts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const successfulMatches = runRows.filter(
      (r) => ((r.topSchemes as unknown[]) ?? []).length > 0,
    ).length;

    return NextResponse.json({
      totals: {
        entrepreneurs: userCount[0].c,
        schemes: schemeCount[0].c,
        recommendations: runCount[0].c,
        applications: appCount[0].c,
        successfulMatches,
      },
      byState,
      byCategory,
      bySector,
      byAppStatus,
      mostRecommended,
      schemes: schemeRows.map((s) => ({
        id: s.id,
        name: s.name,
        ministry: s.ministry,
        verificationStatus: s.verificationStatus,
        lastVerified: s.lastVerified,
        isActive: s.isActive,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
