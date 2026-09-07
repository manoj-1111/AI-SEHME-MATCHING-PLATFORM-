import type { MatchResult, UserProfile } from "@/types";
import { formatINR } from "@/lib/matching/engine";
import { callLLM, hasLLM } from "./llm";

export interface ChatContext {
  profile: Partial<UserProfile> | null;
  matches: Array<
    Pick<MatchResult, "schemeName" | "score" | "reasons" | "warnings"> & {
      schemeId: string;
      maxFunding: number | null;
      documents: string[];
      officialUrl: string;
      supportTypes: string[];
    }
  >;
}

const DISCLAIMER =
  "\n\n_Note: You appear to meet the listed criteria, but eligibility and benefits are always subject to official verification._";

function fallbackAnswer(message: string, ctx: ChatContext): string {
  const t = message.toLowerCase();
  const p = ctx.profile;
  const top = ctx.matches?.[0];

  const noProfile =
    "I don't have your profile yet. Please complete the profile form (or use Demo Mode) so I can give personalised answers.";

  // Greetings
  if (/^(hi|hello|hey|vanakkam|namaste)\b/.test(t))
    return `Hello${p?.fullName ? " " + p.fullName : ""}! 👋 I'm Udyam AI Assistant. I can help you with:\n• Which schemes suit your profile\n• Why a scheme was recommended\n• Documents you need\n• Funding amounts\n• Next steps and business plan help\n\nWhat would you like to know?`;

  // Which schemes suit me
  if (/(which|what).*(scheme|suitable|suit|for me)|recommend/.test(t)) {
    if (!p || !ctx.matches?.length) return noProfile;
    const list = ctx.matches
      .slice(0, 5)
      .map((m, i) => `${i + 1}. **${m.schemeName}** — ${m.score}% match`)
      .join("\n");
    return `Based on your profile (${p.category ?? ""} ${p.gender === "Female" ? "woman " : ""}entrepreneur in ${p.sector ?? "your sector"}, ${p.state ?? "India"}), your top matches are:\n\n${list}\n\nOpen any scheme from the dashboard to see full details.${DISCLAIMER}`;
  }

  // Why recommended / suitable
  if (/why.*(scheme|recommend|suitable|match)/.test(t)) {
    if (!top) return noProfile;
    const reasons = top.reasons.slice(0, 5).map((r) => `✓ ${r}`).join("\n");
    const warns = top.warnings.slice(0, 2).map((w) => `⚠ ${w}`).join("\n");
    return `**${top.schemeName}** (${top.score}% match) was recommended because:\n\n${reasons}${warns ? "\n\nThings to check:\n" + warns : ""}${DISCLAIMER}`;
  }

  // Documents
  if (/document|paper|certificate|checklist/.test(t)) {
    if (!top) return noProfile;
    const docs = top.documents.slice(0, 8).map((d) => `• ${d}`).join("\n");
    return `For **${top.schemeName}**, keep these documents ready:\n\n${docs}\n\nUse the *Documents* page to track your personalised checklist.`;
  }

  // Funding amount
  if (/how much|funding|amount|money|loan.*(get|receive)/.test(t)) {
    if (!ctx.matches?.length) return noProfile;
    const lines = ctx.matches
      .slice(0, 4)
      .map(
        (m) =>
          `• **${m.schemeName}**: ${m.maxFunding ? "up to " + formatINR(m.maxFunding) : "non-financial support (" + m.supportTypes.join(", ") + ")"}`,
      )
      .join("\n");
    return `Indicative support ranges for your top matches:\n\n${lines}\n\nActual sanctioned amounts depend on your project report and bank appraisal.${DISCLAIMER}`;
  }

  // Next steps
  if (/next|what should i do|how to (start|apply)|steps/.test(t)) {
    if (!top) return noProfile;
    return `Here's a practical next-step plan:\n\n1. Review your top match **${top.schemeName}** and its eligibility.\n2. Complete your document checklist (Documents page).\n3. Draft your project report — try the *AI Business Plan* assistant.\n4. Apply on the official portal: ${top.officialUrl}\n5. Track your application status in the *Applications* page.${DISCLAIMER}`;
  }

  // Business plan
  if (/business plan|project report|dpr/.test(t))
    return `I can help you draft a business plan! Go to the **Business Plan** page, enter your business type, location, investment and team size — I'll generate a structured draft covering overview, objectives, market, investment and revenue estimate.\n\n_The draft is AI-generated — review it carefully before submitting to any bank or agency._`;

  // Eligibility
  if (/eligib/.test(t)) {
    if (!top) return noProfile;
    return `Eligibility is checked with a rule engine on hard criteria (age, income, category, gender, state, sector) before any AI ranking. For **${top.schemeName}** you appear to meet the listed criteria (${top.score}% match).\n\nFinal eligibility is always decided by the implementing agency after document verification.`;
  }

  // Fallback — never hallucinate
  return `I couldn't verify that information from my scheme knowledge base. Please check the official scheme source for accurate details.\n\nI can help with: suitable schemes, why a scheme matched, required documents, funding amounts, next steps, or business plan drafting.`;
}

export async function answerChat(
  message: string,
  ctx: ChatContext,
): Promise<{ reply: string; source: "ai" | "rules" }> {
  if (hasLLM()) {
    try {
      const reply = await callLLM([
        {
          role: "system",
          content: `You are Udyam AI Assistant for UdyamSetu AI, a government-scheme matching platform for marginalized entrepreneurs in India. Answer ONLY using the provided profile and scheme match context. Never invent scheme rules, amounts or URLs. If information is not in context, say: "I couldn't verify that information. Please check the official scheme source." Never say a user is definitely eligible — use "you appear to meet the listed criteria". Keep answers concise with markdown bullets.\n\nUSER PROFILE: ${JSON.stringify(ctx.profile)}\n\nTOP MATCHES: ${JSON.stringify(ctx.matches?.slice(0, 5))}`,
        },
        { role: "user", content: message },
      ]);
      return { reply, source: "ai" };
    } catch {
      return { reply: fallbackAnswer(message, ctx), source: "rules" };
    }
  }
  return { reply: fallbackAnswer(message, ctx), source: "rules" };
}
