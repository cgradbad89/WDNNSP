# PRD.md — We Dont Need No Sticken Points (WDNNSP)

## 1. Product Overview

**Product name:** We Dont Need No Sticken Points  
**Short name:** WDNNSP

WDNNSP is a personal web app for evaluating how to use credit card points, airline miles, and cash to book flights. The app allows a small set of users — initially John and his dad — to manually enter their points and miles balances, search desired flight routes, compare cash prices against award redemptions, and identify the best booking path.

The product is not intended to be a full booking engine. It is a decision-support tool that helps answer:

> Given the points and miles we have, what flight options should we investigate first, and which redemption path gives us the best value?

The app should be clear, practical, and opinionated. It should explain why a redemption is good or bad, not just display raw flight data.

---

## 2. Primary Users

### Initial users

- John
- John’s dad

### User model

The app may support more than one account, but it does **not** need role-based permissions for MVP.

All authenticated users can:

- Add and edit their own points balances
- Search flights
- View results
- Save searches
- View recommendations

There is no need for:

- Admin roles
- Organization-level permissions
- Shared team workspaces
- Complex authorization rules

MVP access can be simple authenticated access.

---

## 3. Product Goals

The app should help users:

1. Track manual credit card points and airline miles balances.
2. Understand which airline programs their credit card points can transfer to.
3. Search desired flights by origin, destination, dates, cabin, and passengers.
4. Compare cash prices against award options.
5. Calculate cents-per-point value.
6. Identify whether the user has enough points for a redemption.
7. Recommend the best booking path.
8. Warn users to verify award availability before transferring points.
9. Save searches and eventually support alerts.

---

## 4. Non-Goals

The MVP should **not** attempt to do the following:

1. Book flights directly.
2. Sync bank, credit card, or airline loyalty accounts.
3. Store airline login credentials.
4. Scrape airline websites.
5. Guarantee real-time award availability.
6. Support hotels, rental cars, cruises, or vacation packages.
7. Support complex multi-city itineraries.
8. Support business/team permissions.
9. Recommend new credit cards.
10. Optimize for manufactured spending or churn strategies.

The first version should stay focused on:

> “Here are the best flight redemption options to investigate based on your points.”

---

## 5. MVP Scope

### Must-have features

#### 5.1 Authentication

Users should be able to sign in and access their own data.

MVP options:

- Firebase Auth
- Google Sign-In
- Email/password if simpler

Authentication should be implemented cleanly, but permissions can remain simple.

---

#### 5.2 Points Wallet

Users can manually enter and manage balances.

Supported account types:

- Flexible credit card points
- Airline miles
- Hotel points, optional later

Initial flexible currencies:

- Chase Ultimate Rewards
- American Express Membership Rewards
- Capital One Miles
- Citi ThankYou Points
- Bilt Rewards

Initial airline programs:

- United MileagePlus
- Air Canada Aeroplan
- Virgin Atlantic Flying Club
- Air France-KLM Flying Blue
- British Airways Avios
- Iberia Avios
- Qatar Avios
- American Airlines AAdvantage
- Alaska Mileage Plan
- Emirates Skywards
- Singapore KrisFlyer
- Turkish Miles&Smiles
- Avianca LifeMiles
- ANA Mileage Club

Wallet features:

- Add account
- Edit balance
- Delete account
- View last updated date
- Categorize as flexible currency or airline program
- Show total flexible points
- Show total airline miles

---

#### 5.3 Transfer Partner Database

The app should maintain a typed transfer partner table.

Each transfer partner should include:

- Source program
- Destination program
- Transfer ratio
- Estimated transfer time
- Notes
- Whether it is currently active
- Optional transfer bonus information in future versions

Example:

```ts
type TransferPartner = {
  id: string;
  fromProgram: string;
  toProgram: string;
  transferRatio: number;
  estimatedTransferTime: "instant" | "same_day" | "one_to_two_days" | "three_plus_days" | "unknown";
  isActive: boolean;
  notes?: string;
};
```

The transfer partner database can be static TypeScript/JSON for MVP.

---

#### 5.4 Dashboard

