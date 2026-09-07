import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { schemes } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { eq } from "drizzle-orm";
import type { Scheme } from "@/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await ensureSeeded();
    const { id } = await params;
    const row = (await db.select().from(schemes).where(eq(schemes.id, id)))[0];
    if (!row) return NextResponse.json({ error: "Scheme not found" }, { status: 404 });
    const scheme = {
      ...(row.data as Scheme),
      verificationStatus: row.verificationStatus as Scheme["verificationStatus"],
      lastVerified: row.lastVerified,
    };
    return NextResponse.json({ scheme });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load scheme" }, { status: 500 });
  }
}
