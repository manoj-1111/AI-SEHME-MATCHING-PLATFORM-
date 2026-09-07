# UdyamSetu AI

> **Find the right government scheme for your business.**

Smart India Hackathon prototype for **SIH26092 — AI-Driven Scheme Matching for Marginalized Entrepreneurs**.

---

## Problem Statement

Marginalized entrepreneurs (SC/ST/OBC, women, rural, persons with disabilities, minorities, EWS) struggle to discover which of the hundreds of central/state government schemes actually apply to them. Information is scattered, eligibility rules are complex, and applications get rejected for missing documents.

## Solution

UdyamSetu AI is a full-stack web platform where an entrepreneur enters their profile once (via a guided form, natural language, or voice) and receives **ranked, explainable scheme recommendations** with match percentages, document checklists, application guidance, comparison tools, an AI assistant and a business-plan generator.

## Key Features

- 🧭 Multi-step profile onboarding (Personal → Economic → Business → Funding → Results)
- 🗣️ Natural-language & voice profile extraction ("I am a 28-year-old woman from Tamil Nadu…")
- ⚖️ Rule-based **hard eligibility engine** (age, income, category, gender, state, sector)
- 🎯 **Weighted AI match score (0–100)** with per-factor breakdown
- 💡 Explainable AI — "Why this scheme matches you" with ✓ reasons and ⚠ cautions
- 📊 Recommendation dashboard, scheme details, comparison (up to 3, Best Fit indicator)
- 📄 Personalised document checklist with Ready/Missing/Optional tracking
- 🗂️ Demo application tracking with timeline (Not Started → … → Approved/Rejected)
- 🤖 Floating **Udyam AI Assistant** grounded in the user's profile + scheme data (never hallucinates; falls back deterministically without an API key)
- 📝 AI Business Plan draft generator
- 🌐 Multilingual UI (English + Tamil fully; Hindi/Telugu/Kannada/Malayalam scaffolded)
- 🛠️ Admin dashboard: analytics charts (Recharts) + scheme add/verify/outdate/delete
- 🎬 One-click **Demo Mode** (Priya, SC woman food-processing entrepreneur from Madurai)

## Architecture

```
                          ┌──────────────────────────────┐
  User (form / voice /    │  Next.js App Router (React,  │
  natural language)  ───▶ │  TypeScript, Tailwind CSS)   │
                          └──────────────┬───────────────┘
                                         │ REST (Next.js API routes)
        ┌────────────────────────────────┼─────────────────────────────────┐
        ▼                                ▼                                 ▼
┌───────────────┐            ┌─────────────────────┐            ┌──────────────────┐
│  AI Layer     │            │  Matching Pipeline  │            │  PostgreSQL      │
│  /lib/ai      │            │  /lib/matching      │            │  via Drizzle ORM │
│ ─ extraction  │            │  1. Normalization   │            │ ─ users/profiles │
│ ─ chatbot     │            │  2. HARD rules      │            │ ─ schemes (17)   │
│ ─ biz plan    │            │  3. Weighted score  │            │ ─ applications   │
│ (LLM optional │            │  4. Explanations    │            │ ─ match_runs     │
│  + rule-based │            │  5. Ranking         │            └──────────────────┘
│  fallback)    │            └─────────────────────┘
└───────────────┘

Profile → Normalization → Hard Eligibility Rules → Remove ineligible →
AI/Semantic Matching → Weighted Ranking → Explainable Recommendations
```

## Matching Algorithm

Hard rules eliminate schemes (age band, income ceiling, category/gender/state restriction, hard sector limits, disability/minority requirements). Remaining schemes get a weighted score:

| Factor | Weight |
|---|---|
| Category | 20% |
| Business sector | 15% |
| Income | 15% |
| Gender | 10% |
| Location | 10% |
| Business stage | 10% |
| Funding requirement | 10% |
| Age | 5% |
| Support type | 5% |

`Score = Σ (factor_score × weight) × 100`

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Lucide icons, Recharts
- **Backend:** Next.js API routes
- **Database:** PostgreSQL + Drizzle ORM
- **AI:** OpenAI-compatible LLM (optional) + deterministic rule-based fallbacks so everything works offline

## Project Structure

```
src/
  app/               pages + api routes (schemes, match, extract, chat, plan, auth, applications, admin)
  components/        Navbar, Chatbot, SchemeCard
  data/schemes.ts    scheme knowledge base (17 schemes)
  db/                Drizzle schema + seeding
  lib/ai             LLM client, extraction, chatbot, business-plan
  lib/matching       eligibility + scoring engine + document checklist
  lib/i18n           translations (en/ta + scaffolds)
  lib/client         localStorage store, demo profile
  types/             shared TypeScript types
```

## Installation & Running

```bash
cp .env.example .env        # set DATABASE_URL (and optionally AI_API_KEY)
npm install
npx drizzle-kit push        # create tables
npm run dev                 # http://localhost:3000
```

The database auto-seeds 17 schemes + 5 demo entrepreneurs on first API call.

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection (required) |
| `AI_API_KEY` | Optional LLM key — fallback engines run without it |
| `AI_BASE_URL`, `AI_MODEL` | Optional LLM overrides |

## Demo Credentials / Demo Mode

- **Demo Login:** click *Demo Login (Priya)* on `/login` — `priya@demo.udyamsetu.in`
- **Demo Mode:** the landing-page *Demo Mode* button auto-fills Priya's profile (28, Female, SC, Tamil Nadu, Food Processing, ₹5L need), runs matching and opens the dashboard — the full SIH demo flow works end-to-end without typing anything.

## Trust & Safety

- Results say **"potentially eligible"** / "you appear to meet the listed criteria" — never guarantees
- Every scheme shows an official URL, **Last Verified** date and verification status
- Prototype-only records are clearly labelled **"Demo/Prototype Data"**
- The chatbot refuses to answer beyond its verified knowledge base

## Future Scope

- Real DigiLocker/Aadhaar-based eKYC and document pull
- Live integration with myScheme / JanSamarth APIs for real-time scheme data
- Vector-embedding semantic matching over full scheme corpora
- Full translations for all scheduled languages + voice output (TTS)
- Bank/CSC partner dashboards and application hand-off APIs
