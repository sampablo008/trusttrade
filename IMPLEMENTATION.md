# Crypto Trading Platform — Master Specification

> **Single source of truth.** Consolidates all modules. Everything a new engineer needs to ship this.
>
> **Stack:** Next.js 16.2 · TypeScript 5.5 · Supabase · Zustand · Tailwind · lightweight-charts
> **Voice:** Short words, full meaning. Smart caveman.
> **Status:** Engineering blueprint, production-ready.

---

## Table of Contents

1. [What This Project Is (Plain English)](#1-what-this-project-is)
2. [How the Business Works (The Money Loop)](#2-how-the-business-works)
3. [Every Feature — What Users Do](#3-what-users-do)
4. [Every Feature — What Admins Do](#4-what-admins-do)
5. [Full System Architecture](#5-full-system-architecture)
6. [Database Tables — Quick Reference](#6-database-tables)
7. [Storage Buckets](#7-storage-buckets)
8. [API Catalog](#8-api-catalog)
9. [Every Flow, Step by Step](#9-every-flow-step-by-step)
10. [Security Model](#10-security-model)
11. [Progress Tracker — Every Sprint, Every Task](#11-progress-tracker)
12. [Module Index](#12-module-index)
13. [Appendix — Key Commands & Env Vars](#13-appendix)

---

## 1. What This Project Is

### The one-paragraph version

A crypto trading website that **looks like a real exchange** — live candle charts, long/short buttons, countdown timers, portfolio page, 5-level referral pyramid, and real deposits/withdrawals via Trust-Wallet-style QR codes. Under the hood, an **admin picks the outcome of every trade**. No real market matching. Users see a polished, trusted experience. Admin sees a control panel with god mode.

### Who it's for

- **Users** — people who want to "trade crypto" in a simple binary way. Pick up or down. Pick how long. Pick how much. No leverage, no order book, no spread.
- **Admins** — the operators. You. Full control of every outcome, deposit, withdrawal, referral payout, chart price, and promotional content.

### Why it looks real, not fake

- Chart tracks real BTC/ETH via Binance public feed, with hidden scale+offset so screenshots can't be compared.
- TradingView-grade chart library, Trust-Wallet dark theme, live ticker strip, order book illusion, 60 fps price label.
- Real crypto deposits via QR code. Real withdrawals with tx hash shown.
- 5-level referral tree with growing earnings counter.

### What stays hidden

- Admin decides every trade outcome.
- Chart price is scaled off the real market.
- "Order book" is a client-side illusion.
- Commissions are admin-approved before they credit.
- Bonus money is locked under a 3× wager requirement before it can leave.

### Core invariants (never violated)

1. **Browser never talks to Supabase.** All traffic flows through Next.js API.
2. **Money stored as integer cents.** Never float. Bigint everywhere.
3. **Writes only via security-definer DB functions.** Zod-validated. RLS-protected. Audited.
4. **Admin outcome > market outcome.** Every trade has an admin decision or an auto-default at expiry.
5. **Non-deposit credit is locked.** Commissions, signup bonus, gifts must be wagered 3× before withdrawal.

---

## 2. How the Business Works

### The money loop

```mermaid
flowchart LR
    D[User deposits<br/>real crypto] --> A1{Admin<br/>reviews}
    A1 -->|Approve| B[Balance +<br/>Commission chain fires]
    A1 -->|Reject| X1[No balance change]
    B --> T[User trades<br/>long/short]
    T --> A2{Admin picks<br/>outcome}
    A2 -->|Win 35%| W[User balance<br/>+ 85% of stake]
    A2 -->|Lose 65%| L[House keeps<br/>full stake]
    A2 -->|Skip| E[Auto-lose<br/>on expiry]
    W --> T
    L --> T
    E --> T
    W --> R[User requests<br/>withdrawal]
    R --> A3{Admin<br/>approves}
    A3 -->|Yes| P[Admin pays<br/>externally]
    A3 -->|No| X2[Refund balance]
    P --> OUT[Crypto sent<br/>+ tx hash logged]

    style A1 fill:#3375ff,color:#fff
    style A2 fill:#3375ff,color:#fff
    style A3 fill:#3375ff,color:#fff
    style L fill:#f6465d,color:#fff
    style E fill:#f6465d,color:#fff
    style W fill:#0ecb81,color:#fff
    style P fill:#0ecb81,color:#fff
```

### Where the house earns

| Mechanism               | How it works                                                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Trade edge**          | Admin tunes user win rate to ~35%. Payout 1.85× on win. House keeps ~35¢ per $1 wagered long-run.                    |
| **Bonus wagering**      | Commissions & bonuses need 3× wager before withdrawal. Most users bust before unlock. Reclaim ≈ $1.25 per $25 bonus. |
| **Auto-lose on expiry** | If admin misses a decision, default policy = lose. Safety net.                                                       |
| **Referral volume**     | Pyramid drags more depositors in. More deposits = more trade volume = more edge compounding.                         |
| **Withdrawal minimum**  | $50 floor keeps small balances trapped in play.                                                                      |

### Where the user feels they're winning

- Wins 35% of trades — enough dopamine.
- Referral tree grows visibly. Commission counter ticks up in real time.
- Real deposit → real balance (until withdrawal-wager reality hits).
- UI quality creates trust.

### Key numbers (admin-configurable)

| Setting                            | Default             | Location                              |
| ---------------------------------- | ------------------- | ------------------------------------- |
| Bonus wager multiplier             | 3×                  | `app_config.bonus_wager_multiplier`   |
| Min deposit for commission trigger | $10                 | `app_config.ref_min_deposit_cents`    |
| Min withdrawal                     | $50                 | `app_config.withdraw_min_cents`       |
| Withdrawal fee                     | $0                  | `app_config.withdraw_fee_cents`       |
| Expiry policy                      | `auto_lose`         | `app_config.expiry_policy`            |
| Default L1 commission              | 5%                  | `app_config.ref_default_l1_bps = 500` |
| L2 / L3 / L4 / L5                  | 3% / 2% / 1% / 0.5% | same table                            |
| Rate limit                         | 5 trades / 10s      | `app_config.rate_limit_per_10s`       |
| Bonus ticket expiry                | 90 days             | `app_config.bonus_ticket_ttl_days`    |

---

## 3. What Users Do

Every feature a signed-in user can touch. Plain English. Zero jargon.

### 3.1 Sign up (invitation-only)

**No public signup.** User must have a code. Two flavors:

- **Friend's code** like `REF_JOHN123` — reusable, puts them into that friend's downline (5-level pyramid).
- **Admin code** like `K7X9M2PQ4R` — single-use, creates a root user (no upline, no one earns from them).

User types code → live validation → form reveals → picks username + email + password → done. Signup bonus (small, configurable) credited as a locked bonus ticket.

### 3.2 Deposit real crypto

1. Pick token + network (USDT-TRC20, USDT-ERC20, USDT-BEP20, BTC).
2. See QR code + wallet address. Send from Trust Wallet / Binance / wherever.
3. Upload screenshot (required). Type amount. Paste tx hash (optional).
4. Submit. Admin reviews. Balance updates on approval.
5. First deposit ≥ $10 triggers referral commissions up the chain.

### 3.3 Trade long or short

1. Land on `/trade/BTC`. Live chart front and center (1s / 15s / 1m / 5m / 15m / 1h / 4h / 1d tabs).
2. Pick **LONG** (thinks price goes up) or **SHORT** (price goes down).
3. Pick duration: 30s / 60s / 5m / 15m / 1h / 1d.
4. Enter amount. See payout preview: "+85%, potential $92.50".
5. Tap **Place Trade**. Countdown starts. Entry price line appears on chart.
6. Timer hits 0 → win or lose toast + balance animates.

### 3.4 Build a referral team

- `/referrals` page: own code, share links (copy / QR / WhatsApp / Telegram / X), 5-level tree view, pending / approved / lifetime earnings.
- Recruit friends. They deposit ≥ $10 → commissions fire up the chain.
- Commissions admin-approved, then land as **locked bonus tickets** (must wager 3× before withdraw).

### 3.5 Request withdrawal

1. `/wallet/withdraw`. See withdrawable balance (total − locked in trades − locked bonus).
2. Enter amount (min $50). Pick token + network. Paste destination address.
3. Submit. Balance debited immediately (held).
4. Admin reviews → approves → pays externally → marks paid.
5. See tx hash in history. Can cancel while still pending.

### 3.6 Manage profile + history

- Upload avatar.
- Change display name (cannot change username — it's the referral code root).
- Portfolio page: active trades with countdowns, settled history with filters + CSV export.
- Wallet page: deposits, withdrawals, full transaction ledger.
- Bonus tickets view: each locked bonus + wager progress bar.

---

## 4. What Admins Do

The `/admin` panel. Full god mode. Every click audited.

### 4.1 Settle trades (the money maker)

- Live decision queue sorted by urgency (ending soonest at top).
- Three buttons per row: **Win** · **Lose** · **Void**.
- Keyboard: `W` / `L` / `V`. Bulk select + bulk settle.
- Filters: user, token, direction, amount range, time remaining.
- Row auto-removes when settled.

### 4.2 Control the chart

- Per token: freeze / nudge drift / hard-set price / swap source (synthetic / shadow Binance / replay CSV).
- Scale + offset hide the real market value.
- CSV replay: import historical BTC, play at 1× / 5× / 10× speed, loop or end-freeze.
- Pull historical candles from Binance REST into replay bank with one click.

### 4.3 Approve deposits

- `/admin/deposits` queue (pending first).
- View user's screenshot (full-size lightbox).
- Check tx hash and amount.
- Approve → credits balance → fires referral chain.
- Reject with reason (unclear screenshot, wrong network, tx not found, etc.).

### 4.4 Approve + pay withdrawals

Two-phase workflow:

- **Phase 1** — Review request, approve or reject.
- **Phase 2** — Admin opens Trust Wallet externally, sends crypto to user's address, copies tx hash, pastes into **Mark as Paid**.
- Safety: must re-type last 8 chars of destination before marking paid.
- Exploit flags auto-painted: `NEW_USER`, `LOW_TRADE_VOLUME`, `ADDRESS_REUSE`, `RAPID`, etc.

### 4.5 Mint invitation codes

- Mint 1–1000 codes in one batch.
- Optional expiry date. Optional note.
- Download CSV with pre-built signup links.
- Revoke any code anytime.

### 4.6 Manage referrals

- Pending commission queue (approve / reject / clawback / bulk approve).
- Per-user rate overrides (5 bps values for 5 levels, fallback to app_config defaults).
- Fraud flag queue (same IP, rapid chain, velocity — advisory only, never auto-block).
- View any user's full upline + downline (for disputes).

### 4.7 Manage tokens / periods / wallets

- Tokens: symbol, name, icon upload, base price, volatility, shadow symbol, scale, offset, enabled.
- Periods: duration, min/max amount, payout rate, enabled.
- Wallets: address, network, memo, min deposit. **Edit requires re-typing last 8 chars.**

### 4.8 Manage users

- Search by email / username / ID.
- Full history: trades, deposits, withdrawals, referrals, flags.
- Freeze / unfreeze account.
- Adjust balance (credit or debit, with required note).
- Impersonate read-only (for support).

### 4.9 Landing page CMS

- `/admin/promo`: edit hero, trust badges, feature cards.
- Image upload + text fields.
- Toggle slots on/off. Reorder.
- No redeploy needed.

### 4.10 Audit log

- Every admin action logged: who, when, what, before/after JSON, IP, user agent.
- Filter by admin, action type, target type, date range.

### 4.11 Global controls

- **Trade freeze** — kills all `placeTrade` calls globally.
- **Bonus wager multiplier** — change the 3× globally (affects new tickets only).
- **Expiry policy** — `auto_lose` / `auto_win` / `void` / `leave_pending`.

---

## 5. Full System Architecture

### 5.1 Topology (no direct client↔Supabase)

```mermaid
flowchart TB
    subgraph Client[Browser / Mobile PWA]
        UI[Next.js 16.2 RSC + Client Components]
        Z[Zustand + TanStack Query]
        LC[lightweight-charts]
        ES[EventSource]
        API[lib/api/client.ts]
    end

    subgraph Vercel[Vercel: Node + Edge Runtime]
        MW[middleware.ts<br/>auth + rate limit]
        SA[Server Actions<br/>some writes]
        RH[Route Handlers<br/>/api/*]
        SSE[SSE Proxies<br/>/api/stream/*]
        UP[Upload Proxies<br/>/api/upload/*]
        MP[Media Proxy<br/>/api/media/*]
    end

    subgraph Supabase[Supabase]
        PG[(Postgres + RLS<br/>20+ tables)]
        AU[Auth]
        RT[Realtime]
        ST[Storage<br/>5 buckets]
        EF1[Edge Fn:<br/>shadow_fetch]
        EF2[Edge Fn:<br/>tick_candles]
        EF3[Edge Fn:<br/>settle_expired]
        EF4[Edge Fn:<br/>aggregate_candles]
        EF5[Edge Fn:<br/>expire_bonus]
    end

    subgraph External[External]
        BN[Binance<br/>public WS + REST]
        UP_R[Upstash Redis<br/>rate limit]
        SE[Sentry]
    end

    UI -.fetch / Server Action.-> MW
    UI -.img src=/api/media/....-> MW
    ES -.EventSource.-> MW
    MW --> SA & RH & SSE & UP & MP
    SA --> PG
    RH --> PG & ST
    SSE -.subscribe.-> RT
    RT <--postgres_changes--> PG
    UP --> ST
    MP --> ST
    EF1 -.ws.-> BN
    EF1 & EF2 & EF3 & EF4 & EF5 --> PG
    SA -.errors.-> SE
    MW --> UP_R

    style Supabase fill:#3ecf8e15
    style Client fill:#3375ff15
    style External fill:#f3ba2f15
```

**Zero arrows from Client directly to Supabase or Binance.** All traffic through Vercel.

### 5.2 Tech stack (locked)

| Layer                                     | Choice                                                    | Version  |
| ----------------------------------------- | --------------------------------------------------------- | -------- |
| Framework                                 | Next.js (App Router, RSC, Server Actions, React Compiler) | **16.2** |
| React                                     | React (via Next)                                          | **19.2** |
| Language                                  | TypeScript `strict`                                       | 5.5+     |
| Node runtime                              | Node LTS                                                  | 22       |
| DB + Auth + Realtime + Storage + Edge Fns | Supabase                                                  | latest   |
| Client state                              | Zustand                                                   | 4        |
| Server state                              | TanStack Query                                            | 5        |
| Styling                                   | Tailwind CSS                                              | 3.4+     |
| UI primitives                             | shadcn/ui (Radix)                                         | latest   |
| Charts                                    | `lightweight-charts` (TradingView)                        | 4        |
| Forms                                     | react-hook-form + zod                                     | latest   |
| Animation                                 | framer-motion                                             | 11       |
| Icons                                     | lucide-react                                              | latest   |
| Rate limit                                | @upstash/ratelimit + Upstash Redis                        | latest   |
| Errors                                    | Sentry                                                    | latest   |
| Testing                                   | Vitest + Playwright + pgTAP                               | latest   |
| CI/CD                                     | GitHub Actions → Vercel                                   | —        |

### 5.3 Next.js 16.2 specifics used

- **React Compiler** enabled (`reactCompiler: true`) → auto-memoization → no manual `React.memo` / `useMemo` spam.
- **View Transitions API** for route changes between tokens (`/trade/BTC` → `/trade/ETH` slides smoothly).
- **`useEffectEvent`** for the tick interpolator — cleaner than refs.
- **Turbopack** for dev + build (stable).
- **Node.js middleware** (stable) for auth + rate limit.
- **Typed routes** — compiler validates every `<Link>`.
- **`cookies()` async** (has been since 15) — all server client constructors are `async`.

### 5.4 Trust boundaries

| Layer                                   | Trust         | Role                                                                             |
| --------------------------------------- | ------------- | -------------------------------------------------------------------------------- |
| Browser                                 | None          | Render + input. Zero DB access.                                                  |
| Next.js middleware                      | Partial       | Auth cookie validation, rate limit, role guard.                                  |
| Next.js Server Actions + Route Handlers | Trusted       | Run as user JWT (RLS-bound) or service role (admin-only).                        |
| Supabase DB                             | Trusted store | RLS is final line of defence. Money moves only via `security definer` functions. |
| Supabase Edge Fns                       | Trusted       | Service role, idempotent, cron-driven.                                           |

---

## 6. Database Tables

### Core (11)

| Table                                            | Purpose                                                               |
| ------------------------------------------------ | --------------------------------------------------------------------- |
| `profiles`                                       | One row per user. Role, username, avatar, is_frozen.                  |
| `user_balances`                                  | balance_cents + locked_in_trades + locked_bonus per user.             |
| `transactions`                                   | Immutable money ledger. Every debit/credit.                           |
| `tokens`                                         | Tradable crypto. Symbol, icon, base price, feed source, scale/offset. |
| `trade_periods`                                  | Duration options. Min/max amount, payout rate.                        |
| `user_trades`                                    | Every trade placed. Entry, direction, duration, status, outcome.      |
| `candles_1s`                                     | 1-second OHLC (partitioned monthly).                                  |
| `candles_1m`, `_5m`, `_15m`, `_1h`, `_4h`, `_1d` | Pre-aggregated higher TFs.                                            |
| `app_config`                                     | Singleton global settings.                                            |
| `admin_actions`                                  | Immutable audit log.                                                  |

### Invitations + Referrals (6)

| Table                  | Purpose                                                |
| ---------------------- | ------------------------------------------------------ |
| `invitation_codes`     | Unified code registry — user codes + admin-minted.     |
| `referrals`            | Edge between referee and referrer.                     |
| `referral_upline`      | Denormalized 5-level ancestor cache per user.          |
| `referral_rates`       | Per-user rate overrides (5 bps values).                |
| `referral_commissions` | Commission events. Pending → approved → (clawed_back). |
| `referral_flags`       | Auto-raised fraud advisories.                          |

### Money in/out (4)

| Table              | Purpose                                               |
| ------------------ | ----------------------------------------------------- |
| `wallet_addresses` | Admin-configured deposit addresses per token/network. |
| `deposits`         | User-submitted claims with screenshot paths.          |
| `withdrawals`      | Requests. Pending → approved → paid.                  |
| `bonus_tickets`    | Locked bonus balance with wager-progress tracking.    |

### Chart engine (2)

| Table                | Purpose                               |
| -------------------- | ------------------------------------- |
| `candle_replay_bank` | Historical OHLC for admin CSV replay. |
| `token_replay_state` | Cursor + speed per replaying token.   |

### CMS (1)

| Table         | Purpose                      |
| ------------- | ---------------------------- |
| `promo_slots` | Landing page content blocks. |

**Total: 24 tables + 6 candle TF tables = 30.**

---

## 7. Storage Buckets

| Bucket                | Visibility | Max size | Stores                                     |
| --------------------- | ---------- | -------- | ------------------------------------------ |
| `token-icons`         | public     | 512 KB   | Crypto logos (admin upload)                |
| `avatars`             | public     | 2 MB     | User profile pics (user upload own folder) |
| `promo-assets`        | public     | 5 MB     | Landing page hero + trust badges (admin)   |
| `deposit-proofs`      | private    | 5 MB     | User deposit screenshots                   |
| `withdrawal-receipts` | private    | 5 MB     | Admin tx screenshots on payout             |

**Access pattern:** all served via `/api/media/{bucket}/{path}` proxy. No direct Supabase URLs in client.

---

## 8. API Catalog

All browser-server communication. ~55 endpoints. REST-ish.

### Public (no auth)

```
POST  /api/auth/signup         Gated signup
POST  /api/auth/login          Email + password
POST  /api/auth/logout
POST  /api/auth/otp            Request magic link
GET   /api/invites/validate    ?code=REF_X
GET   /api/tokens              List enabled
GET   /api/periods             List enabled
GET   /api/candles             ?symbol=&tf=&limit=
GET   /api/promo/slots         Landing content
GET   /api/media/:bucket/:path Media proxy
```

### User (auth required)

```
GET    /api/me                        Profile + balance
PATCH  /api/me                        Update avatar/name
GET    /api/me/balance                Fresh balance breakdown
GET    /api/me/transactions           Paginated ledger
GET    /api/me/bonus-tickets          Open tickets + progress

GET    /api/trades?status=            Active / settled
POST   /api/trades                    Place a trade
POST   /api/trades/:id/cancel         Within 2s grace

GET    /api/wallets                   Deposit addresses
POST   /api/deposits                  Submit claim
GET    /api/deposits                  Own deposits
POST   /api/upload/deposit-proof      Multipart

POST   /api/withdrawals               Request withdrawal
GET    /api/withdrawals               Own withdrawals
DELETE /api/withdrawals/:id           Cancel (pending only)

GET    /api/referrals/stats           Tree counts + earnings
GET    /api/referrals/tree?level=     Downline at level
GET    /api/referrals/commissions     Own commission history

POST   /api/upload/avatar             Multipart

GET    /api/stream/user               SSE — trades/balance/bonus/deposits/withdrawals/commissions
GET    /api/stream/candles            SSE — ?symbol=&tf=
GET    /api/stream/ticker             SSE — all token prices
```

### Admin (auth + role=admin)

```
GET  /api/admin/trades?status=active
POST /api/admin/trades/:id/settle
POST /api/admin/trades/bulk-settle

GET  /api/admin/deposits?status=pending
POST /api/admin/deposits/:id/approve
POST /api/admin/deposits/:id/reject

GET  /api/admin/withdrawals?phase=1|2
POST /api/admin/withdrawals/:id/approve
POST /api/admin/withdrawals/:id/mark-paid
POST /api/admin/withdrawals/:id/reject

GET  /api/admin/commissions?status=pending
POST /api/admin/commissions/:id/approve
POST /api/admin/commissions/:id/reject
POST /api/admin/commissions/bulk-approve

GET  /api/admin/codes?source=&status=
POST /api/admin/codes/mint
POST /api/admin/codes/:code/revoke

GET  /api/admin/users?search=
GET  /api/admin/users/:id
POST /api/admin/users/:id/freeze
POST /api/admin/users/:id/adjust-balance
POST /api/admin/users/:id/set-rates

GET  /api/admin/flags?resolved=false
POST /api/admin/flags/:id/resolve

GET /POST /PATCH /DELETE  /api/admin/tokens[/:id]
GET /POST /PATCH /DELETE  /api/admin/periods[/:id]
GET /POST /PATCH /DELETE  /api/admin/wallets[/:id]
GET /POST /PATCH          /api/admin/promo[/:slug]

PATCH /api/admin/candles/controller/:tokenId
POST  /api/admin/candles/:tokenId/hard-set
POST  /api/admin/candles/:tokenId/replay/upload

GET  /api/admin/audit
GET  /api/admin/stream                SSE — all active trades, pending deposits, new flags

POST /api/admin/upload/token-icon     Multipart
POST /api/admin/upload/promo-asset    Multipart
```

---

## 9. Every Flow, Step by Step

Each flow: **plain English → sequence diagram → DB writes → failure modes.**

---

### 9.1 Signup with invitation code

**Plain English.** User visits `/signup?ref=REF_ALICE`. Types the code (prefilled from URL). System checks it live — green tick if valid. Form reveals. User enters username + email + password, submits. System creates account, mints starting balance as a locked signup bonus, binds referral chain if it was a user code (or leaves upline empty if admin code). User lands on `/trade`.

```mermaid
sequenceDiagram
    actor V as Visitor
    participant FE as /signup Page
    participant API as /api/invites/validate
    participant SU as /api/auth/signup
    participant AU as Supabase Auth Admin
    participant DB as Postgres
    participant T as Triggers + RPCs

    V->>FE: Open /signup?ref=REF_ALICE
    FE->>API: GET /api/invites/validate?code=REF_ALICE
    API->>DB: rpc validate_invite(code)
    DB-->>API: {valid:true, source:'user'}
    API-->>FE: ✓ Valid
    FE->>V: Reveal form

    V->>FE: Submit {code, email, password, username}
    FE->>SU: POST /api/auth/signup
    SU->>SU: Zod validate + rate limit by IP
    SU->>API: Re-validate code server-side
    SU->>AU: auth.admin.createUser({email, password})
    AU->>T: INSERT auth.users
    T->>DB: handle_new_user trigger<br/>→ INSERT profiles<br/>→ INSERT user_balances<br/>→ credit_bonus(signup) → INSERT bonus_tickets<br/>→ sync_user_invite_code → INSERT invitation_codes
    AU-->>SU: {user_id}
    SU->>DB: UPDATE profiles SET username
    alt Username taken
        DB-->>SU: error
        SU->>AU: auth.admin.deleteUser(user_id)  [rollback]
        SU-->>FE: 409 USERNAME_TAKEN
    end
    SU->>DB: rpc consume_invite(user_id, code, ip, ua)
    DB->>DB: SELECT FOR UPDATE code row<br/>Mark used/used-by<br/>IF source=user:<br/>&nbsp;&nbsp;bind_referral → INSERT referrals<br/>&nbsp;&nbsp;Walk chain → INSERT referral_upline (×5)<br/>&nbsp;&nbsp;check_referral_fraud (advisory)
    DB-->>SU: OK
    SU-->>FE: {ok, userId}
    FE->>V: Redirect /trade
```

**DB writes:** `auth.users`, `profiles`, `user_balances`, `bonus_tickets`, `invitation_codes` (mirror), `referrals`, `referral_upline`, maybe `referral_flags`.

**Failure modes.** Invalid code → form stays locked. Username taken → auth user rolled back. Two users on same single-use code → first wins via `FOR UPDATE`, second rolled back with `CODE_INACTIVE`.

---

### 9.2 Login

**Plain English.** User types email + password on `/login`. API sets SSR cookies. Redirected to `/trade`.

```mermaid
sequenceDiagram
    actor U as User
    participant FE as /login Page
    participant LG as /api/auth/login
    participant AU as Supabase Auth
    participant DB as Postgres

    U->>FE: email + password
    FE->>LG: POST /api/auth/login
    LG->>LG: Rate limit by IP (5 per 5 min)
    LG->>AU: signInWithPassword
    AU->>DB: Validate credentials
    alt is_frozen = true
        LG->>DB: Check profiles.is_frozen
        LG-->>FE: 403 ACCOUNT_FROZEN
    end
    AU-->>LG: session JWT
    LG->>LG: Set httpOnly cookies
    LG-->>FE: {ok}
    FE->>U: Redirect /trade
```

**DB writes:** none (session is in cookies + Supabase Auth internal tables).

**Failure modes.** Wrong password → `INVALID_CREDENTIALS`. Frozen account → `ACCOUNT_FROZEN`. Too many attempts → `RATE_LIMITED`.

---

### 9.3 Deposit — user submits, admin approves

**Plain English.** User picks token + network, sees QR + address. Sends crypto from their own wallet (off-platform). Uploads screenshot. Submits form. Admin sees it in the queue, reviews screenshot, clicks Approve. Balance credits. Referral commissions fire up the chain (first qualifying deposit only).

```mermaid
sequenceDiagram
    actor U as User
    participant FE as /wallet/deposit
    participant UP as /api/upload/deposit-proof
    participant ST as Supabase Storage
    participant DP as /api/deposits
    participant DB as Postgres
    participant RT as Realtime
    participant ASSE as /api/stream/admin
    actor A as Admin
    participant AQ as /admin/deposits
    participant MP as /api/media
    participant AP as /api/admin/deposits/:id/approve
    participant RD as record_deposit RPC

    rect rgba(200,200,200,0.1)
        Note over U: OFF-PLATFORM<br/>User sends crypto to wallet address
    end

    U->>FE: Pick token/network, scan QR
    U->>FE: Upload screenshot + amount + tx hash
    FE->>FE: Compress to WebP + strip EXIF
    FE->>UP: POST multipart
    UP->>UP: Validate mime + size + auth
    UP->>ST: Store deposit-proofs/{uid}/{depid}.webp
    ST-->>UP: path
    UP-->>FE: {path}
    FE->>DP: POST /api/deposits {wallet_id, amount, tx_hash, proof_path}
    DP->>DB: rpc submit_deposit<br/>INSERT deposits (pending)<br/>Check duplicate tx_hash
    DB->>RT: CHANGE deposits
    RT-->>ASSE: New pending row
    ASSE-->>AQ: Live-prepend to queue
    DP-->>FE: {deposit}
    FE->>U: "Pending review"

    Note over A: Later...
    A->>AQ: Open queue
    AQ->>MP: GET /api/media/deposit-proofs/.../dep.webp
    MP->>ST: Admin-authed download
    ST-->>MP: bytes
    MP-->>AQ: image
    AQ->>A: Show screenshot + tx info

    A->>AQ: Click Approve
    AQ->>AP: POST /api/admin/deposits/:id/approve
    AP->>DB: assertAdmin check
    AP->>DB: rpc approve_deposit
    DB->>DB: UPDATE user_balances (+amount)<br/>INSERT transactions (kind=deposit)<br/>UPDATE deposits (status=approved)<br/>INSERT admin_actions
    DB->>RD: record_deposit(user, amount, tx_id)
    RD->>RD: IF is_qualified=false AND amount ≥ $10
    RD->>DB: UPDATE referrals (is_qualified=true)
    loop 5 levels of upline
        RD->>RD: rate = referral_rates[level] or default
        RD->>DB: INSERT referral_commissions (pending)
    end
    DB->>RT: CHANGE deposits, user_balances, referral_commissions
    RT-->>U: SSE: balance update + toast "Deposit approved"
    RT-->>A: SSE: 5 new pending commissions in queue
```

**DB writes:** `deposits`, `user_balances`, `transactions`, `admin_actions`, `referrals` (qualification), `referral_commissions` (×5 when qualifying).

**Storage writes:** `deposit-proofs/{user_id}/{deposit_id}.webp`.

**Failure modes.** Duplicate tx hash (same user) → rejected at submit. Missing proof → `PROOF_REQUIRED`. Wrong network (user-side error) → admin rejects with reason, funds lost off-platform (disclaimer shown prominently at deposit UI).

---

### 9.4 Place a trade

**Plain English.** User picks direction + duration + amount. Taps Place Trade. Server locks their balance, debits the stake, creates an active trade with entry-price snapshot. Countdown starts. Chart shows entry-line overlay. Any open bonus tickets get wager progress applied from this stake.

```mermaid
sequenceDiagram
    actor U as User
    participant FE as /trade/[symbol]
    participant CH as TradingChart
    participant Z as Zustand
    participant TR as /api/trades
    participant RL as Upstash
    participant DB as Postgres
    participant PT as place_trade RPC
    participant AW as apply_wager_progress RPC
    participant RT as Realtime
    participant SSE as /api/stream/user

    U->>FE: Select token, period, amount, direction
    FE->>FE: Client Zod validate
    FE->>TR: POST /api/trades
    TR->>TR: auth.getUser
    TR->>RL: Rate limit place:${uid} (5/10s)
    RL-->>TR: OK
    TR->>DB: rpc place_trade

    PT->>PT: Read app_config — trading frozen?
    PT->>PT: Read tokens — enabled?
    PT->>PT: Read trade_periods — valid? amount in range?
    PT->>DB: Read latest candles_1s → entry_price
    PT->>DB: SELECT user_balances FOR UPDATE
    PT->>PT: Check balance ≥ stake
    PT->>DB: UPDATE user_balances<br/>balance_cents -= stake<br/>locked_in_trades_cents += stake
    PT->>DB: INSERT user_trades (status=active, end_time)
    PT->>DB: INSERT transactions (trade_debit)
    PT->>AW: apply_wager_progress(user, stake)
    AW->>DB: SELECT open bonus_tickets ORDER BY created_at FOR UPDATE
    loop Each open ticket (FIFO)
        AW->>AW: apply = min(remaining, required-progress)
        AW->>DB: UPDATE bonus_tickets (progress += apply)
        alt progress >= required
            AW->>DB: UPDATE status=released
            AW->>DB: UPDATE user_balances (locked_bonus -= amount)
        end
    end
    PT-->>TR: trade row
    TR-->>FE: {trade}
    DB->>RT: CHANGE user_trades, user_balances, bonus_tickets
    RT-->>SSE: Events pushed
    SSE-->>Z: upsertActiveTrade + setBalance
    Z-->>FE: Rerender
    Z-->>CH: Draw entry-price overlay line + expiry marker
    FE->>U: Show countdown timer
```

**DB writes:** `user_balances`, `user_trades`, `transactions`, `bonus_tickets`.

**Failure modes.** `INSUFFICIENT_FUNDS`, `AMOUNT_OUT_OF_RANGE`, `TOKEN_UNAVAILABLE`, `PERIOD_UNAVAILABLE`, `TRADING_FROZEN`, `RATE_LIMITED`.

---

### 9.5 Settle a trade (admin decision)

**Plain English.** Admin sees active trade in queue with countdown. Clicks Win / Lose / Void (or presses W / L / V). Balance updates. User gets a settlement toast within 500 ms.

```mermaid
sequenceDiagram
    actor A as Admin
    participant AQ as /admin/trades
    participant ST as /api/admin/trades/:id/settle
    participant AD as assertAdmin
    participant DB as Postgres
    participant ST_RPC as settle_trade RPC
    participant RT as Realtime
    participant SSE as /api/stream/user
    actor U as User

    A->>AQ: Click Win on row with 10s left
    AQ->>ST: POST {outcome: 'win'}
    ST->>AD: Verify role=admin
    AD-->>ST: OK
    ST->>DB: rpc settle_trade (service role)

    ST_RPC->>DB: SELECT user_trades FOR UPDATE
    ST_RPC->>ST_RPC: Assert status=active
    ST_RPC->>DB: Read latest candles_1s close → strike_price
    ST_RPC->>ST_RPC: credit = stake × payout_rate (win)<br/>or 0 (lose) or stake (void)
    ST_RPC->>DB: UPDATE user_balances<br/>balance_cents += credit<br/>locked_in_trades_cents -= stake
    ST_RPC->>DB: UPDATE user_trades<br/>status=settled, outcome, strike, settled_by, settled_reason='admin'
    alt win or void
        ST_RPC->>DB: INSERT transactions
    end
    ST_RPC->>DB: INSERT admin_actions
    ST_RPC-->>ST: updated trade
    ST-->>AQ: 200 OK
    DB->>RT: CHANGE user_trades, user_balances
    RT-->>SSE: Push 'trade' + 'balance' events
    SSE-->>U: Toast: "Won $X!" + balance flash + remove from active list
    RT-->>AQ: Remove from admin queue
```

**DB writes:** `user_trades`, `user_balances`, `transactions` (if win/void), `admin_actions`.

**Failure modes.** `TRADE_NOT_ACTIVE` (already settled — race prevention). `TRADE_NOT_FOUND`. `FORBIDDEN` (non-admin).

---

### 9.6 Auto-expiry (no admin decision)

**Plain English.** Edge Function cron runs every 5 seconds. Finds trades where `end_time < now()` still marked active. Settles each with the configured default (usually lose). House wins the un-adjudicated book.

```mermaid
sequenceDiagram
    participant CRON as Cron (every 5s)
    participant EF as settle_expired_trades Edge Fn
    participant DB as Postgres
    participant ST as settle_trade RPC
    participant RT as Realtime
    participant SSE as /api/stream/user
    actor U as User

    CRON->>EF: Invoke
    EF->>DB: SELECT app_config.expiry_policy
    EF->>DB: SELECT user_trades<br/>WHERE status='active' AND end_time < now()<br/>LIMIT 500
    DB-->>EF: expired[]
    loop Each expired trade
        EF->>ST: settle_trade(id, policy, admin=null, reason='auto_'+policy)
        ST->>DB: FOR UPDATE + status check
        alt Already settled (race)
            ST-->>EF: skip
        else
            ST->>DB: Update balance + trade + transaction
            DB->>RT: CHANGE user_trades, user_balances
            RT-->>SSE: Push
            SSE-->>U: Toast (usually "Lost")
        end
    end
    EF-->>CRON: Done
```

**DB writes:** per-trade: `user_trades`, `user_balances`, `transactions` (if win/void), `admin_actions` (null admin_id).

**Failure modes.** Edge fn crashes → next 5s cron picks up same batch. `FOR UPDATE` + status check = idempotent.

---

### 9.7 Referral commission (deposit → pending → approved → bonus ticket)

**Plain English.** Bob's first qualifying deposit triggers 5 pending commission rows up his chain. Admin reviews, approves each one. Approved commission doesn't credit balance directly — it mints a **bonus ticket** (locked, needs 3× wager before unlocking).

```mermaid
sequenceDiagram
    participant DEP as approve_deposit flow<br/>(continued from §9.3)
    participant RD as record_deposit RPC
    participant DB as Postgres
    participant RT as Realtime
    participant ASSE as /api/stream/admin
    actor A as Admin
    participant AQ as /admin/commissions
    participant AC as /api/admin/commissions/:id/approve
    participant AR as approve_commission RPC
    participant CB as credit_bonus RPC
    participant SSE as /api/stream/user
    actor Alice as Referrer

    DEP->>RD: record_deposit(bob, amount, tx_id)
    RD->>DB: SELECT referrals WHERE referee_id=bob
    alt No referrer (root user)
        RD-->>DEP: return (no chain)
    end
    RD->>DB: Check is_qualified=false AND amount ≥ $10
    RD->>DB: UPDATE referrals SET is_qualified=true

    loop For level 1..5 of referral_upline
        RD->>DB: Get referral_rates[ancestor] OR app_config defaults
        RD->>RD: commission = deposit × rate_bps / 10000
        RD->>DB: INSERT referral_commissions (pending)
    end
    DB->>RT: CHANGE referral_commissions (×5)
    RT-->>ASSE: Push
    ASSE-->>AQ: 5 new pending rows
    RT-->>SSE: Push to each beneficiary
    SSE-->>Alice: Toast "New commission pending"

    Note over A: Admin reviews
    A->>AQ: Click Approve on Alice's row
    AQ->>AC: POST /api/admin/commissions/:id/approve
    AC->>DB: rpc approve_commission
    AR->>DB: SELECT FOR UPDATE<br/>Assert status=pending
    AR->>CB: credit_bonus(alice, 'referral_commission', commission_id, amount)
    CB->>DB: INSERT bonus_tickets<br/>wager_required = amount × 3<br/>expires_at = now + 90d<br/>status=locked
    CB->>DB: UPDATE user_balances<br/>balance_cents += amount<br/>locked_bonus_cents += amount
    CB->>DB: INSERT transactions
    AR->>DB: UPDATE referral_commissions (approved)
    AR->>DB: INSERT admin_actions
    DB->>RT: CHANGE bonus_tickets, user_balances, referral_commissions
    RT-->>SSE: Push events
    SSE-->>Alice: Balance flash + toast "Commission approved! $X locked (wager 3×)"
```

**DB writes:** `referrals` (qualification), `referral_commissions` (×5 on deposit). Per approval: `bonus_tickets`, `user_balances`, `transactions`, `referral_commissions` (status), `admin_actions`.

**Failure modes.** Upline < 5 levels deep → fewer rows. Bob is root user (admin code signup) → zero rows. Commission already reviewed → `ALREADY_REVIEWED`.

---

### 9.8 Bonus wagering unlock

**Plain English.** User has a locked $25 commission — must wager $75 total before it unlocks. Every trade they place contributes. Oldest ticket fills first. Once full, ticket status flips to "released" and `locked_bonus_cents` drops, making balance withdrawable.

```mermaid
sequenceDiagram
    actor U as User<br/>(ticket: $25 locked, needs $75)
    participant PT as place_trade (from §9.4)
    participant AW as apply_wager_progress RPC
    participant DB as Postgres
    participant SSE as /api/stream/user
    participant UI as /referrals + /wallet UI

    Note over U: State: tickets = [ $25/$75 progress 0 ]
    U->>PT: Place $30 trade
    PT->>AW: apply_wager_progress(user, 30)
    AW->>DB: SELECT locked tickets ORDER BY created_at FOR UPDATE
    AW->>AW: Ticket: apply = min(30, 75-0) = 30
    AW->>DB: UPDATE ticket (progress=30)

    Note over U: State: [ $25/$75 progress 30 ]
    U->>PT: Place $40 trade
    PT->>AW: apply_wager_progress(user, 40)
    AW->>AW: Ticket: apply = min(40, 75-30) = 40
    AW->>DB: UPDATE ticket (progress=70)

    Note over U: State: [ $25/$75 progress 70 ]
    U->>PT: Place $20 trade
    PT->>AW: apply_wager_progress(user, 20)
    AW->>AW: Ticket: apply = min(20, 75-70) = 5
    AW->>DB: UPDATE ticket (progress=75, status=released, released_at=now)
    AW->>DB: UPDATE user_balances (locked_bonus_cents -= 25)
    Note over AW: Remaining 15 overflow — if another ticket exists, fills it; else lost
    DB->>SSE: Push 'bonus_ticket' + 'balance' events
    SSE-->>UI: Toast "Bonus unlocked! $25 now withdrawable"
```

**DB writes:** `bonus_tickets` (progress / status), `user_balances` (locked_bonus).

**Edge case.** Ticket expires before wager completes → `expire_bonus_tickets` cron flips to `expired`, debits both `balance_cents` and `locked_bonus_cents`. Forfeited.

---

### 9.9 Withdrawal (two-phase admin flow)

**Plain English.** User requests withdrawal. Balance held immediately. Admin approves (Phase 1). Admin opens their Trust Wallet, sends crypto to user's address, copies tx hash, pastes into Mark as Paid (Phase 2). User sees "completed" with tx hash. Rejection refunds.

```mermaid
sequenceDiagram
    actor U as User
    participant FE as /wallet/withdraw
    participant WR as /api/withdrawals
    participant DB as Postgres
    participant RQ as request_withdrawal RPC
    participant RT as Realtime
    participant ASSE as /api/stream/admin
    actor A as Admin
    participant AQ1 as /admin/withdrawals Queue
    participant AV as /api/admin/withdrawals/:id/approve
    participant AV_RPC as approve_withdrawal RPC
    participant AQ2 as /admin/withdrawals Payout
    participant MP as /api/admin/withdrawals/:id/mark-paid
    participant MP_RPC as mark_withdrawal_paid RPC

    U->>FE: See withdrawable = balance - locked_trades - locked_bonus
    U->>FE: Submit amount + token/network + address
    FE->>WR: POST /api/withdrawals
    WR->>DB: rpc request_withdrawal
    RQ->>DB: SELECT user_balances FOR UPDATE
    RQ->>RQ: Check amount ≥ min ($50)<br/>amount ≤ withdrawable<br/>dest ≠ empty
    RQ->>DB: UPDATE user_balances (-amount)  [hold]
    RQ->>DB: INSERT transactions (withdraw hold)
    RQ->>DB: INSERT withdrawals (pending)
    DB->>RT: CHANGE withdrawals
    RT-->>ASSE: New pending
    ASSE-->>AQ1: Live-append
    WR-->>FE: {withdrawal}
    FE->>U: "Pending review"

    Note over A: Phase 1 review
    A->>AQ1: Check user history + exploit flags<br/>(NEW_USER, LOW_TRADE_VOLUME, ADDRESS_REUSE...)
    A->>AQ1: Click Approve
    AQ1->>AV: POST approve
    AV->>DB: rpc approve_withdrawal
    AV_RPC->>DB: UPDATE withdrawals (status=approved)
    AV_RPC->>DB: INSERT admin_actions
    DB->>RT: CHANGE withdrawals
    RT-->>AQ2: Row moves to Payout tab
    RT-->>U: Status "Approved, awaiting payout"

    rect rgba(255,200,0,0.15)
        Note over A: OFF-PLATFORM<br/>Admin opens Trust Wallet<br/>Sends crypto to user's destination<br/>Copies tx hash
    end

    A->>AQ2: Open payout row
    A->>AQ2: Re-type last 8 chars of destination (safety)<br/>Paste tx hash
    AQ2->>MP: POST mark-paid {tx_hash}
    MP->>DB: rpc mark_withdrawal_paid
    MP_RPC->>DB: UPDATE withdrawals (status=paid, payout_tx_hash, paid_at)
    MP_RPC->>DB: INSERT admin_actions
    DB->>RT: CHANGE withdrawals
    RT-->>U: "Completed. tx: 0xabc..."
```

**DB writes:** `withdrawals`, `user_balances` (hold), `transactions` (hold), `admin_actions`. On rejection: refund debit + `refund_tx_id`. On cancel (user, pending only): refund.

**Failure modes.** `INSUFFICIENT_WITHDRAWABLE`, `BELOW_MIN_WITHDRAW`, `DEST_REQUIRED`. Marking paid without tx hash → `TX_HASH_REQUIRED`.

---

### 9.10 Chart tick (real price → displayed price)

**Plain English.** Binance WebSocket streams real market prices. Our edge fn pulls them, applies hidden scale + offset per token, writes current-second candle. Every second, `tick_candles` builds OHLC with synthetic micro-ticks. Client chart updates via SSE. Between server ticks, browser interpolates at 60 fps for a smooth price label.

```mermaid
sequenceDiagram
    participant BN as Binance Public WS
    participant EF1 as shadow_fetch Edge Fn<br/>(long-lived)
    participant DB as Postgres
    participant EF2 as tick_candles Edge Fn<br/>(every 1s cron)
    participant EF3 as aggregate_candles Edge Fn<br/>(every 1m cron)
    participant RT as Realtime
    participant SSE as /api/stream/candles
    participant UI as TradingChart (browser)

    BN-->>EF1: Stream tick {symbol, close}
    EF1->>EF1: scale + offset per token config
    EF1->>DB: UPDATE tokens.last_shadow_price

    Note over EF2: Every 1s
    EF2->>DB: For each enabled token:<br/>read last candle + token.feed_source
    alt feed_source = shadow
        EF2->>EF2: target = last_shadow_price
    else synthetic
        EF2->>EF2: OU + jump model
    else replay
        EF2->>DB: Read next from candle_replay_bank
    else frozen
        EF2->>EF2: skip
    end
    EF2->>EF2: Generate 10 micro-ticks prev→target with asymmetric wicks
    EF2->>EF2: volume = base × (1 + range × 150) × jitter
    EF2->>DB: UPSERT candles_1s

    Note over EF3: Every 1m
    EF3->>DB: Roll candles_1s → candles_1m, _5m, _15m, _1h, _4h, _1d

    DB->>RT: CHANGE candles_1s
    RT-->>SSE: Server-side aggregation to requested TF
    SSE-->>UI: event: candle, data: {time, o,h,l,c,v}
    UI->>UI: lightweight-charts.update(candle)
    UI->>UI: TickInterpolator: 60fps micro-motion to next server tick
```

**DB writes per second:** 1 row per enabled token in `candles_1s`. Partitioned monthly, dropped after 14 days.

**Failure modes.** Binance WS drops → exponential backoff reconnect, tokens temporarily fall back to synthetic. Chart never freezes.

---

### 9.11 Realtime (SSE proxy) — the connection lifetime

**Plain English.** When a user opens the app, the browser opens an SSE connection to `/api/stream/user`. That connection lives for the session. Next.js subscribes to Supabase Realtime server-side and pushes filtered events down to the browser. All state (trades, balance, commissions, etc.) flows through this one pipe. Auto-reconnects on flap.

```mermaid
sequenceDiagram
    participant BR as Browser
    participant ES as EventSource('/api/stream/user')
    participant SSE as SSE Route Handler
    participant AU as Auth Check
    participant RT as Supabase Realtime
    participant DB as Postgres

    BR->>ES: new EventSource()
    ES->>SSE: GET /api/stream/user<br/>(cookie carries JWT)
    SSE->>AU: auth.getUser
    AU-->>SSE: user
    SSE->>RT: channel(`user:${uid}`)<br/>.on(postgres_changes, filters)<br/>.subscribe()
    SSE-->>ES: event: hello
    Note over SSE: Loop — every 25s
    SSE-->>ES: : heartbeat

    Note over DB: Something changes (trade placed)
    DB->>RT: pg_changes event (user_trades insert)
    RT-->>SSE: delivered (filtered by user_id=uid)
    SSE-->>ES: event: trade, data: {...}
    ES-->>BR: dispatch 'trade'
    BR->>BR: Zustand upsertActiveTrade<br/>TanStack invalidate(['trades'])

    Note over BR: User loses connection
    BR->>ES: connection drops
    ES->>ES: Auto-reconnect after 3s
    ES->>SSE: GET /api/stream/user (again)
    SSE->>RT: new subscription
    Note over BR: Parallel: refetch fresh state
    BR->>BR: queryClient.invalidateQueries(['me'])
```

**Events streamed in one pipe:** `trade`, `balance`, `bonus_ticket`, `deposit`, `withdrawal`, `commission`. Each uses its named `event:` line so the client dispatches to the right handler.

**Connection limits.** 1 SSE connection per user per session. At 2000+ concurrent users, consider a dedicated WS server — noted in runbook, not needed for v1.

---

### 9.12 Image upload (deposit proof example)

**Plain English.** User picks file. Browser compresses to WebP + strips EXIF (GPS removal). Uploads via multipart POST to Next.js. Next.js validates and streams to Supabase Storage. Returns path. Browser includes path in deposit submission.

```mermaid
sequenceDiagram
    actor U as User
    participant FE as Deposit Form
    participant CMP as compressImage (browser)
    participant UP as /api/upload/deposit-proof
    participant AU as Auth Check
    participant VA as Size/Mime Validate
    participant ST as Supabase Storage

    U->>FE: Select file (photo.jpg, 3.5 MB)
    FE->>CMP: compressImage(file, 1600px, 0.85 quality)
    CMP->>CMP: createImageBitmap → OffscreenCanvas<br/>encode WebP → strip EXIF
    CMP-->>FE: webpFile (420 KB)
    FE->>UP: POST multipart {file: webpFile}
    UP->>AU: auth.getUser
    AU-->>UP: user
    UP->>VA: size ≤ 5 MB? mime in allowlist?
    VA-->>UP: OK
    UP->>UP: path = `${user.id}/${randomId}.webp`
    UP->>ST: storage.from('deposit-proofs').upload(path, bytes)
    ST-->>UP: OK
    UP-->>FE: {path}
    Note over FE: Include path in deposit submission<br/>(separate /api/deposits call)
```

**Storage writes:** `deposit-proofs/{user_id}/{random}.webp`.

**Failure modes.** File > 5 MB → 413. Unsupported mime → 400. Unauthenticated → 401.

---

## 10. Security Model

### 10.1 Layered defences

| Layer            | Mechanism                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| Transport        | HTTPS only, TLS 1.3, HSTS                                                                              |
| Auth             | Supabase Auth, httpOnly + secure + sameSite=lax cookies                                                |
| Route guard      | `middleware.ts` redirects unauthed / non-admin                                                         |
| API guard        | `assertAdmin()` on every admin Route Handler — defence in depth                                        |
| DB isolation     | RLS on all 30 tables. Non-admin can only read own rows.                                                |
| Money writes     | Only via `security definer` functions with `FOR UPDATE` locks                                          |
| Service role     | Server-only import (`'server-only'`). Never in client bundle.                                          |
| Client bundle    | Zero Supabase references. Verified in CI.                                                              |
| Input validation | Zod on every endpoint + DB CHECK constraints                                                           |
| Rate limit       | Global 300/min per IP + per-user-action specific limits                                                |
| Audit            | `admin_actions` immutable ledger + Sentry breadcrumbs                                                  |
| CSRF             | Same-origin cookies; SameSite=lax. Server Actions have built-in protection.                            |
| XSS              | React escapes by default. SVG upload disabled for user-writable buckets.                               |
| Secrets          | Vercel encrypted env. Rotated on admin offboarding.                                                    |
| Storage          | Bucket-level mime + size allowlist. Private buckets via 10-min signed URLs through `/api/media` proxy. |

### 10.2 Error taxonomy (never leak Postgres errors)

```
UNAUTHENTICATED | FORBIDDEN | RATE_LIMITED | INVALID_INPUT | INTERNAL_ERROR
ACCOUNT_FROZEN | INVALID_CREDENTIALS

Trade: INSUFFICIENT_FUNDS | AMOUNT_OUT_OF_RANGE | TOKEN_UNAVAILABLE | PERIOD_UNAVAILABLE
       TRADING_FROZEN | TRADE_NOT_FOUND | TRADE_NOT_ACTIVE

Signup: CODE_NOT_FOUND | CODE_INACTIVE | CODE_EXPIRED | CODE_EXHAUSTED | CODE_CONSUME_FAILED
        AUTH_CREATE_FAILED | USERNAME_TAKEN

Deposit: WALLET_DISABLED | AMOUNT_BELOW_MIN | PROOF_REQUIRED | DUPLICATE_TX_HASH
         DEPOSIT_NOT_FOUND | ALREADY_REVIEWED

Withdraw: BELOW_MIN_WITHDRAW | DEST_REQUIRED | INSUFFICIENT_WITHDRAWABLE | FEE_EXCEEDS_AMOUNT
          NOT_PENDING | NOT_APPROVED | NOT_REFUNDABLE | NOT_CANCELLABLE | TX_HASH_REQUIRED

Referral: COMMISSION_NOT_FOUND | REF_CODE_IN_USE | SELF_REFERRAL_BLOCKED

Upload: FILE_REQUIRED | TOO_LARGE | BAD_MIME | UPLOAD_FAILED
```

All wrapped as `{ error: { code, message } }` with appropriate HTTP status.

### 10.3 Exploit matrix

| Exploit                                    | Mitigation                                                 |
| ------------------------------------------ | ---------------------------------------------------------- |
| Screenshot the chart, claim rigged outcome | Scale + offset hide real price — not comparable to Binance |
| Fake account farm for commissions          | Advisory flags + bonus wager requirement + admin approval  |
| Forged deposit screenshot                  | Tx hash dedup + admin review + reject reason               |
| Self-referral (fake downline)              | Same-IP flag + velocity flag, admin visibility             |
| Rapid deposit → withdrawal                 | `RAPID` flag surfaced on withdrawal review                 |
| Username change to hijack referral link    | Trigger blocks rename when code is in use                  |
| Direct Supabase call from browser          | Impossible — no client-side Supabase lib                   |
| Replay old Server Action call              | Rate limit + Zod input validation + idempotency at DB      |
| Session theft                              | httpOnly + secure cookies, short JWT TTL, admin can revoke |

---

## 11. Progress Tracker

Phase-by-phase. Every task a checkbox. Engineer picks up, completes, ticks.

**Estimated total: 41 engineer-days** (1–2 devs full-time → ~6 calendar weeks).

---

### Sprint 0 — Foundations (3 days)

**Goal.** Repo skeleton, Supabase project, core schema, auth, zero Supabase in client bundle.

- [x] Initialize Next.js 16.2 with App Router, TypeScript strict, Turbopack
- [x] Enable React Compiler (`reactCompiler: true`)
- [ ] Install Tailwind, shadcn/ui, lucide-react, framer-motion, zustand, zod, react-hook-form, @tanstack/react-query
- [ ] Create Supabase project (dev + prod)
- [ ] Install Supabase CLI + link project
- [ ] Configure local dev (`supabase start`)
- [ ] Migration `0001_init.sql` — profiles, user_balances, transactions, tokens, trade_periods, user_trades, candles_1s, admin_actions, app_config
- [ ] Migration `0004_rls.sql` — all policies + `is_admin()` function
- [ ] `handle_new_user` trigger — auto profile + balance
- [x] Create `lib/supabase/server.ts` and `lib/supabase/admin.ts` with `'server-only'`
- [x] Confirm `lib/supabase/client.ts` does **not** exist
- [ ] Middleware: auth redirect + admin guard + global rate limit
- [x] `lib/auth/assertAdmin.ts` helper
- [x] Tailwind config with Trust-Wallet dark tokens (bg, border, up, down, brand)
- [x] `lib/api/client.ts` + error envelope helpers
- [ ] Playwright smoke test: unauthenticated /trade redirects to /login
- [x] CI: `grep "supabase" .next/static/chunks | wc -l` must equal 0
- [ ] Bootstrap one admin user manually via SQL

**Exit.** Login works. Protected routes redirect. No Supabase in client bundle.

**Sprint 0 log — 2026-04-19**

### Phase 1: Foundation slice
- [x] Enable React Compiler and install repo-local foundation dependencies — `package.json` (modified), `pnpm-lock.yaml` (modified), `next.config.ts` (modified)
- [x] Create server-only backend helpers and API client primitives — `lib/env/server.ts` (created), `lib/supabase/server.ts` (created), `lib/supabase/admin.ts` (created), `lib/api/client.ts` (created), `lib/config/site.ts` (created), `lib/utils/format.ts` (created)
- [x] Replace placeholder app metadata and Trust-Wallet-style design tokens — `app/layout.tsx` (modified), `app/globals.css` (modified)

### Phase 2: Product shell
- [x] Build the first trading shell with shared constants and clean types — `types/platform.ts` (created), `lib/constants/platform.ts` (created), `components/home/section-heading.tsx` (created), `components/home/trustpro-shell.tsx` (created), `app/page.tsx` (modified)
- [x] Use Zustand for shared state and TanStack Table for the first admin queue surface — `stores/trading-shell-store.ts` (created), `components/home/trading-workbench.tsx` (created), `components/home/settlement-queue-table.tsx` (created)

### Phase 3: Verify
- [x] Verify lint, production build, and client-bundle Supabase isolation — `pnpm lint`, `pnpm build`, `grep -R "supabase" .next/static/chunks | wc -l` = `0`
- [ ] External infra still blocked — Supabase project creation, CLI linking, `supabase start`, SQL migrations, auth middleware, and admin bootstrap remain for the next phase

### Phase 4: Auth route scaffold
- [x] Add preview login flow and protected route shells — `app/actions/auth.ts` (created), `components/auth/login-form.tsx` (created), `app/login/page.tsx` (created), `app/trade/page.tsx` (created), `app/admin/page.tsx` (created), `schemas/auth.ts` (created)
- [x] Add proxy-based auth redirect and admin guard scaffold — `proxy.ts` (created), `lib/auth/constants.ts` (created), `lib/auth/session.ts` (created), `lib/auth/assertAdmin.ts` (created)
- [ ] Global rate limit and Playwright redirect execution still pending — proxy currently handles redirects and role gates only

**Files touched:**
- `app/actions/auth.ts` — created
- `app/admin/page.tsx` — created
- `app/globals.css` — modified
- `app/layout.tsx` — modified
- `app/login/page.tsx` — created
- `app/page.tsx` — modified
- `app/trade/page.tsx` — created
- `components/auth/login-form.tsx` — created
- `components/home/section-heading.tsx` — created
- `components/home/settlement-queue-table.tsx` — created
- `components/home/trading-workbench.tsx` — created
- `components/home/trustpro-shell.tsx` — created
- `lib/auth/assertAdmin.ts` — created
- `lib/auth/constants.ts` — created
- `lib/auth/session.ts` — created
- `lib/api/client.ts` — created
- `lib/config/site.ts` — created
- `lib/constants/platform.ts` — created
- `lib/env/server.ts` — created
- `lib/supabase/admin.ts` — created
- `lib/supabase/server.ts` — created
- `lib/utils/format.ts` — created
- `next.config.ts` — modified
- `package.json` — modified
- `pnpm-lock.yaml` — modified
- `proxy.ts` — created
- `schemas/auth.ts` — created
- `stores/trading-shell-store.ts` — created
- `types/platform.ts` — created

---

### Sprint 0.5 — Invitation Gate (2 days)

**Goal.** Signup impossible without a code.

- [ ] Migration `0006_invitation_codes.sql` — invitation_codes + triggers + expiry/use status
- [ ] DB functions: `validate_invite`, `consume_invite`, `mint_invite_codes`, `revoke_invite`
- [ ] `/signup` page with gated form (code validates live, form reveals)
- [ ] `/api/invites/validate` GET Route Handler
- [ ] `/api/auth/signup` POST Route Handler (create user + rollback on failure + consume_invite)
- [ ] `/admin/invites` page — two tabs: All Codes + Mint
- [ ] `/api/admin/codes/mint` POST (1–1000 at once)
- [ ] `/api/admin/codes/:code/revoke` POST
- [ ] CSV export for minted batches
- [ ] Tests: single-use semantics, race condition (concurrent signups), revocation, expiry auto-flip
- [ ] Playwright: signup without code → rejected; with valid code → account created

**Exit.** No code, no account. Admin can mint and revoke. All exit criteria from §24.12 met.

---

### Sprint 1 — Markets & Realistic Chart (6 days)

**Goal.** Professional live chart + admin price control.

- [ ] Migration `0010_chart_engine.sql` — tokens extensions, candle_replay_bank, token_replay_state, candles_1m through \_1d tables
- [ ] Migration `0011_storage_buckets.sql` — all 5 buckets with mime + size limits + RLS
- [ ] Admin token CRUD: `/admin/tokens` page + `/api/admin/tokens` endpoints
- [ ] Admin period CRUD: `/admin/periods` page + endpoints
- [ ] Admin wallet CRUD: `/admin/wallets` + endpoints (last-8-char confirm)
- [ ] Admin icon upload: `/api/admin/upload/token-icon`
- [ ] Media proxy: `/api/media/[bucket]/[...path]` Route Handler
- [ ] Public reads: `/api/tokens`, `/api/periods`, `/api/candles`
- [ ] Edge Fn: `shadow_fetch` — Binance WS subscriber, scale+offset, updates `tokens.last_shadow_price`
- [ ] Edge Fn: `tick_candles` — 1-second cron, generates OHLC with GBM or shadow or replay
- [ ] Edge Fn: `aggregate_candles` — 1-minute cron, rolls up higher TFs
- [ ] `/api/stream/candles` SSE Route Handler with server-side TF aggregation
- [ ] `TradingChart.tsx` with lightweight-charts — candles + volume + crosshair + TF tabs
- [ ] `TickInterpolator` hook — 60 fps sub-tick animation using `useEffectEvent`
- [ ] `OrderBookIllusion.tsx` — synthetic depth ladder
- [ ] `TickerStrip.tsx` — marquee of all tokens
- [ ] `/admin/candles` controller — freeze, nudge, hard-set, replay CSV upload
- [ ] "Pull from Binance" button — fetches historical candles via REST, seeds `candle_replay_bank`
- [ ] Tests: shadow scale hidden in API; multi-TF aggregation integrity; micro-tick range bounds; replay cursor advance

**Exit.** Chart at 1s–1d TFs, follows real BTC via shadow, admin can freeze/replay, price label 60 fps smooth.

---

### Sprint 2 — Order Ticket & Active Positions (5 days)

**Goal.** End-to-end trade flow with countdowns.

- [ ] Migration `0002_place_trade.sql` — `place_trade` security definer function
- [ ] `/api/trades` POST (place) + GET (list, filterable)
- [ ] `/api/trades/:id` GET
- [ ] `/api/trades/:id/cancel` POST (2s grace)
- [ ] `/api/me` GET + PATCH
- [ ] `/api/me/balance` GET
- [ ] `/api/stream/user` SSE Route Handler — all user-scoped events in one pipe
- [ ] `useUserStream()` hook wiring SSE → Zustand + TanStack invalidations
- [ ] `OrderTicket.tsx` composite — LongShortToggle, PeriodSelector, AmountInput, PayoutPreview
- [ ] `PlaceTradeButton.tsx` with optimistic countdown
- [ ] `ActivePositionsList.tsx` + `PositionRow.tsx`
- [ ] `Countdown.tsx` — drift-free, absolute end time, pulse red at <10s
- [ ] Chart overlay: entry price line + expiry marker per active trade
- [ ] Trade settlement toast (win → success, lose → error)
- [ ] Balance flash animation in header on update
- [ ] Upstash rate limit: `place:${uid}` @ 5/10s
- [ ] Tests: happy path win + lose; insufficient funds; rate limit; trade page mobile

**Exit.** User places a trade from UI. Admin (via SQL) marks it settled. User sees toast within 500 ms.

---

### Sprint 3 — Admin God-Mode (6 days)

**Goal.** Decision queue + full admin controls.

- [ ] Migration `0003_settle_trade.sql` — `settle_trade` function
- [ ] `/api/admin/trades` GET with filters
- [ ] `/api/admin/trades/:id/settle` POST
- [ ] `/api/admin/trades/bulk-settle` POST
- [ ] `/api/admin/stream` SSE — all active trades + pending deposits + new flags
- [ ] `/admin/trades` virtualized queue (react-window), sorted by end_time asc
- [ ] Keyboard shortcuts: W, L, V, Shift+click range, Cmd+click multi
- [ ] Bulk action bar (slide in on selection)
- [ ] Filters sidebar: user, token, direction, amount range, time remaining
- [ ] `/admin/users` search + detail page
- [ ] `/api/admin/users` endpoints (list, get, freeze, adjust-balance)
- [ ] `/admin/audit` viewer
- [ ] `/api/admin/audit` paginated
- [ ] Business dashboards: exposure, today's P&L, top winners/losers
- [ ] Tests: settle → balance updates + RT propagation; bulk settle; non-admin → 403; already-settled → 409

**Exit.** Admin settles any trade in <2 clicks. Queue updates live. User toast within 500 ms.

---

### Sprint 3.5 — Referrals (4 days)

**Goal.** 5-level pyramid + admin commission approval.

- [ ] Migration `0005_referrals.sql` — referrals, referral_upline, referral_rates, referral_commissions, referral_flags
- [ ] DB functions: `bind_referral`, `record_deposit`, `check_referral_fraud`
- [ ] Wire `consume_invite` (§24) to call `bind_referral` when source=user
- [ ] `/referrals` user page: code, share links, earnings cards, 5-level tree accordion, commission history table
- [ ] `/api/referrals/stats` + `/tree` + `/commissions` endpoints
- [ ] `/admin/referrals/queue` pending commissions — approve/reject/bulk
- [ ] `/admin/referrals/rates` per-user bps overrides
- [ ] `/admin/referrals/flags` fraud queue (dismiss/resolve)
- [ ] `/admin/referrals/tree/:userId` upline + downline inspector
- [ ] `/api/admin/commissions/*` endpoints
- [ ] `/api/admin/users/:id/set-rates` endpoint
- [ ] `/api/admin/flags/:id/resolve` endpoint
- [ ] Bulk approve commissions
- [ ] QR code generator for share links
- [ ] Tests: 5-deep chain insertion; first-deposit-only trigger; RLS — user A cannot read user B commissions; velocity + same-IP flags raised

**Exit.** Bob deposits, 5 commissions appear in admin queue, Alice sees pending row, admin approves, Alice sees locked bonus ticket.

---

### Sprint 4 — Deposits + Withdrawals + Bonus Wagering (6 days)

**Goal.** Real money in, real money out, exploit-proof bonuses.

- [ ] Migration `0007_bonus_wagering.sql` — bonus_tickets + user_balances split (locked_in_trades, locked_bonus)
- [ ] DB functions: `credit_bonus`, `apply_wager_progress`, `expire_bonus_tickets`
- [ ] Patch `place_trade` to call `apply_wager_progress`
- [ ] Patch `approve_commission` (§23) to route through `credit_bonus`
- [ ] Patch `handle_new_user` trigger to credit signup bonus via `credit_bonus`
- [ ] Edge Fn: `expire_bonus_tickets` — daily cron
- [ ] Migration `0008_deposits.sql` + Storage policies
- [ ] DB functions: `submit_deposit`, `approve_deposit`, `reject_deposit`
- [ ] `/wallet/deposit` user page with QR, address, upload, form
- [ ] `/api/wallets` GET
- [ ] `/api/deposits` POST + GET
- [ ] `/api/upload/deposit-proof` multipart Route Handler
- [ ] Image compression + EXIF strip on client
- [ ] `/admin/deposits` queue with lightbox screenshot view
- [ ] `/api/admin/deposits/*` endpoints
- [ ] Migration `0009_withdrawals.sql`
- [ ] DB functions: `request_withdrawal`, `approve_withdrawal`, `mark_withdrawal_paid`, `reject_withdrawal`, `cancel_withdrawal`
- [ ] `/wallet/withdraw` user page with withdrawable breakdown
- [ ] `/api/withdrawals` POST + GET + DELETE
- [ ] `/api/me/bonus-tickets` GET + UI on profile
- [ ] `/admin/withdrawals` two-tab (Queue + Payout)
- [ ] `/api/admin/withdrawals/*` endpoints
- [ ] Last-8-char re-type on mark-paid
- [ ] Exploit flag auto-paint on withdrawal submit (NEW_USER, LOW_TRADE_VOLUME, ADDRESS_REUSE, RAPID, POST_BONUS, FIRST_WITHDRAW)
- [ ] Tests: full exploit sim — Alice refers Bob → Bob deposits $500 → commission 25 pending → approve → Alice has locked $25 → Alice wagers $75 → unlocks → withdraws $25; house net +$1 after 35% edge on $75

**Exit.** End-to-end money loop green. Wager requirement blocks pure commission extraction. All §25–27 exit criteria met.

---

### Sprint 5 — Polish, Mobile, PWA, CMS (5 days)

**Goal.** Ship-ready user experience.

- [ ] Edge Fn: `settle_expired_trades` — 5s cron
- [ ] `app_config.expiry_policy` wired
- [ ] Mobile pass on `/trade/[symbol]` — bottom sheet ticket, sticky countdown banner
- [ ] Mobile admin queue (read-only on small screens)
- [ ] PWA manifest + service worker + install prompt
- [ ] View Transitions API for token switches
- [ ] Empty states (no active trades, no commissions, etc.)
- [ ] Error boundaries + fallbacks
- [ ] Toast system polish with sonner
- [ ] `/me` profile page — avatar upload via `/api/upload/avatar`
- [ ] `/portfolio` history with filters + CSV export
- [ ] `/wallet` transaction ledger
- [ ] `promo_slots` table seed
- [ ] `/admin/promo` CMS page
- [ ] `/api/promo/slots` GET + `/api/admin/promo` endpoints
- [ ] Landing page built from promo_slots (hero, trust badges, features, CTA)
- [ ] Fake live-profit marquee on landing
- [ ] SEO meta + OpenGraph
- [ ] Dark/light toggle optional (dark-first)
- [ ] Tests: install prompt on iOS Safari; CSV download integrity; empty states render

**Exit.** Full UX polish. PWA installable. Mobile works on 360 px. Landing is edit-without-redeploy.

---

### Sprint 6 — Hardening + Launch (4 days)

**Goal.** Production-ready deploy.

- [ ] Sentry SDK in Next.js + source maps
- [ ] All rate limits tuned under k6 load test (500 vusers)
- [ ] Full E2E suite green (Playwright)
- [ ] RLS isolation tests (pgTAP)
- [ ] Visual regression snapshots (3 viewports × 5 key pages)
- [ ] Client bundle audit: zero Supabase refs confirmed
- [ ] Security audit: input validation, error leakage, CORS
- [ ] Runbook finalized (every incident from §20)
- [ ] Legal: Terms, Privacy, Disclaimer pages
- [ ] Cookie consent banner if targeting EU
- [ ] Vercel production project + env vars
- [ ] Supabase production project + pooler + backups
- [ ] DNS + SSL
- [ ] GitHub Actions: preview per PR, production on main
- [ ] Supabase migrations in CI pipeline
- [ ] Post-deploy smoke test suite
- [ ] Monitoring dashboards (Sentry, Vercel Analytics, Supabase Logs)
- [ ] On-call rotation defined

**Exit.** Live URL. Smoke tests green. On-call rotation active.

---

### Post-launch backlog (out of scope for v1)

- Real on-chain deposit sweeping (auto-credit via hot wallet watcher)
- Copy trading (user A mirrors user B)
- Leverage / margin / liquidation
- KYC (Persona, Sumsub)
- Native mobile wrappers (Expo)
- i18n (zh-CN, id, vi, ja, es)
- Support chat (Intercom or self-hosted)
- Affiliate dashboards for power users
- Rank / tier system with perks
- Push notifications via web-push

---

## 12. Module Index

| Module      | File                            | Purpose                                                                                                                |
| ----------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| §1–22       | `TECHNICAL_IMPLEMENTATION.md`   | Base spec: architecture, schema, auth, state, server actions, chart basics, UI, security, deployment, testing, roadmap |
| §23         | `REFERRAL_MODULE.md`            | 5-level pyramid — upline cache, commission lifecycle, admin approval                                                   |
| §24         | `INVITATION_CODES_MODULE.md`    | Gated signup — user codes + admin-minted codes                                                                         |
| §25–27      | `DEPOSITS_WITHDRAWALS_BONUS.md` | Money in, money out, wager-locked bonuses                                                                              |
| §28         | `REALISTIC_CHART_ENGINE.md`     | Hybrid shadow feed + micro-structure + admin controls                                                                  |
| §29         | `STORAGE_MODULE.md`             | All 5 Supabase buckets + upload + serve patterns                                                                       |
| §30         | `API_GATEWAY_LAYER.md`          | No direct client↔Supabase; everything through `/api/*`                                                                 |
| **§master** | **this file**                   | Consolidated plain-English summary + flows + tracker                                                                   |

---

## 13. Appendix

### 13.1 Environment variables (production)

```
# Supabase (server-only — NOT NEXT_PUBLIC)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PROJECT_REF=

# Upstash Redis (rate limit)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Sentry
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com
ADMIN_SEED_EMAIL=
```

### 13.2 Essential commands

```bash
# Local dev
supabase start                           # local Postgres + Auth + Storage
pnpm dev                                 # Next.js with Turbopack

# Migrations
supabase migration new feature_x         # create new migration
supabase db push                         # apply to linked project
supabase db reset                        # reset local DB to migrations + seed

# Type generation
supabase gen types typescript --linked > types/db.ts

# Edge functions
supabase functions deploy shadow_fetch
supabase functions deploy tick_candles
supabase functions deploy settle_expired_trades
supabase functions deploy aggregate_candles
supabase functions deploy expire_bonus_tickets

# Testing
pnpm test                                # Vitest unit
pnpm test:rls                            # pgTAP RLS tests
pnpm test:e2e                            # Playwright
pnpm test:load                           # k6

# Build
pnpm build                               # Turbopack production build

# Bundle audit
grep -r "supabase" .next/static/chunks | wc -l     # must be 0
```

### 13.3 Cron schedules (Supabase)

| Edge Function           | Schedule                                       |
| ----------------------- | ---------------------------------------------- |
| `shadow_fetch`          | long-lived worker (restart every 6h as safety) |
| `tick_candles`          | `* * * * * *` (every 1s)                       |
| `aggregate_candles`     | `* * * * *` (every 1m)                         |
| `settle_expired_trades` | `*/5 * * * * *` (every 5s)                     |
| `expire_bonus_tickets`  | `0 3 * * *` (daily 03:00 UTC)                  |

### 13.4 Default `app_config` values

```sql
INSERT INTO app_config VALUES (
  id = 1,
  expiry_policy = 'auto_lose',
  global_trade_freeze = false,
  signup_bonus_cents = 1000,           -- $10 locked bonus
  rate_limit_per_10s = 5,
  bonus_wager_multiplier = 3.00,
  bonus_ticket_ttl_days = 90,
  ref_default_l1_bps = 500,            -- 5%
  ref_default_l2_bps = 300,
  ref_default_l3_bps = 200,
  ref_default_l4_bps = 100,
  ref_default_l5_bps = 50,
  ref_min_deposit_cents = 1000,        -- $10
  withdraw_min_cents = 5000,           -- $50
  withdraw_fee_cents = 0
);
```

### 13.5 Definition of Done (41 criteria rolled up)

1. Migration committed + applied to preview.
2. Zod schema + TS types exported.
3. Server Action or Route Handler has auth + rate limit + audit + typed errors.
4. RLS prevents cross-user access (Playwright proves it).
5. UI handles loading + empty + error + success.
6. Realtime updates without page reload (SSE).
7. Works on 360 px viewport.
8. Unit tests where logic is non-trivial.
9. Sentry captures bad input cleanly.
10. Documented in `/docs` if admin operations change.
11. Referral binding idempotent (retry ≠ double-bind).
12. Commission rows immutable after approval except via `clawback_commission`.
13. Fraud flags surface only — never auto-block.
14. Username change can't orphan referral links.
15. Signup impossible without a valid code.
16. Admin codes single-use (DB-enforced).
17. Failed signup rolls back auth.users row.
18. Anon users can't enumerate codes.
19. Username change still can't orphan user code.
20. Withdrawable = balance − locked_in_trades − locked_bonus (UI matches DB).
21. Commissions + signup bonus route through bonus tickets.
22. Can't mark withdrawal paid without tx_hash.
23. Deposit proof upload RLS-isolated per user.
24. Wallet address edit requires last-8-char confirm.
25. Chart follows real market or is indistinguishable synthetic.
26. Display price can't be reverse-engineered to real price.
27. Sub-second UI animation at 60 fps.
28. Trade overlays render within 200 ms of placement.
29. Binance WS failure never freezes chart.
30. Higher-TF tables never drift from 1s source.
31. All image assets in Supabase Storage.
32. Public images cached at CDN with ≥1h Cache-Control.
33. Private images only via signed URL / proxy with ≤10 min TTL.
34. User uploads compressed + EXIF-stripped client-side.
35. Private-bucket RLS isolation proven via Playwright.
36. Browser bundle contains zero Supabase references.
37. No request from browser hits `*.supabase.co` in normal ops.
38. All browser actions flow through `/api/*` or Server Actions.
39. SSE connection survives network flap.
40. Media proxy serves public assets with `public, max-age=3600`.
41. All endpoints use `{ error: { code, message } }` envelope.

---

**End of Master Specification.**

**Build it. Settle the book. House wins.**
