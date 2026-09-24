# StockYield — DESIGN.md

Design system for the StockYield site (Earn · Position · How it works · Risks & FAQ). Format follows VoltAgent/awesome-design-md. Reference for rhythm, spacing and motion only: helixonchain.xyz. No content, copy, imagery or marks are taken from it. Product source of truth: the product brief; this file wins only on visual decisions.

## 1. Visual Theme & Atmosphere

**Institutional fintech, calm and legible.** A place where people deposit money: it should feel like a well-set financial statement, not a crypto landing page. Warm paper background, hairline rules, graphite type, one signal green used sparingly for the primary action and for "passed" states.

- Mood: quiet, precise, transparent. Confidence comes from clarity and restraint, not decoration.
- Density: generous whitespace on marketing sections; compact, tabular, dashboard-like density inside the Earn module and Yield Check.
- Signature moves borrowed from the reference (rhythm, not content): oversized tightly-tracked headline with a muted second line; a four-cell fact strip under the hero; numbered mono eyebrow above each section title (`01 · HOW THE YIELD WORKS`); title left / muted paragraph right on a 12-col grid; hairline-bordered panels with very small radii; one inverted graphite section per page for contrast; a thin signal-green scroll-progress line under the header.
- Hero image: the **funds path** (see §7), an SVG diagram drawn in code. No photography, no AI imagery, no 3D coins, no stock, no partner logos. Partners appear as text names only.
- Truthfulness is a visual rule: unknown ≠ zero. Every number has a loading skeleton, a real value, or the word "Unavailable".

## 2. Color Palette & Roles

Warm off-white, deep graphite, signal green. (Contrast ratios computed against WCAG relative luminance.)

| Token | Hex | Role | Contrast |
|---|---|---|---|
| `--bg` | `#F6F4EE` | Page background (warm off-white) | — |
| `--surface` | `#FFFEFB` | Cards, module, inputs | — |
| `--surface-2` | `#EFECE3` | Stat cells, quiet fills, skeleton base | — |
| `--ink` | `#171A17` | Primary text, primary structure (deep graphite) | 15.96:1 on bg |
| `--muted` | `#5F655C` | Secondary text, labels | 5.45:1 on bg, 5.94:1 on surface |
| `--line` | `#D8D4C8` | Hairline borders, dividers (decorative only) | 1.35:1 — never the only cue |
| `--signal` | `#2BD67B` | Primary button fill, progress line, "passed" fills, path highlights | graphite text on it 9.2:1 |
| `--signal-ink` | `#0B6B3B` | Green used as **text/icon on light** (links, "passed" label) | 6.0:1 on bg |
| `--graphite` | `#171A17` | Inverted sections background (same as ink) | off-white text 15.96:1 |
| `--on-graphite-muted` | `#A7ADA2` | Muted text on graphite | 7.64:1 |
| `--mint` | `#D6ECDE` | **Brand support color** (background of the official logo/icon/banner assets). Fills for brand moments: funds-path start node, hero fact chips, banner, empty states. Never text, never a status color. | ink 14.13:1, muted 4.83:1, signal-ink 5.32:1 on it |
| `--mint-soft` | `#F2FAF5` | Lighter brand tint: quiet panel fills, hover on cards. | ink 16.52:1 |
| `--danger` | `#A8231B` | Failed / error text and icon | 6.54:1 on bg |
| `--warn` | `#7A4B00` | Caution, stale data, limited liquidity | 6.74:1 on bg |
| `--focus` | `#171A17` + 2px `--signal` offset ring | Keyboard focus | — |

Rules
- Mint is the brand's support color, taken from the delivered assets (`#D6ECDE` / `#F2FAF5`); it is a fill, not a status color, and never the only cue.
- Signal green is never used for body text on light backgrounds; use `--signal-ink`.
- Status is never color-only: each state has icon shape + word (see §4 Yield Check).
- No purple, no neon gradients, no glow. One flat green, one graphite, paper tones.
- Dark inverted sections use `--graphite` bg with `--bg` text; signal green stays the accent.

## 3. Typography Rules

