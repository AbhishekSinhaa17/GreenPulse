# GreenPulse — Play with Purpose. Create Lasting Impact.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.x-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646cff.svg)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%7C%20Auth%20%7C%20RLS-3ecf8e.svg)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-Proprietary-darkgreen.svg)]()

GreenPulse is a modern, high-performance web platform uniting golfer performance tracking with verified monthly charity prize draws. Golfers log their official Stableford scores, designate and support vetted charitable causes with every subscription, and compete in monthly 5-number match prize pools with jackpot rollover mechanics.

---

## Key Platform Features

- **Golfer Workspace & FIFO Score Rotation**: Validates official Stableford scores (1–45 points) with one-score-per-date validation. Automatically maintains the golfer's 5 most recent scores using a strict First-In, First-Out (FIFO) database trigger.
- **Monthly Prize Draw Engine**: Dual-mode draw architecture (Lottery-Style Uniform Random & Score-Frequency Algorithmic). Generates 5 unique numbers between 1 and 45 with a 40% (Tier 1: 5-match jackpot with rollover), 35% (Tier 2: 4-match), and 25% (Tier 3: 3-match) prize pool split.
- **Charity Contribution Pledge**: Every subscriber pledges at least 10% (up to 100%) of their membership fee to a vetted charity partner. Includes a searchable nonprofit directory and direct donation support.
- **Winner Verification & Proof Pipeline**: End-to-end encrypted scorecard verification workflow. Winners upload official platform screenshots (Golf Genius, HowDidiDo, WHS apps) reviewed by platform administrators prior to payout release.
- **Operations & Admin Console**: Centralized console for member management, handicap audits, pre-publish draw simulations, charity directory curation, and aggregated platform analytics powered by Recharts.
- **Bespoke Editorial Design System**: Premium golf aesthetic crafted with warm cream canvases, deep forest greens, crisp lime accents, fluid micro-interactions via Framer Motion, and mobile-responsive drawer navigation.

---

## Technology Stack

- **Frontend Core**: React 19, TypeScript, Vite
- **Styling**: Vanilla CSS with customized design tokens (`src/styles/index.css`)
- **Animation & Visuals**: Framer Motion, Lucide React, Canvas Confetti
- **Analytics & Data Visualization**: Recharts
- **Backend & Database**: Supabase (PostgreSQL with Row Level Security, Realtime, and Private Storage)
- **Authentication**: Supabase Auth (Email & Password + Google OAuth 2.0)
- **Billing Integration**: Stripe Checkout (Monthly & Discounted Annual Subscriptions + Standalone Donations)
- **Testing & Quality Assurance**: Vitest, Oxlint, TypeScript strict mode

---

## Repository Structure

```text
├── docs/                   # Engineering & operational setup guides
│   ├── ARCHITECTURE.md     # Comprehensive database schema, RLS policies, & sequence diagrams
│   ├── GOOGLE_OAUTH_SETUP.md # Google Cloud OAuth 2.0 credentials & Supabase redirect setup
│   ├── INITIAL_ADMIN_SETUP.md # Admin role bootstrapping SQL instructions
│   └── STRIPE_SETUP.md     # Stripe products, webhooks, and billing setup
├── public/                 # Static assets and icons
├── src/
│   ├── components/         # Reusable UI primitives, auth guards, and layout elements
│   ├── context/            # React context providers (AuthContext, ToastContext)
│   ├── features/           # Feature-based pages and operational components
│   │   ├── admin/          # Platform operations console & management modals
│   │   ├── auth/           # Login, registration, and OAuth callback handling
│   │   ├── charities/      # Verified nonprofit directory & direct donation modal
│   │   ├── dashboard/      # Member workspace, scorecard management, & claims
│   │   ├── draws/          # Monthly draw results, prize breakdown, & tickets
│   │   ├── landing/        # Hero, platform pillars, & interactive impact calculator
│   │   └── subscription/   # Membership plans, charity selector, & checkout flow
│   ├── hooks/              # Custom React hooks (useAuth)
│   ├── lib/                # Supabase client, environment configuration, & Stripe helper
│   ├── services/           # Business logic & services (drawEngine, charityService, etc.)
│   ├── styles/             # Design tokens, CSS variables, and global animations
│   └── types/              # Unified TypeScript domain definitions
├── supabase/
│   └── migrations/         # PostgreSQL database schemas, triggers, and RLS policies
├── tests/                  # Automated Vitest test suites
├── .env.example            # Client-safe environment variable template
├── index.html              # Single-page application entry point
├── package.json            # Dependencies and npm scripts
└── vite.config.ts          # Vite build configuration
```

---

## Getting Started

### 1. Prerequisites

- **Node.js**: v18.0.0 or later (Node 20+ recommended)
- **npm**: v9.0.0 or later

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd GreenPulse
npm install
```

### 3. Environment Configuration

Copy the example environment file to `.env`:

```bash
cp .env.example .env
```

Configure the following variables in `.env`:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Your Supabase project URL | `https://xyzcompany.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Public anonymous Supabase key | `eyJhbGciOi...` |
| `VITE_STRIPE_PUBLIC_KEY` | Stripe publishable key (test/live) | `pk_test_...` |
| `VITE_APP_URL` | Application root URL | `http://localhost:5173` |

> [!IMPORTANT]
> Never expose private keys (such as `SUPABASE_SERVICE_ROLE_KEY` or `STRIPE_SECRET_KEY`) in client-side `.env` files. Private credentials belong strictly within serverless Edge Functions or secure backend environments.

### 4. Database Setup

Apply the baseline schema and RLS policies found in:
`supabase/migrations/20261021000000_phase2_baseline_schema.sql`

You can execute this SQL in the Supabase Dashboard SQL Editor or via the Supabase CLI:

```bash
npx supabase db push
```

For setting up administrator access, refer to [docs/INITIAL_ADMIN_SETUP.md](docs/INITIAL_ADMIN_SETUP.md).

---

## Development Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite local development server with HMR |
| `npm run build` | Compiles TypeScript and builds the production bundle |
| `npm run test` | Executes the automated Vitest test suite (11 test suites) |
| `npm run lint` | Runs the high-performance Oxlint code linter |
| `npm run preview` | Previews the locally built production bundle (`dist/`) |

---

## Operational Documentation

Detailed setup guides for engineering maintainers are maintained in the [`docs/`](docs/) directory:

- [System Architecture & Security Model](docs/ARCHITECTURE.md)
- [Google OAuth 2.0 Integration Guide](docs/GOOGLE_OAUTH_SETUP.md)
- [Initial Admin Bootstrapping Instructions](docs/INITIAL_ADMIN_SETUP.md)
- [Stripe Checkout & Billing Configuration](docs/STRIPE_SETUP.md)

---

## Deployment

The application is configured for deployment on modern edge hosting platforms such as Vercel:

1. Connect the repository to your Vercel project.
2. Ensure the framework preset is set to **Vite**.
3. Configure the environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_PUBLIC_KEY`, `VITE_APP_URL`) in the hosting dashboard.
4. Deploy using `npm run build`. The included `vercel.json` ensures client-side routing rewrites are properly handled.

---

## License

Proprietary © 2026 GreenPulse Platform Ltd. All rights reserved.