The dashboard should summarize the user’s current points position.

Dashboard should show:

- Total flexible points
- Total airline miles
- Points accounts
- Top transfer opportunities
- Recent searches
- Saved searches
- Important warning about transfers

Transfer warning:

> Confirm award availability directly with the airline before transferring points. Transfers are often irreversible, and award space can disappear.

---

#### 5.5 Trip Search

Users should be able to enter a desired flight search.

Target flow: the search page runs a trip search. Saving should happen from the
results page after the user sees whether the comparison is useful.

Fields:

- Origin airport or airport group
- Destination airport or airport group
- Departure date
- Return date, optional
- One-way or round-trip
- Number of passengers
- Cabin
- Max stops
- Flexible date range, optional
- Nearby airport toggle, later

Cabins:

- Economy
- Premium economy
- Business
- First

Airport groups should be supported.

Examples:

```ts
WAS = DCA, IAD, BWI
NYC = JFK, LGA, EWR
TYO = HND, NRT
LON = LHR, LGW, LCY, STN, LTN
PAR = CDG, ORY
```

MVP can support a small curated list of airport groups.

---

#### 5.6 Cash Flight Benchmark

The app should retrieve or store cash flight prices so award redemptions can be evaluated against real prices.

The cash benchmark is needed for cents-per-point calculations.

MVP approach:

- Integrate one cash flight API if available.
- If live API is not ready, support mock data or manually entered cash prices.
- Keep the cash flight data model separate from award flight data.
- Do not let cash API setup block Phase 1 or Phase 2.

Potential future provider: Duffel. Duffel documents flight search through offer requests, where an offer request describes passengers and itinerary slices and returns flight offers from airlines. This is a good fit for a future cash benchmark provider, but live provider integration is not part of Phase 1.

Cash flight result fields:

```ts
type CashFlightOption = {
  id: string;
  source: "duffel" | "amadeus" | "manual" | "mock";
  airline: string;
  flightNumbers: string[];
  origin: string;
  destination: string;
  departureDateTime: string;
  arrivalDateTime: string;
  durationMinutes: number;
  stops: number;
  cabin: Cabin;
  cashPriceUsd: number;
  bookingUrl?: string;
};
```

---

#### 5.7 Award Flight Availability

The app should ingest award availability from one or more award data sources.

MVP preferred approach:

- Use a dedicated award availability source such as Seats.aero if API access is available.
- If no award API is available at first, support mock/manual award data so the app logic can still be built and tested.
- Do not let award API setup block the wallet, search form, scoring, or mock-result experience.

Seats.aero is a candidate because its developer documentation describes APIs for award travel data and a bulk availability endpoint for retrieving availability by mileage program, cabin, and date range. Actual API access, limits, cost, and coverage need to be confirmed separately before integration.

Award result fields:

```ts
type AwardFlightOption = {
  id: string;
  source: "seats_aero" | "manual" | "mock" | "other";
  airlineProgram: string;
  operatingAirline?: string;
  origin: string;
  destination: string;
  departureDateTime: string;
  arrivalDateTime: string;
  cabin: Cabin;
  pointsRequired: number;
  taxesAndFeesUsd: number;
  transferSources: string[];
  cashComparableUsd?: number;
  centsPerPoint?: number;
  stops: number;
  durationMinutes?: number;
  confidence: "high" | "medium" | "low";
  bookingUrl?: string;
  lastCheckedAt?: string;
};
```

The app must clearly label confidence/freshness of award availability.

---

#### 5.8 Recommendation Engine

The app should rank flight options based on practical usefulness.

The ranking should not be based only on cents per point.

Scoring factors:

1. Cents per point
2. Whether the user has enough points
3. Transfer simplicity
4. Taxes and fees
5. Stops and duration
6. Cabin
7. Availability confidence
8. Cash alternative value

Core cents-per-point formula:

```ts
centsPerPoint = ((cashPriceUsd - taxesAndFeesUsd) / pointsRequired) * 100
```

Example score model:

