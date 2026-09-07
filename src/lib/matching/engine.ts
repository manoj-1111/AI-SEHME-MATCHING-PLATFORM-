import type {
  MatchBreakdownItem,
  MatchResult,
  Scheme,
  UserProfile,
} from "@/types";

/**
 * Hybrid matching pipeline:
 *  Profile → normalization → HARD eligibility rules → weighted soft scoring →
 *  ranked, explainable recommendations.
 */

export const WEIGHTS = {
  category: 0.2,
  gender: 0.1,
  income: 0.15,
  location: 0.1,
  sector: 0.15,
  stage: 0.1,
  age: 0.05,
  funding: 0.1,
  support: 0.05,
};

const inr = (n: number) =>
  n >= 10000000
    ? `₹${(n / 10000000).toFixed(n % 10000000 === 0 ? 0 : 1)} Cr`
    : n >= 100000
      ? `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)} L`
      : `₹${n.toLocaleString("en-IN")}`;

export function formatINR(n: number) {
  return inr(n);
}

function matchesTargetGroup(profile: UserProfile, group: string): boolean {
  switch (group) {
    case "SC":
      return profile.category === "SC";
    case "ST":
      return profile.category === "ST";
    case "OBC":
      return profile.category === "OBC";
    case "Women":
      return profile.gender === "Female";
    case "PwD":
      return profile.disability;
    case "Minority":
      return profile.minority;
    case "Rural":
      return profile.area === "Rural";
    default:
      return false;
  }
}

/** HARD eligibility rules. Any failure ⇒ scheme is not presented as eligible. */
export function checkHardEligibility(
  profile: UserProfile,
  scheme: Scheme,
): string[] {
  const failures: string[] = [];

  if (scheme.minAge !== null && profile.age < scheme.minAge)
    failures.push(`Minimum age is ${scheme.minAge} (your age: ${profile.age})`);
  if (scheme.maxAge !== null && profile.age > scheme.maxAge)
    failures.push(`Maximum age is ${scheme.maxAge} (your age: ${profile.age})`);

  if (scheme.incomeLimit !== null && profile.annualIncome > scheme.incomeLimit)
    failures.push(
      `Annual family income must be within ${inr(scheme.incomeLimit)} (yours: ${inr(profile.annualIncome)})`,
    );

  if (scheme.categories.length > 0 && !scheme.categories.includes(profile.category))
    failures.push(
      `Reserved for ${scheme.categories.join("/")} category (your category: ${profile.category})`,
    );

  if (
    scheme.targetGroupsAny.length > 0 &&
    !scheme.targetGroupsAny.some((g) => matchesTargetGroup(profile, g))
  )
    failures.push(
      `Intended for ${scheme.targetGroupsAny.join(" / ")} applicants`,
    );

  if (scheme.genders.length > 0 && !scheme.genders.includes(profile.gender))
    failures.push(`Available only for ${scheme.genders.join("/")} applicants`);

  if (scheme.states.length > 0 && !scheme.states.includes(profile.state))
    failures.push(
      `Available only in ${scheme.states.join(", ")} (your state: ${profile.state})`,
    );

  if (
    scheme.sectorHard &&
    scheme.sectors.length > 0 &&
    !scheme.sectors.includes(profile.sector)
  )
    failures.push(
      `Limited to ${scheme.sectors.slice(0, 3).join(", ")}${scheme.sectors.length > 3 ? "…" : ""} sectors (your sector: ${profile.sector})`,
    );

  if (scheme.requiresDisability && !profile.disability)
    failures.push("Meant for persons with disability (40%+ certificate required)");

  if (scheme.requiresMinority && !profile.minority)
    failures.push("Meant for notified minority community applicants");

  return failures;
}

interface Sub {
  score: number;
  note: string;
  reason?: string;
  warning?: string;
}

function scoreCategory(p: UserProfile, s: Scheme): Sub {
  const restricted = s.categories.length > 0 || s.targetGroupsAny.length > 0;
  if (!restricted)
    return { score: 0.7, note: "Open to all social categories" };
  if (s.categories.includes(p.category))
    return {
      score: 1,
      note: `Specifically supports ${p.category} category`,
      reason: `Your social category (${p.category}) is directly supported`,
    };
  const grp = s.targetGroupsAny.find((g) => matchesTargetGroup(p, g));
  if (grp)
    return {
      score: 1,
      note: `You qualify under the "${grp}" target group`,
      reason: `You qualify under the scheme's ${grp} target group`,
    };
  return { score: 0, note: "Category not targeted" };
}

function scoreGender(p: UserProfile, s: Scheme): Sub {
  if (s.genders.length === 0) {
    if (p.gender === "Female" && s.tags.includes("women-priority"))
      return {
        score: 1,
        note: "Women get priority under this scheme",
        reason: "Women applicants are prioritised in this scheme",
      };
    return { score: 0.7, note: "Open to all genders" };
  }
  if (s.genders.includes(p.gender))
    return {
      score: 1,
      note: `Designed for ${p.gender.toLowerCase()} entrepreneurs`,
      reason: `The scheme is designed for ${p.gender.toLowerCase()} entrepreneurs like you`,
    };
  return { score: 0, note: "Gender not covered" };
}

