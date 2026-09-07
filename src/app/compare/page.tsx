"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Award, Check, GitCompareArrows, Loader2, Minus, X } from "lucide-react";
import type { Scheme } from "@/types";
import { formatINR, scoreScheme } from "@/lib/matching/engine";
import { getCompareList, getProfile, setCompareList } from "@/lib/client/store";

export default function ComparePage() {
  const [ids, setIds] = useState<string[]>([]);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const list = getCompareList();
    setIds(list);
    fetch("/api/schemes")
      .then((r) => r.json())
      .then((d) => setSchemes((d.schemes ?? []).filter((s: Scheme) => list.includes(s.id))))
      .finally(() => setLoading(false));
  }, []);

  const profile = useMemo(() => getProfile(), []);
  const scored = useMemo(
    () =>
      schemes.map((s) => ({
        scheme: s,
        match: profile ? scoreScheme(profile, s) : null,
      })),
    [schemes, profile],
  );

  const bestId = useMemo(() => {
    const eligible = scored.filter((s) => s.match?.eligible);
    const pool = eligible.length ? eligible : scored;
    return pool.sort((a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0))[0]?.scheme.id;
  }, [scored]);

  const remove = (id: string) => {
    const next = ids.filter((x) => x !== id);
    setIds(next);
    setCompareList(next);
    setSchemes((s) => s.filter((x) => x.id !== id));
  };

  if (loading)
    return <div className="flex justify-center py-32"><Loader2 className="animate-spin text-emerald-600" size={28} /></div>;

  if (schemes.length < 2)
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <GitCompareArrows size={36} className="mx-auto text-slate-300" />
        <h1 className="mt-4 text-xl font-bold text-slate-900">Select schemes to compare</h1>
        <p className="mt-2 text-sm text-slate-600">
          Pick 2–3 schemes using the &quot;Compare&quot; button on your dashboard or a scheme page.
        </p>
        <Link href="/dashboard" className="mt-6 inline-block rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700">
          Go to Dashboard
        </Link>
      </div>
    );

  const Bool = ({ v }: { v: boolean }) =>
    v ? <Check size={16} className="mx-auto text-emerald-600" /> : <Minus size={16} className="mx-auto text-slate-300" />;

  const rows: { label: string; render: (s: Scheme) => React.ReactNode }[] = [
    {
      label: "Match Score",
      render: (s) => {
        const m = scored.find((x) => x.scheme.id === s.id)?.match;
        return m ? (
          <span className={`text-lg font-bold ${m.eligible ? "text-emerald-700" : "text-slate-400"}`}>
            {m.score}%{!m.eligible && <span className="block text-[10px] font-medium text-red-500">criteria not met</span>}
          </span>
        ) : (
          <span className="text-xs text-slate-400">Create profile</span>
        );
      },
    },
    { label: "Loan", render: (s) => <Bool v={s.loan} /> },
    { label: "Subsidy", render: (s) => <Bool v={s.subsidy} /> },
    { label: "Grant", render: (s) => <Bool v={s.grant} /> },
    { label: "Training", render: (s) => <Bool v={s.training} /> },
    {
      label: "Funding Range",
      render: (s) =>
        s.maxFunding ? (
          <span className="text-xs font-medium text-slate-700">
            {formatINR(s.minFunding ?? 0)} – {formatINR(s.maxFunding)}
          </span>
        ) : (
          <span className="text-xs text-slate-400">Non-financial</span>
        ),
    },
    { label: "Target Group", render: (s) => <span className="text-xs text-slate-600">{s.targetBeneficiaries}</span> },
    {
      label: "Business Type / Sectors",
      render: (s) => (
        <span className="text-xs text-slate-600">
          {s.sectors.length ? s.sectors.slice(0, 4).join(", ") + (s.sectors.length > 4 ? "…" : "") : "All sectors"}
        </span>
      ),
    },
    {
      label: "Documents",
      render: (s) => (
        <span className="text-xs text-slate-600">{s.documents.length} required
          <span className="block text-[10px] text-slate-400">{s.documents.slice(0, 2).join(", ")}…</span>
        </span>
      ),
    },
    { label: "Application Method", render: (s) => <span className="text-xs text-slate-600">{s.applicationSteps[0]}</span> },
    {
      label: "Verification",
      render: (s) => (
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          s.verificationStatus === "verified" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
        }`}>
          {s.verificationStatus === "verified" ? "Verified source" : "Demo data"}
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Scheme Comparison</h1>
      <p className="mt-1 text-sm text-slate-600">Side-by-side view of your selected schemes. Best fit is based on your match score.</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr>
              <th className="w-44 border-b border-slate-200 bg-slate-50 p-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Scheme
              </th>
              {schemes.map((s) => (
                <th key={s.id} className={`border-b border-slate-200 p-4 align-top ${s.id === bestId ? "bg-emerald-50/70" : "bg-slate-50"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {s.id === bestId && (
                        <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          <Award size={10} /> BEST FIT
                        </span>
                      )}
                      <Link href={`/schemes/${s.id}`} className="block text-sm font-semibold text-slate-900 hover:text-emerald-700">
                        {s.name}
                      </Link>
                      <p className="mt-0.5 text-[11px] font-normal text-slate-500">{s.ministry}</p>
                    </div>
                    <button onClick={() => remove(s.id)} className="rounded p-1 text-slate-400 hover:bg-slate-100" title="Remove">
                      <X size={14} />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.label} className={i % 2 ? "bg-slate-50/50" : ""}>
                <td className="border-b border-slate-100 p-4 text-xs font-semibold text-slate-600">{r.label}</td>
                {schemes.map((s) => (
                  <td key={s.id} className={`border-b border-slate-100 p-4 text-center ${s.id === bestId ? "bg-emerald-50/40" : ""}`}>
                    {r.render(s)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">Eligibility and benefits are subject to official verification.</p>
    </div>
  );
}
