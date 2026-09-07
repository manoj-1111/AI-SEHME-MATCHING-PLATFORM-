"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2, CircleDashed, FileCheck2, HelpCircle, Info, Loader2,
} from "lucide-react";
import { buildDocumentChecklist } from "@/lib/matching/engine";
import {
  getDocStatuses, getMatches, getProfile, setDocStatus, type DocStatus,
} from "@/lib/client/store";
import type { UserProfile } from "@/types";

export default function DocumentsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [statuses, setStatuses] = useState<Record<string, DocStatus>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProfile(getProfile());
    setStatuses(getDocStatuses());
    setReady(true);
  }, []);

  const checklist = useMemo(() => {
    if (!profile) return [];
    const matches = getMatches();
    const topSchemes = (matches?.eligible ?? []).slice(0, 3).map((m) => m.scheme);
    return buildDocumentChecklist(profile, topSchemes);
  }, [profile]);

  if (!ready)
    return <div className="flex justify-center py-32"><Loader2 className="animate-spin text-emerald-600" size={28} /></div>;

  if (!profile)
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <FileCheck2 size={36} className="mx-auto text-slate-300" />
        <h1 className="mt-4 text-xl font-bold text-slate-900">Create your profile first</h1>
        <p className="mt-2 text-sm text-slate-600">Your document checklist is personalised from your profile and top scheme matches.</p>
        <Link href="/onboarding" className="mt-6 inline-block rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700">
          Create profile
        </Link>
      </div>
    );

  const required = checklist.filter((c) => c.required);
  const optional = checklist.filter((c) => !c.required);
  const doneCount = required.filter((c) => statuses[c.name] === "ready").length;
  const pct = required.length ? Math.round((doneCount / required.length) * 100) : 0;

  const cycle = (name: string) => {
    const current = statuses[name] ?? "missing";
    const next: DocStatus = current === "missing" ? "ready" : current === "ready" ? "optional" : "missing";
    setStatuses({ ...setDocStatus(name, next) });
  };

  const StatusBadge = ({ s }: { s: DocStatus }) =>
    s === "ready" ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"><CheckCircle2 size={12} /> Ready</span>
    ) : s === "optional" ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600"><HelpCircle size={12} /> Optional</span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700"><CircleDashed size={12} /> Missing</span>
    );

  const Row = ({ name, hint, required }: { name: string; hint: string; required: boolean }) => (
    <button
      onClick={() => cycle(name)}
      className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-emerald-300 hover:shadow-sm"
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
        statuses[name] === "ready" ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
      }`}>
        <FileCheck2 size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-slate-800">
          {name}
          {required && <span className="ml-1 text-red-500">*</span>}
        </span>
        <span className="block text-xs text-slate-500">{hint}</span>
      </span>
      <StatusBadge s={statuses[name] ?? "missing"} />
    </button>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Your Document Checklist</h1>
      <p className="mt-1 text-sm text-slate-600">
        Personalised from your profile ({profile.category}, {profile.state}, {profile.sector}) and top scheme matches. Tap a document to change its status.
      </p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">
            {doneCount} of {required.length} required documents ready
          </p>
          <span className="text-sm font-bold text-emerald-700">{pct}%</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">Required documents</h2>
      <div className="mt-3 space-y-2.5">
        {required.map((c) => <Row key={c.name} {...c} />)}
      </div>

      {optional.length > 0 && (
        <>
          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">Scheme-specific / optional</h2>
          <div className="mt-3 space-y-2.5">
            {optional.map((c) => <Row key={c.name} {...c} />)}
          </div>
        </>
      )}

      <div className="mt-8 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs leading-relaxed text-blue-800">
        <Info size={14} className="mt-0.5 shrink-0" />
        Tip: Aadhaar, PAN, bank passbook and category certificates cover most schemes. Income and caste certificates can be obtained from your Taluk/Tehsil office or e-Sevai/e-District portals.
      </div>
    </div>
  );
}