```ts
type RecommendationScore = {
  optionId: string;
  valueScore: number;
  pointsFitScore: number;
  convenienceScore: number;
  availabilityConfidenceScore: number;
  transferSimplicityScore: number;
  totalScore: number;
  explanation: string[];
  warnings: string[];
};
```

Initial weighted score:

```ts
totalScore =
  valueScore * 0.35 +
  pointsFitScore * 0.20 +
  convenienceScore * 0.20 +
  availabilityConfidenceScore * 0.15 +
  transferSimplicityScore * 0.10
```

This can be tuned over time.

---

#### 5.9 Results Page

The results page should show ranked recommendations.

Each result card should include:

- Recommended booking program
- Transfer source
- Transfer-required indicators when a flexible-points transfer is needed
- Points required
- Taxes and fees
- Cash comparison
- Cents-per-point value
- Stops
- Stop airport and layover summary when route details are available
- Cabin
- Duration
- Confidence/freshness
- Booking/verification link if available
- Explanation
- Warnings

Example card language:

> Best Overall: Transfer Chase Ultimate Rewards points to Air Canada Aeroplan. This option has strong value, reasonable taxes, and you have enough transferable points. Confirm availability directly with Aeroplan before transferring.

Results should include labels such as:

- Best Overall
- Best Value
- Lowest Points
- Lowest Fees
- Fastest Itinerary
- Best Cash Alternative
- Not Recommended

---

#### 5.10 Saved Searches

Users should be able to save useful trip searches from the results page after
reviewing mock or real comparison results.

Saved search fields:

```ts
type SavedSearch = {
  id: string;
  userId: string;
  name: string;
  originCodes: string[];
  destinationCodes: string[];
  departDate: string;
  returnDate?: string;
  flexibleDays?: number;
  passengers: number;
  cabin: Cabin;
  maxStops?: number;
  createdAt: string;
  updatedAt: string;
};
```

Alerts can be added later.

---

## 6. Future Features

### Version 2

- Award alerts
- Email notifications
- Flexible date calendar
- Transfer bonus support
- Nearby airport expansion
- Repositioning flight suggestions
- Multiple award data sources
- Better airport autocomplete
- User-defined minimum cents-per-point thresholds

### Version 3

- Credit card recommendation logic
- Hotel points
- Airline account balance sync
- Family/shared wallet
- Advanced routing
- Multi-city trips
- Historical redemption tracking
- Browser extension or mobile companion

---

## 7. Data Sources

### 7.1 User-entered data

User-entered balances are the source of truth for wallet data.

MVP should not attempt account syncing.

---

### 7.2 Transfer partner data

Transfer partner data should initially be curated in static TypeScript/JSON.

Each partner should include:

- Program names
- Ratio
- Estimated transfer time
- Notes
- Active/inactive status

This data should be easy to update.

---

### 7.3 Cash flight data

Cash flight data should come from a paid flight search provider or manual/mock data during development.

Potential providers:

- Duffel
- Amadeus
- Other flight API providers

The app should abstract the provider behind a service layer so the provider can be swapped later.

---

### 7.4 Award availability data

Award availability should come from a dedicated award data provider where possible.

Potential provider:

- Seats.aero API

The app should also support manual/mock award data during development.

The app must not rely on airline scraping for MVP.

---

### 7.5 Airport data

Airport and airport group data can be static.

Data should include:

- Airport code
- Airport name
- City
- Country
- Time zone
- Latitude
- Longitude
- Airport group membership where relevant

---

## 8. Core Data Model

### 8.1 Cabin

```ts
type Cabin = "economy" | "premium_economy" | "business" | "first";
```

---

### 8.2 PointsProgram

```ts
type PointsProgram = {
  id: string;
  name: string;
  type: "credit_card" | "airline" | "hotel";
  currencyName: string;
};
```

---

### 8.3 PointsAccount

```ts
type PointsAccount = {
  id: string;
  userId: string;
  programId: string;
  programName: string;
  programType: "credit_card" | "airline" | "hotel";
  balance: number;
  lastUpdatedAt: string;
  notes?: string;
};
```

---

### 8.4 TripSearch