Family: **Geist** (sans) and **Geist Mono**, loaded with `next/font/google` (self-hosted at build, no runtime request). Fallback: `Inter, ui-sans-serif, system-ui`. The current app declares Geist in CSS but never loads it; this fixes that.

All numbers: `font-variant-numeric: tabular-nums` (utility class `.num`). Tabular figures everywhere a number can change (APY, TVL, balances, gas, timestamps).

| Level | Size / line-height | Weight | Tracking | Use |
|---|---|---|---|---|
| Display (hero H1) | clamp(44px, 9vw, 112px) / 0.98 | 450 | −0.06em | "Put your USDG to work." second line in `--muted` |
| H2 (section) | clamp(30px, 4vw, 48px) / 1.05 | 450 | −0.05em | Section titles |
| H3 | 20px / 1.3 | 550 | −0.01em | Card / panel titles |
| Body L | 18px / 1.6 | 400 | 0 | Hero subtitle, lead paragraphs |
| Body | 16px / 1.6 | 400 | 0 | Default |
| Small | 14px / 1.5 | 400 | 0 | Helper text, table cells |
| Eyebrow (mono) | 12px / 1 | 400, uppercase | +0.08em | `01 · SECTION` labels, field labels, timestamps |
| Metric | 28–40px / 1 | 500 | −0.02em | Big numbers, tabular |
| Micro | 12px / 1.4 | 400 | 0 | Footnotes, sources (never below 12px) |

Hierarchy: one display per page; eyebrow → H2 → muted paragraph on every section. Muted paragraph max width 52ch. Minimum body size 16px on mobile.

## 4. Component Stylings & States

Shape language: **thin borders, small radii**. `--radius-sm 4px` (controls, pills, cells), `--radius-md 6px` (panels, cards), `999px` only for the network chip. This is a deliberate move away from the current 30px pill-heavy look toward the reference's sharper, more institutional rhythm. (Decision flagged for owner approval.)

**Buttons**
- Primary: `--signal` fill, `--ink` text, 48px height (56px in the module), 4px radius, weight 550. Hover: fill lightens 6%, arrow nudges 2px. Active: translateY(1px). Focus: focus ring. Disabled: `--surface-2` fill, `--muted` text, no hover; the label always says *why* ("Enter an amount", "Switch to Robinhood Chain").
- Secondary: transparent, 1px `--ink` border, `--ink` text. Hover: `--surface-2` fill.
- Text link: `--signal-ink`, underline on hover, external links carry a ↗ glyph.
- Busy: spinner + verb in progress; button stays the same width (no layout shift).

**Inputs (amount)**
- 1px `--line` border, `--surface` fill, mono unit tag "USDG". Focus: `--ink` border + focus ring. Error: `--danger` border + message below with icon; message linked via `aria-describedby`.
- Numeric only, max 6 decimals, `inputmode="decimal"`, tabular figures, MAX button as secondary chip.

**Earn module (aside on Earn, below hero on mobile)**
- Header "Earn with USDG"; identity rows (Vault · Protocol · Network · Asset) in mono eyebrow style; metric strip (Net APY *variable*, Vault TVL, Liquidity reported by API); amount field; Yield Check; CTA; step indicator.
- Step indicator "Step 1 of 2 · Approve USDG" → "Step 2 of 2 · Deposit USDG"; skipped when allowance already sufficient ("1 signature needed").

**Yield Check (the distinctive component — most polished on the site)**
- A bordered panel titled "Yield Check" with five labelled rows answering: Where do the funds go? · Where does the yield come from? · What will it cost? · What can limit withdrawal? · Are data and simulation current?
- Each row = label, plain value, state marker. Three states, never color-only:
  - **Passed** — filled square with ✓ + word "Passed" (`--signal-ink`).
  - **Failed** — filled square with ✕ + word "Failed" + reason (`--danger`).
  - **Unavailable** — dashed square with – + word "Unavailable" (`--muted`).
  - **Checking** — animated hairline sweep + "Checking…" (skeleton).
