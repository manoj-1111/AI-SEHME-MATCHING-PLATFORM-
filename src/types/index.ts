// ---------- Core domain types for UdyamSetu AI ----------

export type Gender = "Female" | "Male" | "Other";
export type Area = "Rural" | "Urban";
export type SocialCategory = "SC" | "ST" | "OBC" | "General" | "Other";
export type BusinessStage = "Idea" | "Startup" | "Existing" | "Expansion";

export type SupportType =
  | "Loan"
  | "Subsidy"
  | "Grant"
  | "Training"
  | "Infrastructure"
  | "Marketing"
  | "Skill Development";

export const BUSINESS_SECTORS = [
  "Agriculture",
  "Food Processing",
  "Manufacturing",
  "Handicrafts",
  "Textiles",
  "Retail",
  "Services",
  "IT / Technology",
  "Education",
  "Healthcare",
  "Tourism",
  "Other",
] as const;

export type BusinessSector = (typeof BUSINESS_SECTORS)[number];

export interface UserProfile {
  fullName: string;
  age: number;
  gender: Gender;
  state: string;
  district: string;
  area: Area;
  category: SocialCategory;
  disability: boolean;
  minority: boolean;
  // Economic
  annualIncome: number;
  existingLoans: boolean;
  employmentStatus: string;
  education: string;
  // Business
  businessName: string;
  sector: BusinessSector | string;
  businessType: string;
  stage: BusinessStage;
  turnover: number;
  employees: number;
  businessLocation: string;
  // Funding
  fundingRequired: number;
  supportTypes: SupportType[];
}

export interface Scheme {
  id: string;
  name: string;
  ministry: string;
  description: string;
  targetBeneficiaries: string;
  /** empty array = available across India */
  states: string[];
  /** strict category restriction, empty = all */
  categories: SocialCategory[];
  /** "any of these groups qualifies" OR-logic (SC, ST, Women, PwD, Minority) */
  targetGroupsAny: string[];
  /** empty = all genders */
  genders: Gender[];
  minAge: number | null;
  maxAge: number | null;
  /** annual family income ceiling in INR, null = no limit */
  incomeLimit: number | null;
  sectors: string[];
  /** if true, sector mismatch is a hard failure */
  sectorHard: boolean;
  stages: BusinessStage[];
  minFunding: number | null;
  maxFunding: number | null;
  loan: boolean;
  subsidy: boolean;
  grant: boolean;
  training: boolean;
  requiresDisability: boolean;
  requiresMinority: boolean;
  supportTypes: SupportType[];
  documents: string[];
  benefits: string[];
  eligibility: string[];
  applicationSteps: string[];
  officialUrl: string;
  lastVerified: string;
  verificationStatus: "verified" | "demo";
  tags: string[];
}

export interface MatchBreakdownItem {
  factor: string;
  weight: number;
  score: number; // 0..1
  note: string;
}

export interface MatchResult {
  schemeId: string;
  schemeName: string;
  score: number; // 0..100
  eligible: boolean;
  hardFailures: string[];
  reasons: string[]; // ✓ why it matches
  warnings: string[]; // ⚠ things to check
  breakdown: MatchBreakdownItem[];
  scheme: Scheme;
}

export type ApplicationStatus =
  | "Not Started"
  | "Documents Pending"
  | "Application Draft"
  | "Submitted"
  | "Under Review"
  | "Approved"
  | "Rejected";

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "Not Started",
  "Documents Pending",
  "Application Draft",
  "Submitted",
  "Under Review",
  "Approved",
  "Rejected",
];

export interface TimelineEntry {
  status: string;
  date: string;
  note?: string;
}

export interface AppUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu & Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];