```ts
type TripSearch = {
  id: string;
  userId: string;
  originCodes: string[];
  destinationCodes: string[];
  departDate: string;
  returnDate?: string;
  tripType: "one_way" | "round_trip";
  flexibleDays?: number;
  passengers: number;
  cabin: Cabin;
  maxStops?: number;
  createdAt: string;
};
```

---

### 8.5 SearchResultSet

```ts
type SearchResultSet = {
  id: string;
  userId: string;
  searchId: string;
  cashOptions: CashFlightOption[];
  awardOptions: AwardFlightOption[];
  recommendations: RecommendationScore[];
  createdAt: string;
};
```

---

## 9. UX Principles

The app should be:

1. **Plainspoken**  
   Avoid travel-hacker jargon when possible.

2. **Action-oriented**  
   Tell the user what to do next.

3. **Transparent**  
   Explain why something is recommended.

4. **Cautious about transfers**  
   Repeatedly warn that points transfers may be irreversible.

5. **Personalized**  
   Recommendations should account for the user’s actual balances.

6. **Not overconfident**  
   Award availability should include freshness and confidence labels.

---

## 10. Key User Flows

### 10.1 Add points balance

1. User opens Wallet.
2. User clicks “Add Account.”
3. User selects program.
4. User enters balance.
5. User saves.
6. Dashboard updates total balances and transfer possibilities.

---

### 10.2 Search for a trip

1. User opens Search.
2. User enters origin and destination.
3. User selects dates.
4. User selects cabin and passengers.
5. User runs search.
6. App retrieves cash benchmark and award options.
7. App ranks results.
8. User reviews recommendation cards.

---

### 10.3 Evaluate a recommendation

1. User opens a result.
2. App shows required points and fees.
3. App shows transfer source.
4. App shows cents-per-point value.
5. App explains pros and cons.
6. App warns user to confirm award space before transferring.
7. User clicks external booking/verification link if available.

---

### 10.4 Save a search

1. User completes search.
2. User clicks “Save Search.”
3. User names the search.
4. Search appears on dashboard.
5. Future versions can use saved searches for alerts.

---

## 11. Technical Stack

Preferred stack:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Firebase Auth
- Firestore
- Vercel hosting
- Zod for validation
- React Hook Form for forms

---

## 12. Suggested Project Structure

```txt
src/
  app/
    dashboard/
    wallet/
    search/
    results/
    settings/
  components/
    layout/
    wallet/
    search/
    results/
    dashboard/
    shared/
  lib/
    firebase/
    airports/
    points/
    transferPartners/
    wallet/
    scoring/
    flightSearch/
    awardSearch/
    formatters/
  types/
    points.ts
    transferPartners.ts
    airports.ts
    search.ts
    flights.ts
    awards.ts
    scoring.ts
  data/
    airports.ts
    airportGroups.ts
    mockPointsAccounts.ts
    pointsPrograms.ts
    transferPartners.ts
```

Initial route inventory:

- `/` redirects to `/dashboard`
- `/dashboard` summarizes browser-persistent wallet totals, transfer opportunities, and required transfer warning
- `/wallet` supports browser-persistent manual account add/edit/delete with empty-state-ready structure
- `/search` supports browser-persistent saved trip searches with airport group expansion, inline validation, and delete actions
- `/design/search` keeps the design-only run-search-first prototype as a reference
- `/design/results` keeps the design-only results, edit-search, route-detail, and save-search prototype as a reference
- `/results` shows deterministic mock cash and award results ranked by the initial recommendation engine
- `/settings` shows the settings placeholder

---

## 13. Implementation Phases

### Phase 1 — App foundation and wallet

Build:

- Auth
- App shell
- Navigation
- Dashboard
- Wallet
- Points account CRUD
- Static transfer partner data
- Basic helper functions

Exit criteria:

- User can sign in.
- User can add/edit/delete points balances.
- Dashboard summarizes points balances.
- App shows transfer options for flexible currencies.

Current implementation status as of June 6, 2026:

