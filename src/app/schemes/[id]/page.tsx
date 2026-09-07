"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, BadgeCheck, Banknote, Bookmark, BookmarkCheck, CalendarCheck2,
  CheckCircle2, ClipboardList, ExternalLink, FileText, GitCompareArrows,
  GraduationCap, HandCoins, Info, Landmark, ListChecks, Loader2, Percent,
  ShieldAlert, Sparkles, TriangleAlert, Users, XCircle,
} from "lucide-react";
import type { MatchResult, Scheme } from "@/types";
import { formatINR, scoreScheme } from "@/lib/matching/engine";
import { ScoreRing } from "@/components/SchemeCard";
import {
  getCompareList, getProfile, getSaved, getUser, toggleCompare, toggleSaved,
} from "@/lib/client/store";
import { useI18n } from "@/lib/i18n/context";

export default function SchemeDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const router = useRouter();
  const [scheme, setScheme] = useState<Scheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<string[]>([]);
  const [compare, setCompare] = useState<string[]>([]);
  const [tracking, setTracking] = useState(false);
  const [trackMsg, setTrackMsg] = useState("");

  useEffect(() => {
    setSaved(getSaved());
    setCompare(getCompareList());
    fetch(`/api/schemes/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.scheme) setScheme(d.scheme);
        else setError(d.error || "Scheme not found");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [id]);

  const match: MatchResult | null = useMemo(() => {
    if (!scheme) return null;
    const profile = getProfile();
    if (!profile) return null;
    return scoreScheme(profile, scheme);
  }, [scheme]);

  const startTracking = async () => {
    if (!scheme) return;
    const user = getUser();
    if (!user) { router.push("/login"); return; }
    setTracking(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, schemeId: scheme.id, schemeName: scheme.name }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setTrackMsg(d.existed ? "Already in your applications." : "Added to your applications!");
      setTimeout(() => router.push("/applications"), 900);
    } catch {
      setTrackMsg("Could not start tracking. Try again.");
    } finally {
      setTracking(false);
    }
  };

  if (loading)
    return <div className="flex justify-center py-32"><Loader2 className="animate-spin text-emerald-600" size={28} /></div>;
  if (error || !scheme)
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <XCircle size={36} className="mx-auto text-slate-300" />
        <p className="mt-3 text-slate-700">{error || "Scheme not found"}</p>
        <Link href="/schemes" className="mt-4 inline-block text-sm font-semibold text-emerald-700">← Back to schemes</Link>
      </div>
    );

  const supports = [
    { on: scheme.loan, label: "Loan", icon: Banknote, desc: scheme.maxFunding ? `Up to ${formatINR(scheme.maxFunding)}` : "Available" },
    { on: scheme.subsidy, label: "Subsidy", icon: Percent, desc: "Capital/margin subsidy" },
    { on: scheme.grant, label: "Grant", icon: HandCoins, desc: "Non-repayable support" },
    { on: scheme.training, label: "Training", icon: GraduationCap, desc: "Skill / EDP training" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> Back
      </button>

      {/* Header */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {scheme.verificationStatus === "verified" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                  <BadgeCheck size={12} /> Summarised from official source
                </span>
              ) : (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">Demo/Prototype Data</span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                <CalendarCheck2 size={12} /> {t("lastVerified")}: {scheme.lastVerified}
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-bold text-slate-900">{scheme.name}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
              <Landmark size={14} /> {scheme.ministry}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">{scheme.description}</p>
          </div>
          {match && (
            <div className="flex flex-col items-center gap-1 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <ScoreRing score={match.score} size={72} />
              <p className="text-xs font-semibold text-slate-600">{t("match")}</p>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                match.eligible ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
              }`}>
                {match.eligible ? t("potentiallyEligible") : t("notEligible")}
              </span>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <a
            href={scheme.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <ExternalLink size={15} /> {t("applyOfficial")}
          </a>
          <button
            onClick={startTracking}
            disabled={tracking}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
          >
            <ClipboardList size={15} /> {tracking ? "Adding…" : "Track application"}
          </button>
          <button
            onClick={() => setSaved(toggleSaved(scheme.id))}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium ${
              saved.includes(scheme.id)
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {saved.includes(scheme.id) ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
            {saved.includes(scheme.id) ? t("saved") : t("saveScheme")}
          </button>
          <button
            onClick={() => setCompare(toggleCompare(scheme.id))}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium ${
              compare.includes(scheme.id)
                ? "border-teal-500 bg-teal-50 text-teal-700"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <GitCompareArrows size={15} /> {compare.includes(scheme.id) ? "In comparison" : t("compare")}
          </button>
        </div>
        {trackMsg && <p className="mt-2 text-sm font-medium text-emerald-700">{trackMsg}</p>}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Why you matched */}
          {match ? (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6">
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <Sparkles size={17} className="text-emerald-600" /> {t("whyMatches")}
              </h2>
              {match.eligible ? (
                <>
                  <ul className="mt-3 space-y-2">
                    {match.reasons.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> {r}
                      </li>
                    ))}
                  </ul>
                  {match.warnings.length > 0 && (
                    <ul className="mt-3 space-y-2 border-t border-emerald-200 pt-3">
                      {match.warnings.map((w, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                          <TriangleAlert size={15} className="mt-0.5 shrink-0" /> {w}
                        </li>
                      ))}
                    </ul>
                  )}
                  {/* Score breakdown */}
                  <div className="mt-4 rounded-xl bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Match score breakdown</p>
                    <div className="mt-2 grid gap-1.5">
                      {match.breakdown.map((b) => (
                        <div key={b.factor} className="flex items-center gap-2 text-xs">
                          <span className="w-20 shrink-0 font-medium text-slate-600">{b.factor}</span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${b.score * 100}%` }} />
                          </div>
                          <span className="w-24 shrink-0 text-right text-slate-400">
                            {Math.round(b.score * 100)}% × {Math.round(b.weight * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <ul className="mt-3 space-y-2">
                  {match.hardFailures.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                      <XCircle size={16} className="mt-0.5 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
              <Link href="/onboarding" className="font-semibold text-emerald-700">Create your profile</Link>{" "}
              to see a personalised match score and eligibility explanation for this scheme.
            </section>
          )}

          {/* Who can apply */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Users size={17} className="text-emerald-600" /> Who can apply?
            </h2>
            <p className="mt-2 text-sm text-slate-600">{scheme.targetBeneficiaries}</p>
            <ul className="mt-3 space-y-2">
              {scheme.eligibility.map((e, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-teal-600" /> {e}
                </li>
              ))}
            </ul>
          </section>

          {/* Benefits */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <HandCoins size={17} className="text-emerald-600" /> Benefits
            </h2>
            <ul className="mt-3 space-y-2">
              {scheme.benefits.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" /> {b}
                </li>
              ))}
            </ul>
          </section>

          {/* Application steps */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <ListChecks size={17} className="text-emerald-600" /> Application steps
            </h2>
            <ol className="mt-4 space-y-4">
              {scheme.applicationSteps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">{i + 1}</span>
                  <p className="pt-1 text-sm text-slate-700">{s}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-900">Support offered</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {supports.map((s) => (
                <div key={s.label} className={`rounded-xl border p-3 ${s.on ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-slate-50 opacity-50"}`}>
                  <s.icon size={16} className={s.on ? "text-emerald-600" : "text-slate-400"} />
                  <p className="mt-1 text-xs font-semibold text-slate-800">{s.label}</p>
                  <p className="text-[10px] text-slate-500">{s.on ? s.desc : "Not offered"}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <FileText size={15} className="text-emerald-600" /> {t("requiredDocs")}
            </h3>
            <ul className="mt-3 space-y-2">
              {scheme.documents.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                  <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-teal-600" /> {d}
                </li>
              ))}
            </ul>
            <Link href="/documents" className="mt-3 inline-block text-xs font-semibold text-emerald-700 hover:underline">
              Open my document checklist →
            </Link>
          </section>

          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-amber-800">
              <ShieldAlert size={15} /> Important notes
            </h3>
            <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-amber-800">
              <li>• You appear to meet the listed criteria — this is not an approval.</li>
              <li>• Eligibility and benefits are subject to official verification.</li>
              <li>• Figures are simplified summaries; guidelines change periodically.</li>
              <li>• Never pay agents — government applications are direct and mostly free.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 text-xs text-slate-500">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <Info size={15} className="text-emerald-600" /> Official source
            </h3>
            <a href={scheme.officialUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block break-all font-medium text-emerald-700 hover:underline">
              {scheme.officialUrl}
            </a>
            <p className="mt-2">{t("lastVerified")}: {scheme.lastVerified}</p>
            <p className="mt-1">
              Status: {scheme.verificationStatus === "verified" ? "Verified against official source" : "Demo/Prototype Data"}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
