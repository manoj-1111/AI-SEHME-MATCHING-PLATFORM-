"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck, BarChart3, ClipboardList, Landmark, Loader2, Plus, RefreshCcw,
  ShieldCheck, Sparkles, Trash2, TriangleAlert, Users,
} from "lucide-react";
import {
  Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip,
  XAxis, YAxis,
} from "recharts";

interface Stats {
  totals: {
    entrepreneurs: number;
    schemes: number;
    recommendations: number;
    applications: number;
    successfulMatches: number;
  };
  byState: { name: string; value: number }[];
  byCategory: { name: string; value: number }[];
  bySector: { name: string; value: number }[];
  byAppStatus: { name: string; value: number }[];
  mostRecommended: { name: string; value: number }[];
  schemes: {
    id: string;
    name: string;
    ministry: string;
    verificationStatus: string;
    lastVerified: string;
    isActive: boolean;
  }[];
}

const COLORS = ["#059669", "#0d9488", "#0891b2", "#6366f1", "#d97706", "#dc2626", "#7c3aed", "#64748b"];

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newScheme, setNewScheme] = useState({ name: "", ministry: "", description: "", officialUrl: "" });
  const [addMsg, setAddMsg] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d.totals) setStats(d);
        else setError(d.error || "Failed to load stats");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const action = async (id: string, act: "verify" | "outdated" | "delete" | "toggle") => {
    if (act === "delete" && !confirm("Delete this scheme?")) return;
    setBusy(id + act);
    try {
      await fetch("/api/schemes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: act }),
      });
      load();
    } finally {
      setBusy(null);
    }
  };

  const addScheme = async () => {
    setAddMsg("");
    if (!newScheme.name || !newScheme.ministry || !newScheme.description) {
      setAddMsg("Name, ministry and description are required.");
      return;
    }
    setBusy("add");
    try {
      const res = await fetch("/api/schemes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newScheme),
      });
      if (res.ok) {
        setNewScheme({ name: "", ministry: "", description: "", officialUrl: "" });
        setShowAdd(false);
        load();
      } else {
        const d = await res.json();
        setAddMsg(d.error || "Failed to add scheme");
      }
    } finally {
      setBusy(null);
    }
  };

  if (loading && !stats)
    return <div className="flex justify-center py-32"><Loader2 className="animate-spin text-emerald-600" size={28} /></div>;
  if (error && !stats)
    return <div className="mx-auto max-w-lg px-4 py-24 text-center text-sm text-red-600">{error}</div>;
  if (!stats) return null;

  const cards = [
    { label: "Total Entrepreneurs", value: stats.totals.entrepreneurs, icon: Users },
    { label: "Total Schemes", value: stats.totals.schemes, icon: Landmark },
    { label: "Recommendations Generated", value: stats.totals.recommendations, icon: Sparkles },
    { label: "Applications", value: stats.totals.applications, icon: ClipboardList },
    { label: "Successful Matches", value: stats.totals.successfulMatches, icon: BarChart3 },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <ShieldCheck className="text-emerald-600" size={24} /> Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-600">Platform analytics and scheme knowledge-base management.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
          <RefreshCcw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <c.icon size={18} className="text-emerald-600" />
            <p className="mt-2 text-2xl font-bold text-slate-900">{c.value}</p>
            <p className="text-xs text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">Entrepreneurs by State</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.byState}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
                <Tooltip />
                <Bar dataKey="value" fill="#059669" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">Entrepreneurs by Category</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.byCategory} dataKey="value" nameKey="name" outerRadius={85} label={({ name, value }) => `${name} (${value})`}>
                  {stats.byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">Most Recommended Schemes</h2>
          <div className="mt-3 h-64">
            {stats.mostRecommended.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-slate-400">
                Run a few matches to see data here.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.mostRecommended} layout="vertical" margin={{ left: 8 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 9 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0d9488" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">Business Sectors & Application Status</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.bySector} dataKey="value" nameKey="name" outerRadius={60} label={false}>
                  {stats.bySector.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Pie data={stats.byAppStatus} dataKey="value" nameKey="name" innerRadius={70} outerRadius={85}>
                  {stats.byAppStatus.map((_, i) => <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Scheme management */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-800">Scheme Management</h2>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            <Plus size={14} /> Add scheme
          </button>
        </div>

        {showAdd && (
          <div className="mt-4 grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 sm:grid-cols-2">
            <input placeholder="Scheme name *" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" value={newScheme.name} onChange={(e) => setNewScheme({ ...newScheme, name: e.target.value })} />
            <input placeholder="Ministry *" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" value={newScheme.ministry} onChange={(e) => setNewScheme({ ...newScheme, ministry: e.target.value })} />
            <input placeholder="Official URL" className="rounded-lg border border-slate-200 px-3 py-2 text-sm sm:col-span-2" value={newScheme.officialUrl} onChange={(e) => setNewScheme({ ...newScheme, officialUrl: e.target.value })} />
            <textarea placeholder="Description *" rows={2} className="rounded-lg border border-slate-200 px-3 py-2 text-sm sm:col-span-2" value={newScheme.description} onChange={(e) => setNewScheme({ ...newScheme, description: e.target.value })} />
            {addMsg && <p className="text-xs text-red-600 sm:col-span-2">{addMsg}</p>}
            <div className="sm:col-span-2">
              <button onClick={addScheme} disabled={busy === "add"} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">
                {busy === "add" ? "Adding…" : "Save scheme (marked as Demo data)"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3">Scheme</th>
                <th className="py-2 pr-3">Ministry</th>
                <th className="py-2 pr-3">Verification</th>
                <th className="py-2 pr-3">Last Verified</th>
                <th className="py-2 pr-3">Active</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stats.schemes.map((s) => (
                <tr key={s.id} className="border-b border-slate-100">
                  <td className="max-w-[240px] py-2.5 pr-3 font-medium text-slate-800">{s.name}</td>
                  <td className="max-w-[180px] py-2.5 pr-3 text-xs text-slate-500">{s.ministry}</td>
                  <td className="py-2.5 pr-3">
                    {s.verificationStatus === "verified" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700"><BadgeCheck size={11} /> Verified</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700"><TriangleAlert size={11} /> Demo/Outdated</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-slate-500">{s.lastVerified}</td>
                  <td className="py-2.5 pr-3">
                    <button
                      onClick={() => action(s.id, "toggle")}
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${s.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                    >
                      {s.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="py-2.5">
                    <div className="flex gap-1.5">
                      <button onClick={() => action(s.id, "verify")} disabled={busy === s.id + "verify"} className="rounded-lg border border-blue-200 px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-50">Verify</button>
                      <button onClick={() => action(s.id, "outdated")} disabled={busy === s.id + "outdated"} className="rounded-lg border border-amber-200 px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-50">Mark outdated</button>
                      <button onClick={() => action(s.id, "delete")} disabled={busy === s.id + "delete"} className="rounded-lg border border-red-200 px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
