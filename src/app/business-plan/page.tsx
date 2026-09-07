"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2, Printer, Sparkles, TriangleAlert } from "lucide-react";
import { getProfile } from "@/lib/client/store";
import { BUSINESS_SECTORS } from "@/types";
import type { PlanSection } from "@/lib/ai/plan";

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none";

export default function BusinessPlanPage() {
  const [form, setForm] = useState({
    businessName: "",
    businessType: "Proprietorship",
    sector: "",
    location: "",
    investment: 0,
    employees: 0,
    targetCustomers: "",
    ownerName: "",
  });
  const [sections, setSections] = useState<PlanSection[] | null>(null);
  const [source, setSource] = useState<"ai" | "rules" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const p = getProfile();
    if (p)
      setForm((f) => ({
        ...f,
        businessName: p.businessName || f.businessName,
        businessType: p.businessType || f.businessType,
        sector: (p.sector as string) || f.sector,
        location: p.businessLocation || `${p.district}, ${p.state}`,
        investment: p.fundingRequired || f.investment,
        employees: p.employees || f.employees,
        ownerName: p.fullName || f.ownerName,
      }));
  }, []);

  const generate = async () => {
    setError("");
    if (!form.sector || !form.location || !form.investment) {
      setError("Please fill sector, location and investment.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/business-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Generation failed");
      setSections(d.sections);
      setSource(d.source);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">AI Business Plan Assistant</h1>
      <p className="mt-1 text-sm text-slate-600">
        Generate a structured draft project report to attach with your scheme applications.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Business Name</label>
                <input className={inputCls} value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} placeholder="e.g., Priya Foods" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Business Type</label>
                <select className={inputCls} value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })}>
                  <option>Proprietorship</option><option>Partnership</option>
                  <option>Private Limited</option><option>SHG / Cooperative</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Sector *</label>
                <select className={inputCls} value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })}>
                  <option value="">Select</option>
                  {BUSINESS_SECTORS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Location *</label>
                <input className={inputCls} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g., Madurai, Tamil Nadu" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Investment (₹) *</label>
                  <input type="number" className={inputCls} value={form.investment || ""} onChange={(e) => setForm({ ...form, investment: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Employees</label>
                  <input type="number" className={inputCls} value={form.employees || ""} onChange={(e) => setForm({ ...form, employees: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Target Customers</label>
                <input className={inputCls} value={form.targetCustomers} onChange={(e) => setForm({ ...form, targetCustomers: e.target.value })} placeholder="e.g., local households, retail shops" />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button
                onClick={generate}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {loading ? "Generating…" : "Generate Business Plan"}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          {!sections ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <FileText size={36} className="text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">
                Fill in the details and click &quot;Generate Business Plan&quot; — the draft appears here.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {form.businessName || "Business Plan Draft"}
                  </h2>
                  <p className="text-xs text-slate-500">{form.sector} · {form.location}</p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Printer size={14} /> Print / Save PDF
                </button>
              </div>
              <div className="mt-2 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                <TriangleAlert size={14} className="mt-0.5 shrink-0" />
                AI-generated draft ({source === "ai" ? "LLM-assisted" : "template engine — no AI key configured"}) — review and adjust all figures before submitting to any bank or agency.
              </div>
              <div className="mt-4 space-y-5">
                {sections.map((s) => (
                  <section key={s.title}>
                    <h3 className="text-sm font-bold uppercase tracking-wide text-emerald-700">{s.title}</h3>
                    <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-700">{s.content}</p>
                  </section>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