- Only real checks get a state marker (transaction simulation, chain, balance, gas estimate, data freshness, gates). Informational rows (destination, yield source) show text without a marker so nothing looks "verified" by decoration.
- Transition: when the simulation re-runs (after approve, amount change), the row sweeps bottom→top (gate-scan, 0.5s) and settles on the new state; a polite `aria-live` region announces "Simulation passed / failed / unavailable".
- Footer note: "A passed simulation is not a security assessment of the protocol."
- Forbidden: "Safe", "Verified", scores, shields, decorative ticks.

**Transaction states** (dialog/drawer, each with distinct icon, title, copy, and no reliance on color)
Waiting for wallet (pulsing ring) · Submitted (hash + explorer link, indeterminate bar) · Confirmed (✓, position refresh line) · Failed (✕, reason, Retry) · Rejected by user (neutral, "Nothing was sent", Try again). Confirmed shows on-chain success separately from "position refresh failed — Retry".

**Stat strip** (hero bottom): four hairline-divided cells: mono index (01–04), label, tabular value, unit/note. Skeleton while loading; "Unavailable" + Retry on failure.

**Cards / panels**: `--surface`, 1px `--line`, 6px radius, no shadow at rest.

**Navigation**: sticky, 72px, bg `--bg` at 92% + blur 8px, bottom hairline; Logo | Earn | Position | How it works | Risks | (network chip) Robinhood Chain | Connect Wallet. Active page: 2px `--ink` underline. Mobile: menu button → full-height sheet; wallet button always visible; network chip visible on mobile too.

