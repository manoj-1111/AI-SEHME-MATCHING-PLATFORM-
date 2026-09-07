import { INDIAN_STATES, BUSINESS_SECTORS, type UserProfile } from "@/types";
import { callLLM, hasLLM } from "./llm";

/**
 * Natural-language profile extraction.
 * Uses an LLM when AI_API_KEY is configured; otherwise falls back to a
 * deterministic rule-based extractor so the demo always works offline.
 */

const SECTOR_KEYWORDS: Record<string, string> = {
  "food processing": "Food Processing", food: "Food Processing", pickle: "Food Processing",
  snack: "Food Processing", bakery: "Food Processing", masala: "Food Processing",
  dairy: "Food Processing", agriculture: "Agriculture", farm: "Agriculture",
  crop: "Agriculture", poultry: "Agriculture", manufactur: "Manufacturing",
  factory: "Manufacturing", handicraft: "Handicrafts", craft: "Handicrafts",
  pottery: "Handicrafts", weav: "Textiles", textile: "Textiles", garment: "Textiles",
  tailor: "Textiles", boutique: "Textiles", shop: "Retail", store: "Retail",
  retail: "Retail", kirana: "Retail", service: "Services", salon: "Services",
  software: "IT / Technology", app: "IT / Technology", "it ": "IT / Technology",
  tech: "IT / Technology", computer: "IT / Technology", school: "Education",
  coaching: "Education", tuition: "Education", education: "Education",
  clinic: "Healthcare", health: "Healthcare", pharmacy: "Healthcare",
  tourism: "Tourism", travel: "Tourism", homestay: "Tourism", restaurant: "Food Processing",
};

export function fallbackExtract(text: string): Partial<UserProfile> {
  const t = text.toLowerCase();
  const out: Partial<UserProfile> = {};

  // Age: "28-year-old", "age 28", "28 years"
  const age = t.match(/(\d{2})\s*[-\s]?year/) || t.match(/age\s*(?:is\s*)?(\d{2})/);
  if (age) out.age = parseInt(age[1], 10);

  // Gender
  if (/\b(woman|female|lady|girl|housewife|mother|widow)\b/.test(t)) out.gender = "Female";
  else if (/\b(man|male|gentleman|father)\b/.test(t)) out.gender = "Male";

  // State
  for (const s of INDIAN_STATES)
    if (t.includes(s.toLowerCase())) { out.state = s; break; }

  // Category
  if (/\bsc\b|scheduled caste/.test(t)) out.category = "SC";
  else if (/\bst\b|scheduled tribe|tribal/.test(t)) out.category = "ST";
  else if (/\bobc\b|backward class/.test(t)) out.category = "OBC";
  else if (/\bgeneral\b/.test(t)) out.category = "General";

  if (/minority|muslim|christian|sikh|buddhist|parsi|jain/.test(t)) out.minority = true;
  if (/disabilit|disabled|divyang|handicap/.test(t)) out.disability = true;
  if (/\b(village|rural|panchayat)\b/.test(t)) out.area = "Rural";
  else if (/\b(city|urban|town)\b/.test(t)) out.area = "Urban";

  // Sector
  for (const [k, v] of Object.entries(SECTOR_KEYWORDS))
    if (t.includes(k)) { out.sector = v as (typeof BUSINESS_SECTORS)[number]; break; }

  // Stage
  if (/expand|expansion|grow my|scale/.test(t)) out.stage = "Expansion";
  else if (/already run|existing|running|have a .*business|for \d+ years/.test(t)) out.stage = "Existing";
  else if (/want to start|start a|starting|new business|set ?up/.test(t)) out.stage = "Startup";
  else if (/idea/.test(t)) out.stage = "Idea";

  // Funding: "5 lakh", "₹5,00,000", "2 crore"
  const lakh = t.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac|lakhs|l)\b/);
  const crore = t.match(/(\d+(?:\.\d+)?)\s*(?:crore|cr)\b/);
  const rupees = t.match(/(?:rs\.?|₹|rupees?)\s*([\d,]{4,})/);
  if (crore) out.fundingRequired = Math.round(parseFloat(crore[1]) * 10000000);
  else if (lakh) out.fundingRequired = Math.round(parseFloat(lakh[1]) * 100000);
  else if (rupees) out.fundingRequired = parseInt(rupees[1].replace(/,/g, ""), 10);

  // Income: "income is 2 lakh", "earn 2.5 lakh"
  const income = t.match(/income\s*(?:is|of|around|about)?\s*(?:rs\.?|₹)?\s*(\d+(?:\.\d+)?)\s*(lakh|lac|lakhs|crore)?/);
  if (income) {
    const mult = income[2]?.startsWith("cr") ? 10000000 : income[2] ? 100000 : 1;
    const v = Math.round(parseFloat(income[1]) * mult);
    if (v > 1000) out.annualIncome = v;
  }

  // Employees
  const emp = t.match(/(\d+)\s*(?:employees|workers|people|staff)/);
  if (emp) out.employees = parseInt(emp[1], 10);

  // Loan/support preference
  const supports: UserProfile["supportTypes"] = [];
  if (/loan|credit|borrow/.test(t)) supports.push("Loan");
  if (/subsidy/.test(t)) supports.push("Subsidy");
  if (/grant|seed fund/.test(t)) supports.push("Grant");
  if (/training|learn|skill/.test(t)) supports.push("Training");
  if (supports.length) out.supportTypes = supports;

  // Name: "I am Priya", "my name is Priya"
  const name = text.match(/(?:my name is|i am|i'm)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/);
  if (name && !/year|from|a\b/.test(name[1].toLowerCase())) out.fullName = name[1];

  return out;
}

export async function extractProfile(
  text: string,
): Promise<{ extracted: Partial<UserProfile>; source: "ai" | "rules" }> {
  if (hasLLM()) {
    try {
      const raw = await callLLM(
        [
          {
            role: "system",
            content:
              "Extract entrepreneur profile fields from the user's description. Respond ONLY with JSON having any of these keys: fullName, age (number), gender (Female|Male|Other), state (Indian state), district, area (Rural|Urban), category (SC|ST|OBC|General|Other), minority (bool), disability (bool), annualIncome (number, INR), sector (one of: " +
              BUSINESS_SECTORS.join(", ") +
              "), stage (Idea|Startup|Existing|Expansion), fundingRequired (number, INR), employees (number), supportTypes (array of Loan|Subsidy|Grant|Training|Infrastructure|Marketing|Skill Development). Omit unknown fields. Never invent values.",
          },
          { role: "user", content: text },
        ],
        { json: true },
      );
      const parsed = JSON.parse(raw) as Partial<UserProfile>;
      return { extracted: { ...fallbackExtract(text), ...parsed }, source: "ai" };
    } catch {
      return { extracted: fallbackExtract(text), source: "rules" };
    }
  }
  return { extracted: fallbackExtract(text), source: "rules" };
}
