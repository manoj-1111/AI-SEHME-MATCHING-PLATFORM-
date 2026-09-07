import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { schemes } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { eq } from "drizzle-orm";
import type { Scheme } from "@/types";

export async function GET(req: NextRequest) {
  try {
    await ensureSeeded();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.toLowerCase() ?? "";
    const includeInactive = searchParams.get("all") === "1";

    const rows = await db.select().from(schemes);
    let list = rows
      .filter((r) => includeInactive || r.isActive)
      .map((r) => ({
        ...(r.data as Scheme),
        verificationStatus: r.verificationStatus as Scheme["verificationStatus"],
        lastVerified: r.lastVerified,
        isActive: r.isActive,
      }));

    if (q) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.ministry.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.sectors.some((sec) => sec.toLowerCase().includes(q)) ||
          s.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return NextResponse.json({ schemes: list });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load schemes" }, { status: 500 });
  }
}

// Admin: add a new scheme
export async function POST(req: NextRequest) {
  try {
    await ensureSeeded();
    const body = (await req.json()) as Partial<Scheme>;
    if (!body.name || !body.ministry || !body.description)
      return NextResponse.json({ error: "name, ministry and description are required" }, { status: 400 });

    const id =
      body.id || body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    const scheme: Scheme = {
      id,
      name: body.name,
      ministry: body.ministry,
      description: body.description,
      targetBeneficiaries: body.targetBeneficiaries ?? "",
      states: body.states ?? [],
      categories: body.categories ?? [],
      targetGroupsAny: body.targetGroupsAny ?? [],
      genders: body.genders ?? [],
      minAge: body.minAge ?? null,
      maxAge: body.maxAge ?? null,
      incomeLimit: body.incomeLimit ?? null,
      sectors: body.sectors ?? [],
      sectorHard: body.sectorHard ?? false,
      stages: body.stages ?? [],
      minFunding: body.minFunding ?? null,
      maxFunding: body.maxFunding ?? null,
      loan: body.loan ?? false,
      subsidy: body.subsidy ?? false,
      grant: body.grant ?? false,
      training: body.training ?? false,
      requiresDisability: body.requiresDisability ?? false,
      requiresMinority: body.requiresMinority ?? false,
      supportTypes: body.supportTypes ?? [],
      documents: body.documents ?? [],
      benefits: body.benefits ?? [],
      eligibility: body.eligibility ?? [],
      applicationSteps: body.applicationSteps ?? [],
      officialUrl: body.officialUrl ?? "",
      lastVerified: new Date().toISOString().slice(0, 10),
      verificationStatus: "demo",
      tags: body.tags ?? [],
    };
    await db.insert(schemes).values({
      id,
      name: scheme.name,
      ministry: scheme.ministry,
      description: scheme.description,
      verificationStatus: "demo",
      lastVerified: scheme.lastVerified,
      isActive: true,
      data: scheme,
    });
    return NextResponse.json({ scheme });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create scheme" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  // Admin: verify / mark outdated / activate / deactivate
  try {
    const body = (await req.json()) as {
      id: string;
      action: "verify" | "outdated" | "delete" | "toggle";
    };
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const row = (await db.select().from(schemes).where(eq(schemes.id, body.id)))[0];
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (body.action === "delete") {
      await db.delete(schemes).where(eq(schemes.id, body.id));
      return NextResponse.json({ ok: true });
    }
    const today = new Date().toISOString().slice(0, 10);
    const data = row.data as Scheme;
    if (body.action === "verify") {
      await db
        .update(schemes)
        .set({
          verificationStatus: "verified",
          lastVerified: today,
          data: { ...data, verificationStatus: "verified", lastVerified: today },
        })
        .where(eq(schemes.id, body.id));
    } else if (body.action === "outdated") {
      await db
        .update(schemes)
        .set({
          verificationStatus: "demo",
          data: { ...data, verificationStatus: "demo" },
        })
        .where(eq(schemes.id, body.id));
    } else if (body.action === "toggle") {
      await db.update(schemes).set({ isActive: !row.isActive }).where(eq(schemes.id, body.id));
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update scheme" }, { status: 500 });
  }
}