function scoreIncome(p: UserProfile, s: Scheme): Sub {
  if (s.incomeLimit === null)
    return { score: 0.7, note: "No income ceiling specified" };
  if (p.annualIncome <= s.incomeLimit)
    return {
      score: 1,
      note: `Income ${inr(p.annualIncome)} is within the ${inr(s.incomeLimit)} limit`,
      reason: `Your family income (${inr(p.annualIncome)}) is within the scheme limit of ${inr(s.incomeLimit)}`,
      warning: "Income certificate will be required as proof",
    };
  return { score: 0, note: "Income above the ceiling" };
}

function scoreLocation(p: UserProfile, s: Scheme): Sub {
  if (s.states.length === 0)
    return {
      score: 0.85,
      note: "Available across India",
      reason: `Available in your state (${p.state}) — pan-India scheme`,
    };
  if (s.states.includes(p.state))
    return {
      score: 1,
      note: `State scheme for ${p.state}`,
      reason: `Dedicated state scheme for ${p.state} residents`,
    };
  return { score: 0, note: "Not available in your state" };
}

function scoreSector(p: UserProfile, s: Scheme): Sub {
  if (s.sectors.length === 0) return { score: 0.7, note: "All sectors supported" };
  if (s.sectors.includes(p.sector))
    return {
      score: 1,
      note: `${p.sector} sector is covered`,
      reason: `Your business sector (${p.sector}) is supported`,
    };
  return {
    score: 0.25,
    note: "Sector not in the primary focus list",
    warning: `Your sector (${p.sector}) is not in the scheme's primary focus — confirm coverage with the implementing agency`,
  };
}

function scoreStage(p: UserProfile, s: Scheme): Sub {
  if (s.stages.length === 0) return { score: 0.7, note: "All business stages" };
  if (s.stages.includes(p.stage))
    return {
      score: 1,
      note: `Suitable for the ${p.stage.toLowerCase()} stage`,
      reason: `Suited to your current business stage (${p.stage})`,
    };
  return {
    score: 0.3,
    note: `Primarily for ${s.stages.join("/")} stage businesses`,
    warning: `Scheme mainly targets ${s.stages.join("/")} stage — your stage is ${p.stage}`,
  };
}

function scoreAge(p: UserProfile, s: Scheme): Sub {
  if (s.minAge === null && s.maxAge === null)
    return { score: 0.8, note: "No age restriction" };
  const okMin = s.minAge === null || p.age >= s.minAge;
  const okMax = s.maxAge === null || p.age <= s.maxAge;
  if (okMin && okMax)
    return {
      score: 1,
      note: "Age criteria satisfied",
      reason: `Your age (${p.age}) meets the scheme's age criteria`,
    };
  return { score: 0, note: "Outside the age band" };
}

function scoreFunding(p: UserProfile, s: Scheme): Sub {
  if (s.maxFunding === null)
    return {
      score: s.training || s.grant ? 0.6 : 0.5,
      note: "Non-financial / cluster-level support",
    };
  const min = s.minFunding ?? 0;
  if (p.fundingRequired >= min && p.fundingRequired <= s.maxFunding)
    return {
      score: 1,
      note: `Need of ${inr(p.fundingRequired)} fits the ${inr(min)}–${inr(s.maxFunding)} range`,
      reason: `Your funding need (${inr(p.fundingRequired)}) fits the scheme range (${inr(min)} – ${inr(s.maxFunding)})`,
    };
  if (p.fundingRequired > s.maxFunding) {
    const ratio = Math.max(0.2, s.maxFunding / p.fundingRequired);
    return {
      score: ratio,
      note: `Scheme covers up to ${inr(s.maxFunding)} of your ${inr(p.fundingRequired)} need`,
      warning: `Scheme supports up to ${inr(s.maxFunding)} — you may need to combine with other funding for your ${inr(p.fundingRequired)} requirement`,
    };
  }
  return {
    score: 0.5,
    note: `Scheme typically funds ${inr(min)}+ projects`,
    warning: `This scheme usually funds projects of ${inr(min)} and above`,
  };
}

function scoreSupport(p: UserProfile, s: Scheme): Sub {
  if (p.supportTypes.length === 0)
    return { score: 0.7, note: "No support preference given" };
  const overlap = p.supportTypes.filter((t) => s.supportTypes.includes(t));
  if (overlap.length === 0)
    return {
      score: 0.2,
      note: `Offers ${s.supportTypes.join(", ")}`,
      warning: `Offers ${s.supportTypes.join(", ")} — different from your preferred support type`,
    };
  return {
    score: Math.min(1, overlap.length / Math.min(p.supportTypes.length, 2) + 0.4),
    note: `Provides ${overlap.join(", ")} as you preferred`,
    reason: `Provides the support you asked for: ${overlap.join(", ")}`,
  };
}