- Completed: app shell, navigation, dashboard route, wallet route, core TypeScript domain types, static points program data, static transfer partner data, airport group data, points total helpers, transfer partner lookup helpers, airport group expansion helpers, browser-persistent localStorage wallet add/edit/delete CRUD, and dashboard summaries based on the browser wallet.
- Covered by unit tests: points balance totals, flexible and airline account filtering, transfer partner lookup, wallet-based transfer option deduping, airport group expansion, and browser wallet storage CRUD helpers.
- Remaining: authentication, Firebase persistence, production user-specific balances, cross-tab wallet sync, and live provider integrations.

---

### Phase 2 — Trip search form

Build:

- Search route
- Airport autocomplete
- Airport groups
- Trip type
- Cabin selection
- Passenger count
- Max stops
- Saved search model

Exit criteria:

- User can create a trip search.
- App can expand airport groups into airport codes.
- Search can be saved.

Current implementation status as of June 6, 2026:

- Completed: approved design prototype route, revised run-search-first design reference, browser-persistent saved-search localStorage helpers, browser-persistent active-search localStorage helpers, trip search validation helpers, real `/search` trip search form, active-search creation on submit, `/results` navigation after valid search, airport group expansion during validation, inline validation errors, result-page save-search action, and compact dashboard saved-search summary.
- Covered by unit tests: saved-search and active-search localStorage no-window and malformed JSON behavior, creation timestamps and IDs, update/delete helpers, required search fields, round-trip return date rules, return date ordering, group-expanded origin/destination conflicts, passenger minimums, cabin validation, active-search selection priority, and non-negative max stops/flexible days.
- Remaining: airport autocomplete beyond curated group datalist, alerts, Firebase persistence, authenticated user ownership, and live provider integrations.

---

### Phase 3 — Cash benchmark

Build:

- Cash flight provider abstraction
- Mock provider first
- Real provider later
- Normalized cash flight options
- Cash result cards

Exit criteria:

- App can show cash benchmark options for a route.
- App can use cash price in value calculations.

Current implementation status as of June 6, 2026:

- Completed: deterministic mock cash benchmark generation for the real `/results` route, driven by the active search, first saved search, or a Tokyo Spring Trip fallback, with mock route detail data for cash benchmark cards.
- Covered by unit tests: cash benchmark use in cents-per-point calculations through the scoring helpers, active-search selection priority, and route-detail duration/summary formatting.
- Remaining: cash flight provider abstraction, multiple cash options, manual cash entry, Duffel/Amadeus-style live provider integration, and production freshness metadata.

---

### Phase 4 — Award availability

Build:

- Award provider abstraction
- Mock provider first
- Real provider later
- Normalized award options
- Match award programs to transfer partners
- Match award options to user balances

Exit criteria:

- App can show award options.
- App can tell whether the user can book using existing or transferable points.

Current implementation status as of June 6, 2026:

- Completed: deterministic mock award options for the real `/results` route, including Tokyo-like Air Canada Aeroplan, Virgin Atlantic Flying Club, and United MileagePlus examples, generic route fallback options, route detail data, transfer-required display details, and mock result filters.
- Covered by unit tests: award option scoring against wallet balances and transfer partners, transfer-path display derivation, and mock result filter behavior.
- Remaining: award provider abstraction, manual award entry, real award availability providers, production freshness handling, and authenticated persistence.

---

### Phase 5 — Recommendation engine

Build:

- Cents-per-point calculator
- Weighted scoring
- Recommendation labels
- Explanation builder
- Warnings builder

Exit criteria:

- App ranks cash and award options.
- App explains why each recommendation is good or bad.
- App clearly warns users before transfers.

Current implementation status as of June 6, 2026:

- Completed: cents-per-point calculator, initial weighted award scoring, recommendation labels, explanation/warning builders, real `/results` UI that reads active search first, result-page search editing/saving, working mock filters, route detail modals, and required transfer warning display.
- Covered by unit tests: cents-per-point happy path, taxes/fees subtraction, invalid point and low-value guards, ranking, insufficient-points labeling, confidence scoring, stop-count scoring, label assignment, transfer-path filtering, and required transfer warning behavior.
- Remaining: scoring tuning with real-world examples, cash-versus-award recommendation thresholds, provider freshness weighting, and live search execution.

