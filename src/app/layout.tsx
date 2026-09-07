import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/context";
import Navbar from "@/components/Navbar";
import Chatbot from "@/components/Chatbot";

export const metadata: Metadata = {
  title: "UdyamSetu AI — Find the right government scheme for your business",
  description:
    "AI-driven scheme matching for marginalized entrepreneurs. SIH26092 prototype.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <LanguageProvider>
          <Navbar />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
          <footer className="border-t border-slate-200 bg-white py-6">
            <div className="mx-auto max-w-7xl px-4 text-center text-xs text-slate-500">
              <p className="font-medium">
                UdyamSetu AI — SIH26092 Prototype · Eligibility and benefits are
                subject to official verification.
              </p>
              <p className="mt-1">
                Scheme information is summarised from official sources where
                verified; records marked &quot;Demo/Prototype Data&quot; are for
                demonstration only. This platform never guarantees approval of any
                loan, subsidy or grant.
              </p>
            </div>
          </footer>
          <Chatbot />
        </LanguageProvider>
      </body>
    </html>
  );
}
