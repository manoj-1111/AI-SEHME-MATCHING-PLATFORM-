"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight, BrainCircuit, CheckCircle2, FileCheck2, Languages, Lightbulb,
  ListChecks, Mic, PlayCircle, ScanSearch, ShieldCheck, Sparkles, Target, Users,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { DEMO_PROFILE, setMatches, setProfile, getUser, setUser } from "@/lib/client/store";
import { readJsonResponse } from "@/lib/http/api";
import type { MatchResult } from "@/types";

export default function LandingPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [demoLoading, setDemoLoading] = useState(false);

  const runDemo = async () => {
    setDemoLoading(true);
    try {
      // Demo login
      if (!getUser()) {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Priya Murugan", email: "priya@demo.udyamsetu.in" }),
        });
        const data = await readJsonResponse<{ user?: { id: number; name: string; email: string; role: string } }>(res);
        if (data.user) setUser(data.user);
      }
      setProfile(DEMO_PROFILE);
      const user = getUser();
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: DEMO_PROFILE, userId: user?.id }),
      });
      const data = await readJsonResponse<{ eligible?: MatchResult[]; ineligible?: MatchResult[]; error?: string }>(res);
      if (data.eligible) {
        setMatches({
          eligible: Array.isArray(data.eligible) ? data.eligible : [],
          ineligible: Array.isArray(data.ineligible) ? data.ineligible : [],
          generatedAt: new Date().toISOString(),
        });
        router.push("/dashboard?demo=1");
      }
    } catch {
      router.push("/onboarding?demo=1");
    } finally {
      setDemoLoading(false);
    }
  };

  const features = [
    { icon: BrainCircuit, title: t("aiMatching"), desc: t("aiMatchingDesc") },
    { icon: Target, title: t("personalized"), desc: t("personalizedDesc") },
    { icon: Lightbulb, title: t("explainable"), desc: t("explainableDesc") },
    { icon: Languages, title: t("multilingual"), desc: t("multilingualDesc") },
    { icon: FileCheck2, title: t("docChecklist"), desc: t("docChecklistDesc") },
    { icon: Mic, title: t("voiceInput"), desc: t("voiceInputDesc") },
  ];

  const groups = [
    "SC Entrepreneurs", "ST Entrepreneurs", "Women Entrepreneurs", "Rural Entrepreneurs",
    "Persons with Disabilities", "Minority Entrepreneurs", "EWS Entrepreneurs",
    "First-time Founders", "Micro & Small Businesses", "Startups",
  ];

  const steps = [
    { icon: Users, title: t("step1"), desc: "Fill a simple form, speak, or describe your business in your own words." },
    { icon: ListChecks, title: t("step2"), desc: "A rule engine checks age, income, category, gender, state and sector." },
    { icon: ScanSearch, title: t("step3"), desc: "A weighted scoring engine ranks schemes with a 0–100 match score." },
    { icon: FileCheck2, title: t("step4"), desc: "Get explanations, document checklists and official application steps." },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50 via-white to-white">
        <div className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full bg-emerald-100/60 blur-3xl" />
        <div className="pointer-events-none absolute top-40 -left-24 h-72 w-72 rounded-full bg-teal-100/50 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <Sparkles size={13} /> SIH26092 · AI-Driven Scheme Matching
              </span>
              <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
                {t("heroTitle")}
              </h1>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-slate-600">
                {t("heroSubtitle")}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/onboarding"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-emerald-700"
                >
                  {t("findMySchemes")} <ArrowRight size={18} />
                </Link>
                <Link
                  href="/schemes"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {t("exploreSchemes")}
                </Link>
                <button
                  onClick={runDemo}
                  disabled={demoLoading}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-3 text-base font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                >
                  <PlayCircle size={18} />
                  {demoLoading ? "Preparing demo…" : t("demoMode")}
                </button>
              </div>
              <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck size={14} className="text-emerald-600" />
                {t("disclaimer")}
              </p>
            </div>

            {/* Hero illustration card */}
            <div className="relative">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <p className="text-sm font-semibold text-slate-800">Your Personalized Matches</p>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    Live demo preview
                  </span>
                </div>
                {[
                  { name: "PMFME — Food Processing Subsidy", score: 95, tag: "Top Match" },
                  { name: "NSFDC Term Loan (SC Entrepreneurs)", score: 91 },
                  { name: "Stand-Up India", score: 87 },
                  { name: "PM MUDRA Yojana", score: 82 },
                ].map((s) => (
                  <div key={s.name} className="mt-3 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                    <div className="relative h-10 w-10 shrink-0">
                      <svg viewBox="0 0 40 40" className="-rotate-90">
                        <circle cx="20" cy="20" r="16" stroke="#e2e8f0" strokeWidth="4" fill="none" />
                        <circle cx="20" cy="20" r="16" stroke="#059669" strokeWidth="4" fill="none"
                          strokeDasharray={100.5} strokeDashoffset={100.5 - (100.5 * s.score) / 100} strokeLinecap="round" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">{s.score}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{s.name}</p>
                      <p className="text-xs text-slate-500">{s.score}% {t("match")}</p>
                    </div>
                    {s.tag && (
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">{s.tag}</span>
                    )}
                  </div>
                ))}
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                  Your SC category, Tamil Nadu location and ₹5L funding need all match — potentially eligible.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who we serve */}
      <section className="border-y border-slate-100 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400">
            Built for every marginalized entrepreneur
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {groups.map((g) => (
              <span key={g} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
                {g}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold text-slate-900">
          Everything you need, in one place
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-slate-600">
          From discovery to application — a complete guided journey.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <f.icon size={22} />
              </span>
              <h3 className="mt-4 text-base font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gradient-to-b from-white to-emerald-50/50 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center text-3xl font-bold text-slate-900">{t("howItWorks")}</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s.title} className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <span className="absolute -top-3 left-6 rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <s.icon size={24} className="text-emerald-600" />
                <h3 className="mt-3 text-sm font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3.5 text-base font-semibold text-white shadow-md transition hover:bg-emerald-700"
            >
              {t("getStarted")} <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
