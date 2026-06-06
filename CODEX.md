# CODEX.md — We Dont Need No Sticken Points (WDNNSP)

## Project

We Dont Need No Sticken Points (WDNNSP) is a personal web app for evaluating credit card points, airline miles, cash fares, and award-flight options.

The source of truth is `PRD.md`.

Confirmed project references:

- Local repo: `/Users/johnfolstrom/Desktop/WDNNSP`
- GitHub repo: `https://github.com/cgradbad89/WDNNSP`
- Vercel production URL: `https://wdnnsp-e63d.vercel.app`
- Production dashboard URL: `https://wdnnsp-e63d.vercel.app/dashboard`

Before making changes, read:

1. `PRD.md`
2. This `CODEX.md`
3. Existing source files relevant to the requested task

## Core Rule

Do not overbuild.

WDNNSP is a personal decision-support tool, not a booking engine.

The app should help answer:

> Based on the points we have and the trip we want, what should we check first?

## Current MVP Priorities

Build in this order:

1. App foundation
2. Manual points wallet
3. Static transfer partner database
4. Dashboard summary
5. Trip search form
6. Mock cash flight provider
7. Mock award flight provider
8. Recommendation engine
9. Saved searches
10. Real API integrations later

Do not implement live Duffel, Amadeus, Seats.aero, airline scraping, account syncing, booking flows, or alerts unless explicitly requested.

## Non-Goals

Do not build:

- Flight booking
- Airline login storage
- Bank, credit card, or loyalty account syncing
- Airline website scraping
- Hotel points optimization
- Credit card recommendations
- Multi-city trip planning
- Role-based access control
- Admin dashboards
- Payment flows
- Subscription logic
- Browser extensions
- Mobile apps

## Initial Users and Access Model

Initial users are John and John’s dad.

The app may support more than one authenticated user, but it does not need role-based permissions for MVP.

Each user should only access their own wallet/search data unless a future task explicitly requests shared-wallet behavior.

## Workflow Rules

- **Branch**: Work directly on `main` unless the task explicitly says otherwise. If a branch is created automatically, merge it into `main` before pushing.
- **Build**: Run `npm run build` after all changes. On failure, fix and retry. Stop after 3 consecutive failures — output the full error log and make no further changes.
- **Test**: Run `npm test` after a passing build. If the project does not have tests configured yet, say that clearly in the required output report and do not invent a test result.
- **Commit**: Stage files by explicit path, for example `git add PRD.md CODEX.md src/...`. Never use `git add -A`.
- **No broken commits**: Do not commit if `npm run build` or `npm test` fail, unless the user explicitly asks for an uncommitted patch only.
- **Scope control**: Do not refactor unrelated files. Do not introduce large dependencies without justification.
- **Secrets**: Do not add API keys, tokens, credentials, or `.env` values to the repo.

## PRD Maintenance

After every session, update `PRD.md` if any of the following changed:

- New route or page added → MVP Scope, Technical Stack, Suggested Project Structure, or Implementation Phases as appropriate
- New or modified Firestore collection/subcollection → Core Data Model and Security/Privacy sections
- Domain invariant, calculation, or scoring rule changed → Recommendation Engine, Validation Rules, or Recommendation Rules sections
- New external service, provider, API, or env var added → Data Sources, Technical Stack, or Open Questions sections
- Backlog item completed, deferred, or discovered → Future Features, Implementation Phases, or Open Questions sections
- New sharp edge or gotcha found → add it to the relevant section or create a Known Sharp Edges section

Do **not** update `PRD.md` for pure bug fixes or UI-only changes unless they affect architecture, data model, calculations, external services, or product scope.

Commit `PRD.md` in the same commit as the feature work when it changes.

## Required Output Report

End every coding session with this exact format:

```txt
Files modified:   [path — one-line reason each]
Files created:    [path — one-line reason each]
Tests:            [new count] new / [total] total, or NOT CONFIGURED, or NOT RUN — [reason]
Build:            PASSED or FAILED (paste error if failed), or NOT RUN — [reason]
Deployment:       committed and pushed to main — yes / no
PRD.md updated:   yes — [sections changed] / no — [reason]
Unverifiable:     [items that can't be confirmed from code alone, or "none"]
Deferred:         [anything not completed, or "none"]
```

## Key Constraints

| Item | Value |
|---|---|
| Product name | We Dont Need No Sticken Points |
| Short name | WDNNSP |
| Initial users | John and John’s dad |
| Access model | Authenticated personal data; no role-based permissions for MVP |
| Live flight APIs | Not Phase 1; mock/manual providers first |
| Award data | Mock/manual first; Seats.aero-style provider abstraction later |
| Cash flight data | Mock/manual first; Duffel/Amadeus-style provider abstraction later |
| Booking | Out of scope |
| Account syncing | Out of scope |
| Airline scraping | Out of scope |
| Point transfer warning | Required wherever transfer recommendations appear |
| API keys/secrets | Never commit |
| Firestore rules | Do not modify without explicit task instruction |