export function scoreScheme(profile: UserProfile, scheme: Scheme): MatchResult {
  const hardFailures = checkHardEligibility(profile, scheme);

  const subs: Array<[keyof typeof WEIGHTS, Sub]> = [
    ["category", scoreCategory(profile, scheme)],
    ["gender", scoreGender(profile, scheme)],
    ["income", scoreIncome(profile, scheme)],
    ["location", scoreLocation(profile, scheme)],
    ["sector", scoreSector(profile, scheme)],
    ["stage", scoreStage(profile, scheme)],
    ["age", scoreAge(profile, scheme)],
    ["funding", scoreFunding(profile, scheme)],
    ["support", scoreSupport(profile, scheme)],
  ];

  const breakdown: MatchBreakdownItem[] = subs.map(([k, sub]) => ({
    factor: k.charAt(0).toUpperCase() + k.slice(1),
    weight: WEIGHTS[k],
    score: sub.score,
    note: sub.note,
  }));

  const raw = subs.reduce((acc, [k, sub]) => acc + WEIGHTS[k] * sub.score, 0);
  const score = Math.round(raw * 100);

  const reasons = subs.map(([, s]) => s.reason).filter(Boolean) as string[];
  const warnings = subs.map(([, s]) => s.warning).filter(Boolean) as string[];

  // Additional generic caution flags
  if (scheme.documents.some((d) => d.toLowerCase().includes("caste") || d.toLowerCase().includes("tribe")))
    warnings.push("Category/caste certificate must be valid and up to date");
  if (scheme.id === "cgtmse" || scheme.documents.some((d) => d.toLowerCase().includes("udyam")))
    warnings.push("Udyam (business) registration may be required");
  if (scheme.verificationStatus === "demo")
    warnings.push("Demo/Prototype data — verify details on the official source before applying");

  return {
    schemeId: scheme.id,
    schemeName: scheme.name,
    score,
    eligible: hardFailures.length === 0,
    hardFailures,
    reasons,
    warnings: [...new Set(warnings)],
    breakdown,
    scheme,
  };
}

export function matchSchemes(
  profile: UserProfile,
  schemes: Scheme[],
): { eligible: MatchResult[]; ineligible: MatchResult[] } {
  const results = schemes.map((s) => scoreScheme(profile, s));
  const eligible = results
    .filter((r) => r.eligible)
    .sort((a, b) => b.score - a.score);
  const ineligible = results
    .filter((r) => !r.eligible)
    .sort((a, b) => b.score - a.score);
  return { eligible, ineligible };
}

/** Personalised document checklist derived from profile + top schemes. */
export function buildDocumentChecklist(
  profile: UserProfile,
  topSchemes: Scheme[],
): { name: string; required: boolean; hint: string }[] {
  const base = new Map<string, { required: boolean; hint: string }>();
  const add = (name: string, required: boolean, hint: string) => {
    const existing = base.get(name);
    if (!existing || (required && !existing.required))
      base.set(name, { required, hint });
  };

  add("Aadhaar / identity proof", true, "Mandatory for almost all schemes");
  add("PAN card", true, "Needed for loans above ₹50,000 and formal registration");
  add("Address proof", true, "Ration card / utility bill / passport");
  add("Bank account details", true, "Active account with passbook / cancelled cheque");
  add("Business plan / project report", true, "Use the AI Business Plan assistant to draft one");
  add("Passport size photographs", false, "Keep 4–6 recent photos ready");

  if (profile.category === "SC" || profile.category === "ST" || profile.category === "OBC")
    add(`Caste/category certificate (${profile.category})`, true, "Issued by competent authority — required for reserved-category benefits");
  if (profile.minority)
    add("Minority community declaration/certificate", true, "Needed for minority-focused schemes like NMDFC");
  if (profile.disability)
    add("Disability certificate (UDID)", true, "40%+ disability certificate for Divyangjan schemes");
  if (profile.annualIncome <= 800000)
    add("Income certificate", true, "Required for income-linked concessional schemes");
  if (profile.area === "Rural")
    add("Rural area certificate", false, "Increases subsidy under PMEGP and similar schemes");
  if (profile.stage === "Existing" || profile.stage === "Expansion") {
    add("Udyam registration certificate", true, "Free MSME registration at udyamregistration.gov.in");
    add("Financial statements / ITR", false, "Last 1–2 years, for existing businesses");
  }
  if (profile.sector === "Food Processing")
    add("FSSAI registration/licence", false, "Required to operate a food business");

  for (const s of topSchemes)
    for (const d of s.documents) add(d, false, `Listed under ${s.name}`);

  return [...base.entries()].map(([name, v]) => ({ name, ...v }));
}