**Deposit / Withdraw switch**: segmented control of two buttons (`aria-pressed`), 1px border, active = `--ink` fill/`--bg` text. (Radix Tabs were dropped: their `aria-controls` pointed at panels that don't exist and failed the accessibility audit.)

**Skeleton**: `--surface-2` blocks with a slow 1.6s shimmer; same dimensions as final content to prevent layout shift.

**Error state**: hairline panel, ✕ icon, plain sentence, `Retry` secondary button.

**Accordion (FAQ)**: hairline rows, + / – glyph, 200ms height ease; one open at a time optional.

**Footer**: graphite inverted band; wordmark, disclaimer "Variable returns. Capital at risk. StockYield does not guarantee yield or principal.", non-affiliation "StockYield is an independent interface and is not affiliated with Robinhood, Morpho or Steakhouse.", links (Vault contract, Morpho docs). Pons/SYELD link appears here only when live and verified.

### Brand assets (delivered in `stockyield-brand/`, linked, never modified)
- `favicon.ico`, `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png` → site icons via Next metadata.
- `logo-transparent.png` → `<BrandMark />` (`components/brand-mark.tsx`), the single swappable logo component used in the header and footer; the funds-path SVG reads the same `LOGO_SRC` constant from that file. The token logo is still being redesigned: replacing the file (or the one `src` inside `BrandMark`) must update both places, with no other code change.
- `banner-x-1500x500.png` → Open Graph / Twitter share preview.
- `logo-mint-1024.png` → reference only (mint background version).
Files are copied unchanged into `public/brand/`; StockYield never redraws or recolors them.

## 5. Layout Principles

- Grid: 12 columns, max content width 1200px, gutters 24px (16px mobile), page padding 20px mobile / 32px desktop.
- Spacing scale (px): 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128. Section vertical rhythm 96px desktop / 64px mobile. Inside panels 24–32px.
- Earn hero: 7/5 split — headline, subtitle, three fact chips (Non-custodial · Robinhood Chain · Powered by existing onchain protocols) left; Earn module right (sticky at ≥1024px). On mobile: headline, then module directly, then risk summary, then the funds path.
- Risk summary sits within the same viewport region as the module (under it on desktop, right after it on mobile).
- Section header pattern: eyebrow (col 1–6), H2 (col 1–7), muted paragraph (col 9–12).
- Whitespace is a feature: no more than one primary idea per viewport.
- Site map: `/` Earn · `/position` Position (deposit + withdraw) · `/how-it-works` · `/risks` (Risks & FAQ). Strategy details also open as a right-hand drawer from Earn and from Position.

## 6. Depth & Elevation

Flat by default. Depth comes from borders and tone, not shadow.
- Level 0: page `--bg`.
- Level 1: panels `--surface` + 1px `--line`.
- Level 2: sticky header (blur) and the Earn module on desktop: `0 1px 0 rgba(23,26,23,.04), 0 8px 24px -12px rgba(23,26,23,.12)` — the only soft shadow in the system.
- Level 3: drawers/dialogs: backdrop `rgba(23,26,23,.55)` + 6px blur, panel `--surface` with the Level-2 shadow.
- Inverted graphite sections are the contrast device (max one per page besides the footer).

## 7. Motion & Animation

Principles: sober, purposeful, short. It is a place where money is deposited: motion explains, never entertains. Easing everywhere: `cubic-bezier(.16, 1, .3, 1)` (ease-out expo, as observed on the reference). Durations: hover 180ms; state changes 250–450ms; entrances 600–850ms. Nothing loops except the tiny signal pulse on a live-data dot.

Observed on the reference (rhythm to reuse, not content): sticky header with a 2px scroll-progress line; hero headline clip-path reveal (`headline-reveal`, ~0.9s) with muted second line; content `rise` (opacity + translateY 17px, 0.85s) on scroll-in; rows `row-enter` (translateY 8px, 0.45s, staggered); tab settle (scale .96→1); line-draw `scaleX(0→1)` 1s; a "gate scan" clip-path fill on validation cells; dialogs `dialog-enter` (translateY 25px + scale .97); drawers slide from the right; dark inverted section in the middle of the page.

StockYield motion set (CSS first, zero new dependencies; one ~40-line `useInView`/`useScrollProgress` hook using IntersectionObserver and rAF):
1. **Opening (~1 s, skippable)** *(as built)*: header fades in; H1 line 1 clip-reveals, line 2 follows (100ms later); subtitle, chips and the Earn module rise in. It ends by itself after 1 s (measured 0.9 s). Any click / key / wheel / touch skips it at once, even before the page hydrates (the logic lives in a tiny inline script in `<head>`). Plays once per session (sessionStorage); off entirely under `prefers-reduced-motion`. The funds path is not part of the intro: it animates with scroll.
2. **Funds path (the site's image)**: inline SVG. Nodes left→right (top→bottom on mobile): *StockYield interface (logo mark, start)* · *Your wallet* · *Steakhouse USDG vault* · *Morpho lending markets* · *Borrowers*. The path draws with scroll (`stroke-dashoffset` bound to a `--p` CSS variable, 0→1 across the section); each node lights (fill + label) as `--p` passes it; small flat dots travel along the funds path; a dotted return line labelled "interest" flows back from Borrowers to the vault. The StockYield node connects to the wallet with a **dashed "prepares & simulates" line only**: the solid funds line goes wallet → vault directly, so the diagram never implies funds pass through StockYield. Partner names are text only, no logos. Reduced motion: fully drawn, static.
3. **Section reveals**: `rise` on scroll-in (IntersectionObserver, once), stagger 60ms for grouped cells.
4. **Micro-interactions**: button hover arrow nudge; input focus border draw; MAX chip press; stat numbers crossfade (opacity 200ms) when refreshed (no counting-up: no fake counters); step indicator segment fills when a step completes; Yield Check row sweep (see §4).
5. **Transaction states**: waiting = pulsing ring (1.6s); submitted = indeterminate 2px bar; confirmed = check draws (stroke, 400ms); failed = one 240ms horizontal nudge, then static.
6. **Easter egg (one, tiny, inert)**: triple-click the footer wordmark → for 3 seconds the dots on the funds path speed up and a caption fades in under the footer: "Interest is just patience, paid." Purely visual, touches no wallet, transaction or data code, absent for reduced-motion users.
- `prefers-reduced-motion: reduce`: all transforms/reveals off, opacity-only 150ms fades, no path animation, no easter egg, no loops.
- Performance: only `opacity` and `transform`/`clip-path`; no layout-thrashing; SVG under 12 KB.

## 8. Do's and Don'ts

Do
- Show "Unavailable" (with Retry) for any unknown value; skeleton while loading; never `0`/`$0.00` for unknown.
- Label TVL "Vault TVL" and APY "variable"; state which fees the net APY includes per the data source.
- Use tabular figures for every number; right-align number columns.
- Pair every status color with an icon shape and a word.
- Say precisely what happened: hash ≠ success; only `receipt.status === success` is "Confirmed".
- Keep StockYield / Steakhouse / Morpho / Robinhood Chain roles distinct in copy.
- Keep the primary CTA about Earn; keep SYELD out of the flow.
- Show a visible focus ring on every interactive element; 44×44px touch targets.

Don't
- No "Safe", "Verified", audit or partnership implications; no shield/tick icons that read as endorsement; no partner logos.
- No decorative checkmarks, fake counters, invented returns, sample numbers in production, or ornamental charts.
- No purple, neon, gradients, glow, 3D coins, AI images, stock photos.
- No "Deposited"/"Profit"/"Earned" without a reliable history; use "Position value".
- No unlimited allowance as a default; no auto-approve.
- No horizontal scroll at 320–430px in the deposit/withdraw path.
- No looping decorative motion; nothing animates while a signature is pending except the wait indicator.

## 9. Responsive Behavior

Breakpoints: 360 (min supported 320) · 640 · 768 · 1024 · 1280.
- <640: single column; nav collapses into a menu sheet, wallet button and network chip stay in the header; module directly under the headline; metric strip 2×2; funds path renders vertically; tables become stacked label/value rows; FAQ full width.
- 640–1023: two-column stat strip → four; module full width under hero; drawers 100% width.
- ≥1024: 7/5 split, module sticky under the header; drawers 480px.
- Touch: targets ≥44px; MAX and CTA reachable with one thumb; amount input keeps `inputmode="decimal"`; no hover-only information.
- Long values (addresses) shorten with copy button; full value in the details drawer, wrapped with `overflow-wrap:anywhere`.
- Dark mode: not in V1 (the inverted graphite sections are the only dark surfaces).
- Accessibility targets: Lighthouse accessibility > 90; keyboard-complete flow; `aria-live` for simulation/transaction status; skip-to-content link; correct landmarks.

## 10. Agent Prompt Guide

Quick tokens: bg `#F6F4EE`, surface `#FFFEFB`, ink `#171A17`, muted `#5F655C`, line `#D8D4C8`, signal `#2BD67B`, signal-ink `#0B6B3B`, danger `#A8231B`, warn `#7A4B00`. Font Geist / Geist Mono, tabular-nums on numbers. Radius 4/6px. Easing `cubic-bezier(.16,1,.3,1)`.

Prompts
- "Build the Earn module: header 'Earn with USDG', identity rows, metric strip (Net APY variable, Vault TVL, Liquidity reported by API), amount field with MAX, Yield Check with five rows and passed/failed/unavailable/checking states, step indicator, CTA whose label states the blocking reason."
- "Build the Yield Check row: label, plain value, state marker (icon shape + word), sweep transition on change, aria-live announcement. No decorative ticks."
- "Build the funds-path SVG: interface node dashed to wallet; solid path wallet → vault → markets → borrowers; interest return line; scroll-bound draw via --p; static under reduced motion; text names only."
- "Build the stat strip: four hairline cells, mono index, tabular value, skeleton and Unavailable+Retry states."
- Never add: partner logos, score/verified badges, invented data, decorative charts.

## 11. As built (implementation notes)
- Pages: `/` Earn · `/position` · `/how-it-works` · `/risks` (Risks & FAQ). Wallet, metrics, position, simulation and transaction state live in one provider (`components/stockyield/provider.tsx`) so they persist across pages.
- Motion is CSS-first with zero new dependencies: keyframes + IntersectionObserver `Reveal`, a scroll-progress CSS variable (`--p`) for the funds path, SMIL `animateMotion` for the travelling dots (hidden under reduced motion).
- Checked in Chromium and WebKit (Safari engine). Not checked in Firefox.
