"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck, ChevronLeft, ChevronRight, Landmark, Loader2, Search, SlidersHorizontal,
} from "lucide-react";
import type { Scheme } from "@/types";
import { formatINR } from "@/lib/matching/engine";

const PAGE_SIZE = 6;

export default function SchemesPage() {
  const [all, setAll] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [support, setSupport] = useState("All");
  const [page, setPage] = useState(1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/schemes")
      .then((r) => r.json())
      .then((d) => {
        if (d.schemes) setAll(d.schemes);
        else setError(d.error || "Failed to load schemes");
      })
      .catch(() => setError("Network error — could not load schemes"))
      .finally(() => setLoading(false));
  }, []);

  // Debounced search
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setDebounced(query);
      setPage(1);
    }, 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query]);

  const filtered = useMemo(() => {
    const q = debounced.toLowerCase();
    return all.filter((s) => {
      const okQ =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.ministry.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.sectors.some((x) => x.toLowerCase().includes(q));
      const okS =
        support === "All" ||
        (support === "Loan" && s.loan) ||
        (support === "Subsidy" && s.subsidy) ||
        (support === "Grant" && s.grant) ||
        (support === "Training" && s.training);
      return okQ && okS;
    });
  }, [all, debounced, support]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Explore Government Schemes</h1>
      <p className="mt-1 text-sm text-slate-600">
        {all.length} schemes in the knowledge base · verified sources marked with{" "}
        <BadgeCheck size={13} className="inline text-blue-600" />
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, ministry, sector…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={15} className="text-slate-400" />
          {["All", "Loan", "Subsidy", "Grant", "Training"].map((s) => (
            <button
              key={s}
              onClick={() => { setSupport(s); setPage(1); }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                support === s ? "bg-emerald-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:border-emerald-300"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="animate-spin text-emerald-600" size={28} /></div>
      ) : error ? (
        <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-700">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <Search size={32} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm text-slate-600">No schemes found for &quot;{debounced}&quot;. Try a different search term.</p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {visible.map((s) => (
              <Link
                key={s.id}
                href={`/schemes/${s.id}`}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Landmark size={18} />
                  </span>
                  {s.verificationStatus === "verified" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                      <BadgeCheck size={11} /> Verified source
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">Demo/Prototype Data</span>
                  )}
                </div>
                <h3 className="mt-3 text-base font-semibold text-slate-900 group-hover:text-emerald-700">{s.name}</h3>
                <p className="text-xs text-slate-500">{s.ministry}</p>
                <p className="mt-2 line-clamp-2 text-sm text-slate-600">{s.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-medium">
                  {s.loan && <span className="rounded-full bg-teal-50 px-2 py-0.5 text-teal-700">Loan</span>}
                  {s.subsidy && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">Subsidy</span>}
                  {s.grant && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700">Grant</span>}
                  {s.training && <span className="rounded-full bg-orange-50 px-2 py-0.5 text-orange-700">Training</span>}
                  {s.maxFunding && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">Up to {formatINR(s.maxFunding)}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {pages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: pages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`h-9 w-9 rounded-lg text-sm font-medium ${
                    page === i + 1 ? "bg-emerald-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage(Math.min(pages, page + 1))}
                disabled={page === pages}
                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
