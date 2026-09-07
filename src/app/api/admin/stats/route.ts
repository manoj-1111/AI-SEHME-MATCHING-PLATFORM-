import { NextResponse } from "next/server";
import { db } from "@/db";
import { applications, matchRuns, profiles, schemes, users } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
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
