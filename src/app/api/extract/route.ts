import { NextRequest, NextResponse } from "next/server";
import { extractProfile } from "@/lib/ai/extract";

export async function POST(req: NextRequest) {
  try {
    const { text } = (await req.json()) as { text: string };
    if (!text || text.trim().length < 10)
      return NextResponse.json(
        { error: "Please describe your business in a few sentences." },
        { status: 400 },
      );
    const result = await extractProfile(text);
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
  }
}