---

### Phase 6 — Saved searches and alerts

Build:

- Saved searches page
- Optional scheduled refresh
- Optional email notifications
- Alert criteria

Exit criteria:

- User can save search criteria.
- Future version can notify user when matching award options appear.

---

## 14. Validation Rules

### Points wallet

- Balance must be zero or greater.
- Program name is required.
- Program type is required.
- User can only edit their own balances.

### Trip search

- Search name is required for saved searches.
- Origin is required.
- Destination is required.
- Origin and destination cannot be identical.
- Departure date is required.
- Return date is required for round-trip searches.
- Return date cannot be before departure date.
- Passengers must be at least 1.
- Cabin is required.
- Max stops, if provided, must be zero or greater.
- Flexible days, if provided, must be zero or greater.

### Award options

- Points required must be greater than zero.
- Taxes and fees must be zero or greater.
- Cabin is required.
- Program is required.
- Confidence is required.

---

## 15. Recommendation Rules

The app should produce human-readable explanations.

Example explanations:

- “You have enough Chase points to transfer to Air Canada Aeroplan.”
- “This redemption beats the cash price by a wide margin.”
- “Taxes and fees are high, so this may not be worth it.”
- “This option has low confidence because availability may be stale.”
- “You do not currently have enough points for this option.”
- “This cash fare is cheap enough that paying cash may be better than using points.”

The app should produce warnings when needed:

- “Confirm availability directly with the airline before transferring points.”
- “Transfers are often irreversible.”
- “Award availability can disappear quickly.”
- “Taxes and fees may change before booking.”
- “This result may be cached.”

---

## 16. Design Requirements

The app should feel like a practical dashboard, not a travel blog.

General UI direction:

- Clean dashboard
- Clear cards
- Strong labels
- Minimal clutter
- Useful empty states
- Plain-language explanations
- Obvious next actions

Important UI components:

- Points balance card
- Transfer partner table
- Trip search form
- Cash flight card
- Award flight card
- Recommendation badge
- Cents-per-point badge
- Warning banner
- Saved search card

---

## 17. Security and Privacy

The app should avoid storing sensitive travel credentials.

MVP should not store:

- Airline passwords
- Credit card logins
- Bank credentials
- Passport numbers
- Known traveler numbers
- Payment methods

Stored data should be limited to:

- User profile
- Manual points balances
- Saved searches
- Search results
- Recommendation history, optional

---

## 18. Testing Expectations

Core logic should be testable.

Recommended test coverage:

- Transfer partner lookup
- Airport group expansion
- Points balance totals
- Cents-per-point calculation
- Points sufficiency calculation
- Recommendation scoring
- Trip search validation
- Saved search validation

Example test cases:

1. Chase points can transfer to United if configured.
2. WAS expands to DCA, IAD, and BWI.
3. Cents-per-point calculation subtracts taxes and fees.
4. User with 100,000 Chase points can book a 75,000 Aeroplan award if Chase transfers to Aeroplan.
5. User with 50,000 points cannot book a 75,000-point award.
6. Round-trip search requires return date.
7. Same origin and destination should fail validation.

---

## 19. Open Questions

These do not block Phase 1.

1. Which cash flight API should be used first?
2. Is Seats.aero API access available and affordable?
3. Should John and his dad share a combined wallet view?
4. Should searches support flexible date grids in MVP or v2?
5. Should the app support transfer bonuses in v1 or v2?
6. Should alerts be email-only or also in-app?
7. Should the app store search result history?

---

## 20. MVP Success Criteria

The MVP is successful when:

1. John and his dad can enter points balances.
2. The app shows which airline programs those points can transfer to.
3. A trip search can be created.
4. The app can compare at least mock cash and award options.
5. The app calculates cents-per-point value.
6. The app ranks redemption options.
7. The app explains why one option is better than another.
8. The app warns users before transferring points.
9. The app is structured so real cash and award APIs can be added later.

---

## 21. Product Principle

WDNNSP should not try to be a perfect flight-booking platform.

It should be a personal decision engine:

> “Based on the points we have and the trip we want, what should we check first?”
