"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Briefcase, Check, IndianRupee, Loader2, Mic, MicOff,
  PenLine, PlayCircle, Sparkles, User, Wallet,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import {
  DEMO_PROFILE, getProfile, getUser, setMatches, setProfile, setUser,
} from "@/lib/client/store";
import {
  BUSINESS_SECTORS, INDIAN_STATES, type MatchResult, type SupportType, type UserProfile,
} from "@/types";
import { readJsonResponse } from "@/lib/http/api";

const EMPTY: UserProfile = {
  fullName: "", age: 0, gender: "Female", state: "", district: "", area: "Rural",
  category: "General", disability: false, minority: false, annualIncome: 0,
  existingLoans: false, employmentStatus: "", education: "", businessName: "",
  sector: "", businessType: "Proprietorship", stage: "Startup", turnover: 0,
  employees: 0, businessLocation: "", fundingRequired: 0, supportTypes: [],
};

const SUPPORT_OPTIONS: SupportType[] = [
  "Loan", "Subsidy", "Grant", "Training", "Infrastructure", "Marketing", "Skill Development",
];

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none";

function OnboardingInner() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"form" | "describe">("form");
  const [step, setStep] = useState(0);
  const [p, setP] = useState<UserProfile>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [matching, setMatching] = useState(false);
  const [apiError, setApiError] = useState("");

  // NL mode state
  const [text, setText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractSource, setExtractSource] = useState<"ai" | "rules" | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceOk, setVoiceOk] = useState(false);

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    setVoiceOk(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
    const existing = getProfile();
    if (existing) setP(existing);
    if (params.get("demo") === "1") setP(DEMO_PROFILE);
  }, [params]);

  const set = <K extends keyof UserProfile>(k: K, v: UserProfile[K]) =>
    setP((prev) => ({ ...prev, [k]: v }));

  const steps = [
    { label: t("personal"), icon: User },
    { label: t("economic"), icon: Wallet },
    { label: t("business"), icon: Briefcase },
    { label: t("funding"), icon: IndianRupee },
    { label: t("results"), icon: Sparkles },
  ];

  const validateStep = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!p.fullName.trim()) e.fullName = "Name is required";
      if (!p.age || p.age < 18 || p.age > 100) e.age = "Enter a valid age (18–100)";
      if (!p.state) e.state = "Select your state";
      if (!p.district.trim()) e.district = "District is required";
    }
    if (s === 1) {
      if (!p.annualIncome || p.annualIncome < 0) e.annualIncome = "Enter annual family income";
      if (!p.employmentStatus) e.employmentStatus = "Select employment status";
      if (!p.education) e.education = "Select education level";
    }
    if (s === 2) {
      if (!p.sector) e.sector = "Select your business sector";
      if (!p.businessLocation.trim()) e.businessLocation = "Business location required";
    }
    if (s === 3) {
      if (!p.fundingRequired || p.fundingRequired <= 0) e.fundingRequired = "Enter funding required";
      if (p.supportTypes.length === 0) e.supportTypes = "Select at least one support type";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const runMatch = async (profile: UserProfile) => {
    setMatching(true);
    setApiError("");
    try {
      setProfile(profile);
      let user = getUser();
      if (!user) {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: profile.fullName || "Guest",
            email: `${(profile.fullName || "guest").toLowerCase().replace(/[^a-z0-9]+/g, ".")}@demo.udyamsetu.in`,
          }),
        });
        const data = await readJsonResponse<{ user?: { id: number; name: string; email: string; role: string } }>(res);
        if (data.user) { setUser(data.user); user = data.user; }
      }
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, userId: user?.id }),
      });
      const data = await readJsonResponse<{ eligible?: MatchResult[]; ineligible?: MatchResult[]; error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Matching failed");
      const eligible = Array.isArray(data.eligible) ? data.eligible : [];
      const ineligible = Array.isArray(data.ineligible) ? data.ineligible : [];
      setMatches({ eligible, ineligible, generatedAt: new Date().toISOString() });
      router.push("/dashboard");
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setMatching(false);
    }
  };

  const extract = async () => {
    setExtracting(true);
    setApiError("");
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await readJsonResponse<{ error?: string; extracted?: Partial<UserProfile>; source?: "ai" | "rules" }>(res);
      if (!res.ok) throw new Error(data.error || "Extraction failed");
      setP((prev) => ({ ...prev, ...data.extracted }));
      if (data.source) setExtractSource(data.source);
      setMode("form");
      setStep(0);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  const toggleVoice = () => {
    const w = window as unknown as Record<string, unknown>;
    const SR = (w.SpeechRecognition || w.webkitSpeechRecognition) as
      | (new () => SpeechRecognitionLike) | undefined;
    if (!SR) return;
    if (listening) return setListening(false);
    const rec = new SR();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.onresult = (e) => setText((prev) => (prev ? prev + " " : "") + e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
    setListening(true);
  };

  const demoFill = () => {
    setP(DEMO_PROFILE);
    setMode("form");
    setStep(0);
    setExtractSource(null);
  };

  const progress = useMemo(() => (step / 4) * 100, [step]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tell us about yourself</h1>
          <p className="mt-1 text-sm text-slate-600">
            We use this to match you with the most relevant government schemes.
          </p>
        </div>
        <button
          onClick={demoFill}
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
        >
          <PlayCircle size={15} /> {t("demoMode")}
        </button>
      </div>

      {/* Mode toggle */}
      <div className="mt-6 flex gap-2 rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setMode("form")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition ${mode === "form" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600"}`}
        >
          <PenLine size={15} /> Guided form
        </button>
        <button
          onClick={() => setMode("describe")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition ${mode === "describe" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600"}`}
        >
          <Sparkles size={15} /> {t("describeBusiness")}
        </button>
      </div>

      {extractSource && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <Check size={14} className="mr-1 inline" />
          Profile fields extracted {extractSource === "ai" ? "by AI" : "by the rule-based engine (no AI key configured)"}.
          Please review and edit them below before matching.
        </div>
      )}

      {mode === "describe" ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">
            Describe yourself and your business — age, state, category, business idea and funding need. Example:
          </p>
          <button
            onClick={() =>
              setText("I am a 28-year-old woman from Tamil Nadu. I belong to SC category and want to start a small food processing business in Madurai. My family income is 2.5 lakh and I need around 5 lakh rupees as loan and subsidy.")
            }
            className="mt-2 block w-full rounded-xl bg-slate-50 p-3 text-left text-xs italic text-slate-500 hover:bg-slate-100"
          >
            &quot;I am a 28-year-old woman from Tamil Nadu. I belong to SC category and want to
            start a small food processing business. I need around 5 lakh rupees.&quot; (tap to use)
          </button>
          <div className="relative mt-4">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder="Type or speak here…"
              className="w-full rounded-xl border border-slate-200 p-4 pr-12 text-sm focus:border-emerald-500 focus:outline-none"
            />
            {voiceOk ? (
              <button
                onClick={toggleVoice}
                title={listening ? "Stop" : "Speak"}
                className={`absolute right-3 top-3 rounded-full p-2 ${listening ? "animate-pulse bg-red-100 text-red-600" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {listening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            ) : (
              <span title="Voice input not supported in this browser" className="absolute right-3 top-3 rounded-full bg-slate-50 p-2 text-slate-300">
                <Mic size={16} />
              </span>
            )}
          </div>
          {!voiceOk && (
            <p className="mt-1 text-xs text-slate-400">
              Voice input isn&apos;t supported in this browser — typing works the same way.
            </p>
          )}
          {apiError && <p className="mt-2 text-sm text-red-600">{apiError}</p>}
          <button
            onClick={extract}
            disabled={extracting || text.trim().length < 10}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {extracting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {extracting ? "Extracting…" : "Extract my profile"}
          </button>
        </div>
      ) : (
        <>
          {/* Progress */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              {steps.map((s, i) => (
                <div key={s.label} className="flex flex-1 flex-col items-center">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold transition ${
                      i < step
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : i === step
                          ? "border-emerald-600 bg-white text-emerald-700"
                          : "border-slate-200 bg-white text-slate-400"
                    }`}
                  >
                    {i < step ? <Check size={15} /> : <s.icon size={15} />}
                  </span>
                  <span className={`mt-1.5 text-[11px] font-medium ${i <= step ? "text-emerald-700" : "text-slate-400"}`}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {step === 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full Name" error={errors.fullName}>
                  <input className={inputCls} value={p.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Your name" />
                </Field>
                <Field label="Age" error={errors.age}>
                  <input type="number" className={inputCls} value={p.age || ""} onChange={(e) => set("age", Number(e.target.value))} placeholder="e.g., 28" />
                </Field>
                <Field label="Gender">
                  <select className={inputCls} value={p.gender} onChange={(e) => set("gender", e.target.value as UserProfile["gender"])}>
                    <option>Female</option><option>Male</option><option>Other</option>
                  </select>
                </Field>
                <Field label="State" error={errors.state}>
                  <select className={inputCls} value={p.state} onChange={(e) => set("state", e.target.value)}>
                    <option value="">Select state</option>
                    {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="District" error={errors.district}>
                  <input className={inputCls} value={p.district} onChange={(e) => set("district", e.target.value)} placeholder="e.g., Madurai" />
                </Field>
                <Field label="Area">
                  <select className={inputCls} value={p.area} onChange={(e) => set("area", e.target.value as UserProfile["area"])}>
                    <option>Rural</option><option>Urban</option>
                  </select>
                </Field>
                <Field label="Social Category">
                  <select className={inputCls} value={p.category} onChange={(e) => set("category", e.target.value as UserProfile["category"])}>
                    <option>SC</option><option>ST</option><option>OBC</option><option>General</option><option>Other</option>
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Person with Disability">
                    <select className={inputCls} value={p.disability ? "Yes" : "No"} onChange={(e) => set("disability", e.target.value === "Yes")}>
                      <option>No</option><option>Yes</option>
                    </select>
                  </Field>
                  <Field label="Minority Status">
                    <select className={inputCls} value={p.minority ? "Yes" : "No"} onChange={(e) => set("minority", e.target.value === "Yes")}>
                      <option>No</option><option>Yes</option>
                    </select>
                  </Field>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Annual Family Income (₹)" error={errors.annualIncome}>
                  <input type="number" className={inputCls} value={p.annualIncome || ""} onChange={(e) => set("annualIncome", Number(e.target.value))} placeholder="e.g., 250000" />
                </Field>
                <Field label="Existing Loans">
                  <select className={inputCls} value={p.existingLoans ? "Yes" : "No"} onChange={(e) => set("existingLoans", e.target.value === "Yes")}>
                    <option>No</option><option>Yes</option>
                  </select>
                </Field>
                <Field label="Employment Status" error={errors.employmentStatus}>
                  <select className={inputCls} value={p.employmentStatus} onChange={(e) => set("employmentStatus", e.target.value)}>
                    <option value="">Select</option>
                    <option>Self-employed</option><option>Unemployed</option><option>Employed</option>
                    <option>Farmer</option><option>Student</option><option>Homemaker</option>
                  </select>
                </Field>
                <Field label="Education" error={errors.education}>
                  <select className={inputCls} value={p.education} onChange={(e) => set("education", e.target.value)}>
                    <option value="">Select</option>
                    <option>No formal education</option><option>Primary (5th)</option>
                    <option>Middle (8th)</option><option>Secondary (10th)</option>
                    <option>Higher Secondary (12th)</option><option>Diploma / ITI</option>
                    <option>Graduate</option><option>Postgraduate</option>
                  </select>
                </Field>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Business Name (or idea name)">
                  <input className={inputCls} value={p.businessName} onChange={(e) => set("businessName", e.target.value)} placeholder="e.g., Priya Foods" />
                </Field>
                <Field label="Business Sector" error={errors.sector}>
                  <select className={inputCls} value={p.sector} onChange={(e) => set("sector", e.target.value)}>
                    <option value="">Select sector</option>
                    {BUSINESS_SECTORS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Business Type">
                  <select className={inputCls} value={p.businessType} onChange={(e) => set("businessType", e.target.value)}>
                    <option>Proprietorship</option><option>Partnership</option>
                    <option>Private Limited</option><option>SHG / Cooperative</option>
                    <option>Not registered yet</option>
                  </select>
                </Field>
                <Field label="Business Stage">
                  <select className={inputCls} value={p.stage} onChange={(e) => set("stage", e.target.value as UserProfile["stage"])}>
                    <option>Idea</option><option>Startup</option><option>Existing</option><option>Expansion</option>
                  </select>
                </Field>
                <Field label="Current Annual Turnover (₹)">
                  <input type="number" className={inputCls} value={p.turnover || ""} onChange={(e) => set("turnover", Number(e.target.value))} placeholder="0 if not started" />
                </Field>
                <Field label="Number of Employees">
                  <input type="number" className={inputCls} value={p.employees || ""} onChange={(e) => set("employees", Number(e.target.value))} placeholder="e.g., 3" />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Business Location" error={errors.businessLocation}>
                    <input className={inputCls} value={p.businessLocation} onChange={(e) => set("businessLocation", e.target.value)} placeholder="e.g., Madurai, Tamil Nadu" />
                  </Field>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <Field label="Funding Required (₹)" error={errors.fundingRequired}>
                  <input type="number" className={inputCls} value={p.fundingRequired || ""} onChange={(e) => set("fundingRequired", Number(e.target.value))} placeholder="e.g., 500000" />
                  {p.fundingRequired > 0 && (
                    <p className="mt-1 text-xs text-emerald-700">
                      ≈ ₹{(p.fundingRequired / 100000).toFixed(1)} lakh
                    </p>
                  )}
                </Field>
                <Field label="Preferred Support (select all that apply)" error={errors.supportTypes}>
                  <div className="flex flex-wrap gap-2">
                    {SUPPORT_OPTIONS.map((s) => {
                      const on = p.supportTypes.includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() =>
                            set("supportTypes", on ? p.supportTypes.filter((x) => x !== s) : [...p.supportTypes, s])
                          }
                          className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                            on
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300"
                          }`}
                        >
                          {on && <Check size={13} className="mr-1 inline" />}{s}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </div>
            )}

            {apiError && mode === "form" && <p className="mt-4 text-sm text-red-600">{apiError}</p>}

            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
              <button
                onClick={() => setStep(Math.max(0, step - 1))}
                disabled={step === 0}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <ArrowLeft size={15} /> {t("back")}
              </button>
              {step < 3 ? (
                <button
                  onClick={() => validateStep(step) && setStep(step + 1)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  {t("next")} <ArrowRight size={15} />
                </button>
              ) : (
                <button
                  onClick={() => validateStep(3) && runMatch(p)}
                  disabled={matching}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {matching ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {matching ? "Matching schemes…" : t("findMatching")}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-500">Loading…</div>}>
      <OnboardingInner />
    </Suspense>
  );
}
