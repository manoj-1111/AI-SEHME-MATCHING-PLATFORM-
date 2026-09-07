"use client";

import Link from "next/link";
import {
  Award, BadgeCheck, Bookmark, BookmarkCheck, CheckCircle2, ChevronRight,
  FileText, GitCompareArrows, TriangleAlert,
} from "lucide-react";
import type { MatchResult } from "@/types";
import { formatINR } from "@/lib/matching/engine";
import { useI18n } from "@/lib/i18n/context";

export function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const color = score >= 80 ? "#059669" : score >= 60 ? "#0d9488" : score >= 40 ? "#d97706" : "#94a3b8";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#e2e8f0" strokeWidth={5} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={5} fill="none"
          strokeDasharray={c} strokeDashoffset={c - (c * score) / 100} strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-800">
        {score}%
      </span>
    </div>
  );
}

export default function SchemeCard({
  result,
  rank,
  saved,
  comparing,
  onToggleSave,
  onToggleCompare,
}: {
  result: MatchResult;
  rank: number;
  saved: boolean;
  comparing: boolean;
  onToggleSave: (id: string) => void;
  onToggleCompare: (id: string) => void;
}) {
  const { t } = useI18n();
  const s = result.scheme;
  const isTop = rank === 0;
  const supports = [
    s.loan && "Loan",
    s.subsidy && "Subsidy",
    s.grant && "Grant",
    s.training && "Training",
  ].filter(Boolean) as string[];

  return (
    <div
      className={`relative rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
        isTop ? "border-emerald-300 ring-1 ring-emerald-200" : "border-slate-200"
      }`}
    >
      {isTop && (
        <span className="absolute -top-3 left-5 flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow">
          <Award size={12} /> {t("topMatch")}
        </span>
      )}
      <div className="flex items-start gap-4">
        <ScoreRing score={result.score} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">{s.name}</h3>
            {s.verificationStatus === "verified" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                <BadgeCheck size={11} /> Verified source
              </span>
            ) : (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                Demo/Prototype Data
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">{s.ministry}</p>
          <p className="mt-2 line-clamp-2 text-sm text-slate-600">{s.description}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
              <CheckCircle2 size={12} /> {t("potentiallyEligible")}
            </span>
            {s.maxFunding && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                Up to {formatINR(s.maxFunding)}
              </span>
            )}
            {supports.map((x) => (
              <span key={x} className="rounded-full bg-teal-50 px-2.5 py-1 font-medium text-teal-700">
                {x}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("whyMatches")}
        </p>
        <ul className="mt-1.5 space-y-1">
          {result.reasons.slice(0, 3).map((r, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
              <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-600" /> {r}
            </li>
          ))}
          {result.warnings.slice(0, 1).map((w, i) => (
            <li key={`w${i}`} className="flex items-start gap-1.5 text-xs text-amber-700">
              <TriangleAlert size={13} className="mt-0.5 shrink-0" /> {w}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <FileText size={13} />
        {s.documents.slice(0, 3).join(" · ")}
        {s.documents.length > 3 && ` +${s.documents.length - 3} more`}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={`/schemes/${s.id}`}
          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          {t("viewDetails")} <ChevronRight size={15} />
        </Link>
        <button
          onClick={() => onToggleCompare(s.id)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
            comparing
              ? "border-teal-500 bg-teal-50 text-teal-700"
              : "border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <GitCompareArrows size={15} /> {comparing ? "Comparing" : t("compare")}
        </button>
        <button
          onClick={() => onToggleSave(s.id)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
            saved
              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
              : "border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          {saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
          {saved ? t("saved") : t("saveScheme")}
        </button>
      </div>
    </div>
  );
}
