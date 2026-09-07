"use client";

import type { AppUser, MatchResult, UserProfile } from "@/types";

/** Client-side persistence helpers (localStorage) for the demo prototype. */

const KEYS = {
  profile: "udyam_profile",
  user: "udyam_user",
  matches: "udyam_matches",
  compare: "udyam_compare",
  saved: "udyam_saved",
  docs: "udyam_docs",
};

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export const getProfile = () => read<UserProfile>(KEYS.profile);
export const setProfile = (p: UserProfile) => write(KEYS.profile, p);

export const getUser = () => read<AppUser>(KEYS.user);
export const setUser = (u: AppUser) => write(KEYS.user, u);
export const clearUser = () => {
  if (typeof window !== "undefined") localStorage.removeItem(KEYS.user);
};

export interface CachedMatches {
  eligible: MatchResult[];
  ineligible: MatchResult[];
  generatedAt: string;
}
export const getMatches = () => read<CachedMatches>(KEYS.matches);
export const setMatches = (m: CachedMatches) => write(KEYS.matches, m);

export const getCompareList = () => read<string[]>(KEYS.compare) ?? [];
export const setCompareList = (ids: string[]) => write(KEYS.compare, ids.slice(0, 3));
export const toggleCompare = (id: string): string[] => {
  const list = getCompareList();
  const next = list.includes(id)
    ? list.filter((x) => x !== id)
    : [...list, id].slice(0, 3);
  setCompareList(next);
  return next;
};

export const getSaved = () => read<string[]>(KEYS.saved) ?? [];
export const toggleSaved = (id: string): string[] => {
  const list = getSaved();
  const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  write(KEYS.saved, next);
  return next;
};

export type DocStatus = "ready" | "missing" | "optional";
export const getDocStatuses = () => read<Record<string, DocStatus>>(KEYS.docs) ?? {};
export const setDocStatus = (name: string, status: DocStatus) => {
  const all = getDocStatuses();
  all[name] = status;
  write(KEYS.docs, all);
  return all;
};

/** Demo entrepreneur used in Demo Mode (SIH presentation flow). */
export const DEMO_PROFILE: UserProfile = {
  fullName: "Priya Murugan",
  age: 28,
  gender: "Female",
  state: "Tamil Nadu",
  district: "Madurai",
  area: "Rural",
  category: "SC",
  disability: false,
  minority: false,
  annualIncome: 250000,
  existingLoans: false,
  employmentStatus: "Self-employed",
  education: "Higher Secondary (12th)",
  businessName: "Priya Foods",
  sector: "Food Processing",
  businessType: "Proprietorship",
  stage: "Startup",
  turnover: 0,
  employees: 3,
  businessLocation: "Madurai, Tamil Nadu",
  fundingRequired: 500000,
  supportTypes: ["Loan", "Subsidy", "Training"],
};

export function profileCompletion(p: UserProfile | null): number {
  if (!p) return 0;
  const fields: (keyof UserProfile)[] = [
    "fullName", "age", "gender", "state", "district", "area", "category",
    "annualIncome", "employmentStatus", "education", "businessName", "sector",
    "businessType", "stage", "businessLocation", "fundingRequired", "supportTypes",
  ];
  const filled = fields.filter((f) => {
    const v = p[f];
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "number") return v > 0;
    return v !== undefined && v !== null && String(v).trim() !== "";
  }).length;
  return Math.round((filled / fields.length) * 100);
}
