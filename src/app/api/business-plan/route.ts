import { NextRequest, NextResponse } from "next/server";
import { generatePlan, type PlanInput } from "@/lib/ai/plan";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PlanInput;
    if (!body.sector || !body.location || !body.investment)
      return NextResponse.json(
        { error: "sector, location and investment are required" },
        { status: 400 },
      );
    const result = await generatePlan(body);
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Plan generation failed" }, { status: 500 });
  }
}
