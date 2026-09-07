"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Landmark, LogIn, PlayCircle, ShieldCheck } from "lucide-react";
import { setUser } from "@/lib/client/store";
import { readJsonResponse } from "@/lib/http/api";

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async (n: string, e: string) => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, email: e }),
      });
      const data = await readJsonResponse<{ error?: string; user?: { id: number; name: string; email: string; role: string } }>(res);
      if (!res.ok) throw new Error(data.error || "Login failed");
      if (data.user) setUser(data.user as typeof data.user & { id: number; name: string; email: string; role: string });
      router.push("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-b from-emerald-50 to-white px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
              <Landmark size={20} />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Welcome to UdyamSetu AI</h1>
              <p className="text-xs text-slate-500">Demo login — no password or Aadhaar needed</p>
            </div>
          </div>

          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!email.trim()) { setError("Please enter your email"); return; }
              login(name, email.trim().toLowerCase());
            }}
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Priya Murugan"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              <LogIn size={16} /> {loading ? "Signing in…" : "Continue"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" /> or <span className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            onClick={() => login("Priya Murugan", "priya@demo.udyamsetu.in")}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
          >
            <PlayCircle size={16} /> Demo Login (Priya — SIH presentation)
          </button>

          <p className="mt-5 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
            <ShieldCheck size={13} className="mt-0.5 shrink-0 text-emerald-600" />
            This is a prototype authentication for demonstration. Production would use
            secure OTP/DigiLocker-based verification. No real personal data is required.
          </p>
        </div>
      </div>
    </div>
  );
}
