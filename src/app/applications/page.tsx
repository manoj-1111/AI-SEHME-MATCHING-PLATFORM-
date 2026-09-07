"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2, ChevronDown, ClipboardList, Clock, Loader2, ShieldAlert, XCircle,
} from "lucide-react";
import { getUser } from "@/lib/client/store";
import { APPLICATION_STATUSES, type TimelineEntry } from "@/types";

interface AppRow {
  id: number;
  schemeId: string;
  schemeName: string;
  status: string;
  timeline: TimelineEntry[];
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  "Not Started": "bg-slate-100 text-slate-600",
  "Documents Pending": "bg-amber-100 text-amber-700",
  "Application Draft": "bg-blue-100 text-blue-700",
  Submitted: "bg-indigo-100 text-indigo-700",
  "Under Review": "bg-purple-100 text-purple-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-red-100 text-red-700",
};

export default function ApplicationsPage() {
  const [apps, setApps] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);
  const user = typeof window !== "undefined" ? getUser() : null;

  const load = useCallback(() => {
    const u = getUser();
    if (!u) { setLoading(false); return; }
    fetch(`/api/applications?userId=${u.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.applications) setApps(d.applications);
        else setError(d.error || "Failed to load");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: number, status: string) => {
    setUpdating(id);
    try {
      const res = await fetch("/api/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, note: "Status updated (demo tracking)" }),
      });
      const d = await res.json();
      if (d.application)
        setApps((prev) => prev.map((a) => (a.id === id ? d.application : a)));
    } finally {
      setUpdating(null);
    }
  };

  if (loading)
    return <div className="flex justify-center py-32"><Loader2 className="animate-spin text-emerald-600" size={28} /></div>;

  if (!user)
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <ClipboardList size={36} className="mx-auto text-slate-300" />
        <h1 className="mt-4 text-xl font-bold text-slate-900">Login to track applications</h1>
        <Link href="/login" className="mt-6 inline-block rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700">Login</Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Application Tracking</h1>
      <p className="mt-1 text-sm text-slate-600">
        Demo tracking to plan and monitor your scheme applications. Update statuses as you progress on official portals.
      </p>
      <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        <ShieldAlert size={14} className="mt-0.5 shrink-0" />
        This is prototype tracking — actual application status is available only on the official scheme portal.
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {apps.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <ClipboardList size={32} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm text-slate-600">
            No applications yet. Open a scheme and click &quot;Track application&quot; to start.
          </p>
          <Link href="/dashboard" className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
            View my recommendations
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {apps.map((a) => (
            <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/schemes/${a.schemeId}`} className="text-sm font-semibold text-slate-900 hover:text-emerald-700">
                    {a.schemeName}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Last updated {new Date(a.updatedAt).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[a.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {a.status}
                  </span>
                  <select
                    value={a.status}
                    disabled={updating === a.id}
                    onChange={(e) => updateStatus(a.id, e.target.value)}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
                  >
                    {APPLICATION_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Status pipeline */}
              <div className="mt-4 flex items-center gap-0.5 overflow-x-auto pb-1">
                {APPLICATION_STATUSES.filter((s) => s !== "Rejected").map((s, i, arr) => {
                  const currentIdx = arr.indexOf(a.status as (typeof arr)[number]);
                  const rejected = a.status === "Rejected";
                  const active = !rejected && currentIdx >= i;
                  return (
                    <div key={s} className="flex shrink-0 items-center">
                      <div className="flex flex-col items-center">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold ${
                          active ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400"
                        }`}>
                          {active ? <CheckCircle2 size={12} /> : i + 1}
                        </span>
                        <span className={`mt-1 w-16 text-center text-[9px] leading-tight ${active ? "text-emerald-700 font-medium" : "text-slate-400"}`}>
                          {s}
                        </span>
                      </div>
                      {i < arr.length - 1 && (
                        <span className={`mx-0.5 mb-4 h-0.5 w-6 ${!rejected && currentIdx > i ? "bg-emerald-500" : "bg-slate-200"}`} />
                      )}
                    </div>
                  );
                })}
                {a.status === "Rejected" && (
                  <span className="mb-4 ml-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-semibold text-red-700">
                    <XCircle size={11} /> Rejected
                  </span>
                )}
              </div>

              {/* Timeline */}
              <button
                onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                className="mt-2 flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
              >
                <Clock size={13} /> Timeline
                <ChevronDown size={13} className={`transition ${expanded === a.id ? "rotate-180" : ""}`} />
              </button>
              {expanded === a.id && (
                <ol className="mt-3 space-y-3 border-l-2 border-emerald-100 pl-4">
                  {[...(a.timeline ?? [])].reverse().map((tl, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <p className="text-xs font-semibold text-slate-800">{tl.status}</p>
                      <p className="text-[11px] text-slate-500">
                        {new Date(tl.date).toLocaleString("en-IN")} {tl.note ? `· ${tl.note}` : ""}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
