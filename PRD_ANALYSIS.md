# GreenPulse — PRD Analysis & Requirement Traceability Matrix

**Project Name:** GreenPulse  
**Tagline:** Play with purpose. Create lasting impact.  
**Source Document:** Digital Heroes PRD (Level 1) — 2026 Edition  
**Author:** Senior Full-Stack Engineer, Product Designer, Database Architect & QA  
**Status:** Baseline Documentation & Traceability Analysis

---

## 1. Executive Summary & Core Mission
GreenPulse is a subscription-driven web platform combining golf performance tracking (Stableford format), monthly draw-based reward pools, and charitable fundraising. It is deliberately designed to feel modern, emotionally engaging, and mission-led—avoiding traditional golf club clichés (fairways, plaid, rustic crests) in favor of a warm, editorial, purpose-driven identity.

---

## 2. Requirement Traceability Matrix (RTM)

The following matrix maps every explicit requirement from the PRD (§ 01 through § 16) to its planned architectural feature, functional specification, and verification test case.

| PRD Section | Requirement Description | Planned Application Feature | Verification & Test Strategy |
| :--- | :--- | :--- | :--- |
| **§ 01.1 / § 02** | Monthly or yearly platform subscription | Stripe-integrated subscription billing with active/past_due/cancelled tracking | Automated test for checkout session creation; webhook verification for lifecycle transitions |
| **§ 01.1 / § 05** | Enter latest 5 golf scores in Stableford format (1–45) with date | Score management module: form input with validation (1 <= score <= 45), date picker, 5-score limit | Unit tests for score boundary validation; DB trigger / transaction testing for 5-score rolling replacement |
| **§ 05** | Only latest 5 scores retained; newest replaces oldest automatically | Score rolling engine (PostgreSQL trigger + UI queue): atomic FIFO replacement based on round date | Integration test inserting 6th score, verifying 1st score is archived/removed and exactly 5 remain |
| **§ 05** | One score entry per date; duplicate dates rejected (edit/delete only) | Unique constraint `UNIQUE(user_id, played_at)` with clear inline validation | Database constraint tests attempting duplicate insert on same date; UI error banner assertion |
| **§ 05** | Scores displayed in reverse chronological order (most recent first) | Query sorting `ORDER BY played_at DESC` in Supabase RPC / React state | UI test asserting DOM ordering corresponds to descending timestamps |
| **§ 01.1 / § 06** | Participate in monthly draw-based prize pools | Draw Engine with participation tracking based on active subscription & score snapshot | Automated draw runner verifying active subscriber inclusion and exclusion of lapsed users |
| **§ 06** | Draw types: 5-number, 4-number, and 3-number match | Match evaluation engine comparing drawn winning 5-number array with user score array | Unit tests for 5-match, 4-match, 3-match, and <3 match scoring permutations |
| **§ 06** | Draw logic: Random (lottery style) vs. Algorithmic (frequency-weighted) | Dual-mode draw generator configurable in Admin Panel with deterministic seed logging | Unit tests validating uniform distribution in Random mode and inverse/direct frequency weighting in Algorithmic mode |
| **§ 06 / § 07** | Admin controls publishing with pre-publish simulation | Admin Draw Control: "Run Simulation" previewing winners and payouts without persisting or publishing | E2E test executing simulation, asserting zero database state changes until explicit "Publish Draw" confirmation |
| **§ 07** | Prize pool: Fixed portion of subscription (40% 5-match, 35% 4-match, 25% 3-match) | Prize Pool Calculator dynamically deriving tier allocations from active subscriber revenue pool | Mathematical validation tests asserting sum of tier shares equals 100% of allocated prize pot |
| **§ 07** | Prizes split equally among multiple winners in the same tier | Winner payout distributor dividing tier pot evenly by verified winner count | Edge case tests: single winner gets 100% of tier, 3 winners get 33.33% each, 0 winners handling |
| **§ 06 / § 07** | 5-match jackpot carries forward if unclaimed (rollover); 4 & 3 match do not roll over | Rollover accumulator table carrying unallocated 5-match funds into `next_draw_jackpot_seed` | Test simulating 0 winners for 5-match: verifies next month pot increases by unspent 40% |
| **§ 01.1 / § 08** | Support a charity with a portion of subscription fee (min 10% at signup) | Onboarding / profile charity picker with slider defaulting to 10%, range 10%–100% | Validation tests enforcing `>= 10%` on submission; checkout metadata sync |
| **§ 08.1** | Users may voluntarily increase charity percentage | Profile / Settings slider to increase contribution; recalculates platform split | Unit test updating charity percentage; verifies new split stored and reflected in user dashboard |
| **§ 08.1** | Independent donation option, not tied to gameplay | Direct donation checkout flow bypassing subscription/draw entry | Stripe checkout test with standalone donation line item; charity ledger update |
| **§ 08.2** | Charity Directory: listing page with search and filter | Searchable/filterable charity grid by category, impact focus, and region | Frontend component tests for text search, tag filtering, and empty-state handling |
| **§ 08.2** | Charity Profiles: description, images, upcoming events (e.g. golf days) | Dynamic Charity Profile page (`/charities/:slug`) with rich media, events list, and direct donate | Route testing, media rendering, and upcoming event card rendering |
| **§ 08.2** | Homepage Spotlight: featured charity section | Curated homepage feature component querying charities flagged `is_featured = true` | Integration test ensuring featured charities render prominently on landing page |
| **§ 09** | Winner verification: applies to winners only | Gated winner verification portal visible only to users with pending winning claims | Authorization check: non-winners cannot access or submit verification documents |
| **§ 09** | Proof upload: screenshot of scores from golf platform | Supabase Storage bucket (`winner-proofs`) with restricted RLS; image upload UI | Upload test: PNG/JPEG upload with MIME validation, file size limit, and private URL generation |
| **§ 09** | Admin review: approve or reject submission | Admin Winner Review table with image preview, approval/rejection notes, and status transition | Workflow test: Admin approves -> status moves to `verified`; Admin rejects -> user alerted |
| **§ 09** | Payment states: Pending -> Paid | Payout lifecycle state machine (`unclaimed` -> `proof_submitted` -> `verified` -> `paid`) | State transition enforcement tests preventing payout before admin verification |
| **§ 10** | User Dashboard: Subscription status, renewal date | User overview header displaying real-time plan status, period end date, renewal badge | Mock subscription state tests (active, past_due, canceled) |
| **§ 10** | User Dashboard: Score entry and edit interface | Interactive score management widget displaying 5 latest scores, round dates, edit/delete actions | Form validation tests for editing existing rounds and deleting scores |
| **§ 10** | User Dashboard: Selected charity and contribution % | Visual charity card showing beneficiary name, logo, current contribution %, and lifetime impact | Render tests displaying correct user-charity association |
| **§ 10** | User Dashboard: Participation summary | Draws entered history, upcoming draw countdown, active ticket representation | Test checking past entries count and countdown timer to next draw |
| **§ 10** | User Dashboard: Winnings overview | Lifetime winnings counter, breakdown by tier, pending claim alert, payout statuses | Test asserting aggregated amounts match user win records |
| **§ 11** | Admin: User management (view/edit profiles, edit scores, manage subscriptions) | Searchable user table, user modal to edit profile details, override scores, and manage sub status | Admin RBAC check ensuring regular users receive 403; test updating user records |
| **§ 11** | Admin: Draw management (configure logic, run simulations, publish results) | Admin draw control console with logic toggle (random vs algorithmic), simulation preview, publish button | Verification that simulation does not notify users; publish triggers winner generation |
| **§ 11** | Admin: Charity management (add, edit, delete charities; content & media) | CRUD table for charities, image upload, event creation, toggle featured status | Full CRUD integration test on charity entities |
| **§ 11** | Admin: Winners management (full list, verify submissions, mark payouts) | Verification queue with screenshot modal, approve/reject triggers, payout completion toggle | Test marking payout as completed updates prize record and user balance |
| **§ 11** | Admin: Reports & analytics (total users, total prize pool, charity totals, draw stats) | Recharts analytics dashboard displaying active users, accumulated pots, charity funds, draw history | Test data calculation accuracy comparing raw database sums to displayed chart aggregates |
| **§ 12** | UI/UX: Emotional, modern, avoiding traditional golf cliches | Editorial typography, warm cream background (`#FBF9F4`), deep forest green (`#123524`), muted lime (`#8EA633`) | Visual regression and accessibility audit (contrast ratios WCAG AA compliant) |
| **§ 12** | UI/UX: Subtle transitions and micro-interactions | Framer Motion restrained animations (fade-in, subtle stagger, card hover lifts) | Performance profiling maintaining 60 FPS without layout shift |
| **§ 12** | UI/UX: Clear homepage communicating gameplay, winning, charity impact & CTA | Engaging storytelling landing page: How it works, Impact calculator, Draw mechanics, CTAs | Lighthouse SEO and accessibility audit |
| **§ 15** | Mandatory deliverables: Deployed live website, functional user & admin panels | Production deployment on Vercel, Supabase backend, seeded test accounts | Automated pre-flight deployment check |

---

## 3. Coverage Analysis
Every single one of the 16 sections in the PRD is mapped without omission. All user roles (Public Visitor, Registered Subscriber, Administrator) have dedicated views, permissions, and testable paths.