## Tech Stack

Use:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui if available
- Firebase Auth
- Firestore
- Zod
- React Hook Form
- Vitest for core logic tests

If Firebase is not configured yet, create clean abstraction layers and TODOs rather than blocking the task.

## Architecture Principles

Keep business logic out of React components.

Prefer:

- `types/` for TypeScript types
- `data/` for static seed data
- `lib/` for pure helpers and provider abstractions
- `services/` for Firestore read/write logic once persistence exists
- `components/` for reusable UI
- `app/` for route-level pages

Provider integrations must be swappable.

Use mock providers before live providers.

Do not call third-party flight, cash fare, or award availability APIs directly from React components.

## Suggested Architecture Quick Reference

```txt
app/
  dashboard/
  wallet/
  search/
  results/
  settings/

components/
  dashboard/
  wallet/
  search/
  results/
  shared/

lib/
  airports/
  awardSearch/
  firebase/
  flightSearch/
  formatters/
  scoring/
  transferPartners/

data/
  airportGroups.ts
  airports.ts
  pointsPrograms.ts
  transferPartners.ts

types/
  airports.ts
  awards.ts
  flights.ts
  points.ts
  scoring.ts
  search.ts
  transferPartners.ts

services/
  pointsAccounts.ts
  savedSearches.ts
  searchResults.ts
```

## Required Warning Behavior

Any result involving point transfers must include this warning or equivalent:

> Confirm award availability directly with the airline before transferring points. Transfers are often irreversible, and award space can disappear.

Do not remove this warning.

Do not bury this warning in a tooltip. It should be visible on dashboards, result cards, and recommendation views where transfers are discussed.

## Data Rules

User-entered points balances are the source of truth for wallet data.

Transfer partner data should initially be static and typed.

Cash flight and award flight data should initially support mock/manual providers.

Live providers should be added behind interfaces only.

Do not assume cached award availability is bookable. Preserve freshness/confidence fields.

## Provider Integration Rules

Provider integrations should follow this pattern:

1. Define a provider interface.
2. Implement a mock provider.
3. Build UI and scoring against normalized internal types.
4. Add a live provider later without changing UI contracts.

Do not hardcode Duffel, Amadeus, Seats.aero, or any airline-specific API shape into UI components.

## Scoring and Calculation Rules

Core cents-per-point formula:

```ts
centsPerPoint = ((cashPriceUsd - taxesAndFeesUsd) / pointsRequired) * 100;
```

Rules:

- `pointsRequired` must be greater than zero.
- `taxesAndFeesUsd` must be zero or greater.
- Use cash comparison only when the cash benchmark is relevant and available.
- Do not rank by cents per point alone.
- Include points sufficiency, transfer simplicity, convenience, fees, and availability confidence.
- Prefer pure helper functions for all calculations.

## Testing Expectations

Add or preserve tests for:

- Transfer partner lookup
- Airport group expansion
- Points balance totals
- Cents-per-point calculation
- Points sufficiency calculation
- Recommendation scoring
- Search validation
- Saved search validation

Do not skip tests for scoring or points calculations once the test framework exists.

If no test framework exists yet, note that in the required output report and avoid pretending tests passed.

## Code Style

Use explicit TypeScript types.

Avoid `any` unless there is a clear reason.

Keep files small and focused.

Prefer pure helper functions for calculations.

Keep UI components simple.

Use clear names.

Do not hide important business logic inside page components.

Use TODO comments for future provider work, but keep them specific.

## UI Principles

The app should feel like a practical dashboard, not a travel blog.

Prioritize:

- Clear cards
- Strong labels
- Useful empty states
- Plain-language explanations
- Obvious next actions
- Visible transfer warnings
- Confidence/freshness labels for award data

Do not add dense travel-hacking jargon without explanation.

## Security and Privacy Rules

Do not store:

- Airline passwords
- Credit card logins
- Bank credentials
- Passport numbers
- Known traveler numbers
- Payment methods
- API keys in source code

Stored data should be limited to:

- User profile
- Manual points balances
- Saved searches
- Search results
- Recommendation history, if explicitly requested later

## Definition of Done

A task is done when:

1. The requested behavior works.
2. The app compiles.
3. Relevant tests pass or are added, if tests are configured.
4. Business logic is typed and reusable.
5. The UI has basic empty states.
6. The transfer warning remains present where needed.
7. No out-of-scope features were added.
8. `PRD.md` is updated if product scope, data model, architecture, services, or calculations changed.
9. The required output report is provided.

## First Build Target

The first implementation target is:

> App shell + manual points wallet + static transfer partner data + dashboard summary.

Do not build live flight search in the first task.
