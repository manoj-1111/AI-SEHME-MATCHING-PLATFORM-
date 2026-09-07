import { NextRequest, NextResponse } from "next/server";
import { answerChat, type ChatContext } from "@/lib/ai/chat";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { message: string; context: ChatContext };
    if (!body.message?.trim())
      return NextResponse.json({ error: "Empty message" }, { status: 400 });
    const result = await answerChat(body.message.trim(), body.context ?? { profile: null, matches: [] });
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { reply: "Sorry, something went wrong. Please try again.", source: "rules" },
      { status: 200 },
    );
  }
}
