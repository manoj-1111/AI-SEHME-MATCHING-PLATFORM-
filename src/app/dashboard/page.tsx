"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Bookmark, ChevronDown, ClipboardList, GitCompareArrows, Loader2, Pencil,
  ShieldAlert, Sparkles, TrendingUp, UserRound, XCircle,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import SchemeCard from "@/components/SchemeCard";
import {
  getCompareList, getMatches, getProfile, getSaved, getUser, profileCompletion,
  setMatches, toggleCompare, toggleSaved, type CachedMatches,
} from "@/lib/client/store";
import { formatINR } from "@/lib/matching/engine";
import type { UserProfile } from "@/types";

export default function DashboardPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [matches, setMatchesState] = useState<CachedMatches | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<string[]>([]);
  const [compare, setCompare] = useState<string[]>([]);
  const [showIneligible, setShowIneligible] = useState(false);
  const [appCount, setAppCount] = useState(0);

  const refresh = useCallback(async (p: UserProfile) => {
    setLoading(true);
    setError("");
    try {
      const user = getUser();
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: p, userId: user?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Matching failed");
      const cached = { eligible: data.eligible, ineligible: data.ineligible, generatedAt: new Date().toISOString() };
      setMatches(cached);
      setMatchesState(cached);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load recommendations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const p = getProfile();
    setProfileState(p);
    setSaved(getSaved());
    setCompare(getCompareList());
    if (!p) { setLoading(false); return; }
    const cached = getMatches();
    if (cached) { setMatchesState(cached); setLoading(false); }
    else refresh(p);

    const user = getUser();
    if (user)
      fetch(`/api/applications?userId=${user.id}`)
        .then((r) => r.json())
        .then((d) => setAppCount(d.applications?.length ?? 0))
        .catch(() => {});
  }, [refresh]);

  if (!loading && !profile) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <UserRound size={40} className="mx-auto text-slate-300" />
        <h1 className="mt-4 text-xl font-bold text-slate-900">No profile yet</h1>
        <p className="mt-2 text-sm text-slate-600">
          Create your entrepreneur profile to get personalised scheme recommendations.
        </p>
        <Link
          href="/onboarding"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Sparkles size={16} /> {t("findMySchemes")}
        </Link>
      </div>
    );
  }

  const eligible = matches?.eligible ?? [];
  const ineligible = matches?.ineligible ?? [];
  const completion = profileCompletion(profile);

  const stats = [
    { label: t("profileCompletion"), value: `${completion}%`, icon: UserRound, href: "/onboarding" },
    { label: t("recommendedSchemes"), value: String(eligible.length), icon: TrendingUp, href: "#recommendations" },
    { label: t("savedSchemes"), value: String(saved.length), icon: Bookmark, href: "#recommendations" },
    { label: t("myApplications"), value: String(appCount), icon: ClipboardList, href: "/applications" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-emerald-700">
            Namaste{profile ? `, ${profile.fullName.split(" ")[0]}` : ""} 👋
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{t("yourRecommendations")}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {profile && (
              <>
                {profile.category} · {profile.gender} · {profile.state} · {profile.sector} ·
                needs {formatINR(profile.fundingRequired)}
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <Pencil size={14} /> Edit profile
          </Link>
          <button
            onClick={() => profile && refresh(profile)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <Sparkles size={14} /> Re-match
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
            <s.icon size={18} className="text-emerald-600" />
            <p className="mt-2 text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </Link>
        ))}
      </div>

      {compare.length >= 2 && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-4 py-3">
          <p className="text-sm font-medium text-teal-800">
            {compare.length} schemes selected for comparison
          </p>
          <Link
            href="/compare"
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            <GitCompareArrows size={15} /> Compare now
          </Link>
        </div>
      )}

      <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        <ShieldAlert size={14} className="mt-0.5 shrink-0" />
        {t("disclaimer")} Match scores are indicative — the implementing agency takes the final decision.
      </div>

      {/* Recommendations */}
      <div id="recommendations" className="mt-8">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-20 text-slate-500">
            <Loader2 size={28} className="animate-spin text-emerald-600" />
            <p className="text-sm">Running eligibility rules and AI ranking…</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-700">{error}</p>
            <button
              onClick={() => profile && refresh(profile)}
              className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        ) : eligible.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <XCircle size={36} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-700">{t("noMatches")}</p>
            <Link href="/onboarding" className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
              Update profile
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {eligible.map((r, i) => (
              <SchemeCard
                key={r.schemeId}
                result={r}
                rank={i}
                saved={saved.includes(r.schemeId)}
                comparing={compare.includes(r.schemeId)}
                onToggleSave={(id) => setSaved(toggleSaved(id))}
                onToggleCompare={(id) => setCompare(toggleCompare(id))}
              />
            ))}
          </div>
        )}
      </div>

      {/* Ineligible */}
      {!loading && ineligible.length > 0 && (
        <div className="mt-10">
          <button
            onClick={() => setShowIneligible(!showIneligible)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <span>{ineligible.length} schemes where criteria are not met (transparency view)</span>
            <ChevronDown size={16} className={`transition ${showIneligible ? "rotate-180" : ""}`} />
          </button>
          {showIneligible && (
            <div className="mt-3 space-y-3">
              {ineligible.map((r) => (
                <div key={r.schemeId} className="rounded-xl border border-slate-200 bg-white p-4 opacity-80">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-700">{r.schemeName}</p>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                      {t("notEligible")}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {r.hardFailures.map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-red-600">
                        <XCircle size={13} className="mt-0.5 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
