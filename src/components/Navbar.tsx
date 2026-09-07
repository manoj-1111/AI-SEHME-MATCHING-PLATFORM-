"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Landmark, Menu, X, Globe, LogOut, LayoutDashboard, FileCheck2,
  ClipboardList, FileText, ShieldCheck, Search, UserCircle2,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { LANGUAGES, type Lang } from "@/lib/i18n/translations";
import { getUser, clearUser } from "@/lib/client/store";
import type { AppUser } from "@/types";

export default function Navbar() {
  const { t, lang, setLang } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUserState] = useState<AppUser | null>(null);

  useEffect(() => {
    setUserState(getUser());
  }, [pathname]);

  const links = [
    { href: "/schemes", label: t("exploreSchemes"), icon: Search },
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/documents", label: t("documents"), icon: FileCheck2 },
    { href: "/applications", label: t("applications"), icon: ClipboardList },
    { href: "/business-plan", label: t("businessPlan"), icon: FileText },
    { href: "/admin", label: t("admin"), icon: ShieldCheck },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-sm">
            <Landmark size={18} />
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            UdyamSetu <span className="text-emerald-600">AI</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                pathname.startsWith(l.href)
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="relative hidden items-center sm:flex">
            <Globe size={15} className="pointer-events-none absolute left-2.5 text-slate-500" />
            <select
              aria-label="Language"
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className="appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-6 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.native}
                </option>
              ))}
            </select>
          </div>

          {user ? (
            <div className="hidden items-center gap-2 lg:flex">
              <span className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
                <UserCircle2 size={16} className="text-emerald-600" />
                {user.name.split(" ")[0]}
              </span>
              <button
                onClick={() => {
                  clearUser();
                  setUserState(null);
                  router.push("/");
                }}
                title={t("logout")}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 lg:block"
            >
              {t("login")}
            </Link>
          )}

          <button
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
          <div className="grid gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <l.icon size={16} className="text-emerald-600" />
                {l.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-3">
              <Globe size={15} className="text-slate-500" />
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as Lang)}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.native}
                  </option>
                ))}
              </select>
              {user ? (
                <button
                  onClick={() => { clearUser(); setUserState(null); setOpen(false); router.push("/"); }}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700"
                >
                  {t("logout")}
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white"
                >
                  {t("login")}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
