import { formatINR } from "@/lib/matching/engine";
import { callLLM, hasLLM } from "./llm";

export interface PlanInput {
  businessName: string;
  businessType: string;
  sector: string;
  location: string;
  investment: number;
  employees: number;
  targetCustomers: string;
  ownerName?: string;
}

export interface PlanSection {
  title: string;
  content: string;
}

function fallbackPlan(i: PlanInput): PlanSection[] {
  const monthlyRevenue = Math.round((i.investment * 0.45) / 12 / 1000) * 1000;
  const yearlyRevenue = monthlyRevenue * 12;
  const breakEvenMonths = Math.min(36, Math.max(10, Math.round(i.investment / Math.max(monthlyRevenue * 0.25, 1))));
  return [
    {
      title: "Business Overview",
      content: `${i.businessName || "The proposed enterprise"} is a ${i.businessType.toLowerCase()} in the ${i.sector} sector, to be operated from ${i.location}. ${i.ownerName ? `The venture is promoted by ${i.ownerName}. ` : ""}The unit will serve ${i.targetCustomers || "local customers"} with quality products/services at competitive prices, starting as a micro enterprise with scope for gradual expansion.`,
    },
    {
      title: "Objectives",
      content: `• Establish a viable ${i.sector.toLowerCase()} enterprise within 6 months of funding.\n• Achieve steady monthly revenue of approximately ${formatINR(monthlyRevenue)} within the first year.\n• Provide direct employment to ${i.employees || 2} people from the local community.\n• Build repeat customers through consistent quality and fair pricing.\n• Formalise the business (Udyam registration, applicable licences) in the first quarter.`,
    },
    {
      title: "Products / Services",
      content: `The enterprise will offer ${i.sector.toLowerCase()}-based products/services tailored to ${i.targetCustomers || "the local market"}. The initial range will focus on 3–5 core offerings selected for steady demand and healthy margins, expanding based on customer feedback and seasonal opportunities.`,
    },
    {
      title: "Target Market",
      content: `Primary market: ${i.targetCustomers || "households and small businesses"} in and around ${i.location}. Demand drivers include local consumption, growing preference for quality local products, and access to nearby weekly markets/retail outlets. Digital channels (WhatsApp catalogue, ONDC/e-commerce) will be used to widen reach over time.`,
    },
    {
      title: "Investment Requirement",
      content: `Total project cost: ${formatINR(i.investment)}\n• Machinery & equipment: ~${formatINR(Math.round(i.investment * 0.5))}\n• Working capital (raw material, stock): ~${formatINR(Math.round(i.investment * 0.3))}\n• Premises setup & utilities: ~${formatINR(Math.round(i.investment * 0.12))}\n• Licences, marketing & contingency: ~${formatINR(Math.round(i.investment * 0.08))}\n\nProposed funding mix: 85–90% institutional finance under a suitable government scheme, 10–15% promoter contribution.`,
    },
    {
      title: "Employment Generation",
      content: `The unit will create ${i.employees || 2} direct jobs (production/operations, sales) and indirect livelihood opportunities for local suppliers. Preference will be given to workers from the local community, with on-the-job skill training.`,
    },
    {
      title: "Revenue Estimate (Illustrative)",
      content: `• Estimated monthly revenue at steady state: ${formatINR(monthlyRevenue)}\n• Estimated annual revenue (Year 1): ${formatINR(yearlyRevenue)}\n• Expected gross margin: 25–35% (sector dependent)\n• Indicative break-even: ~${breakEvenMonths} months\n\nThese are conservative planning estimates and must be refined with actual local pricing and demand data.`,
    },
    {
      title: "Funding Requirement & Scheme Fit",
      content: `The enterprise seeks ${formatINR(i.investment)} in institutional support (term loan + working capital). Government schemes offering collateral-free credit, capital subsidy or margin-money support for ${i.sector.toLowerCase()} enterprises are the preferred route. Use the UdyamSetu AI recommendations to select the best-fit scheme and attach this plan to the application.`,
    },
  ];
}

export async function generatePlan(
  input: PlanInput,
): Promise<{ sections: PlanSection[]; source: "ai" | "rules" }> {
  if (hasLLM()) {
    try {
      const raw = await callLLM(
        [
          {
            role: "system",
            content:
              'Generate a concise business plan draft for an Indian micro-entrepreneur as JSON: {"sections":[{"title":string,"content":string}]}. Sections: Business Overview, Objectives, Products / Services, Target Market, Investment Requirement, Employment Generation, Revenue Estimate (Illustrative), Funding Requirement & Scheme Fit. Use ₹ amounts, bullet lists with •, realistic conservative numbers. No markdown headings inside content.',
          },
          { role: "user", content: JSON.stringify(input) },
        ],
        { json: true },
      );
      const parsed = JSON.parse(raw) as { sections: PlanSection[] };
      if (parsed.sections?.length) return { sections: parsed.sections, source: "ai" };
      return { sections: fallbackPlan(input), source: "rules" };
    } catch {
      return { sections: fallbackPlan(input), source: "rules" };
    }
  }
  return { sections: fallbackPlan(input), source: "rules" };
}
