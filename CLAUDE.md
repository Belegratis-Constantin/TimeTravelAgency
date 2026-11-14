# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Branch Policy

- **Never edit files directly on the `master` branch.** Always create a new branch before making any changes.
- **Always check if the branch fits the task if something is edited.** If not, notify the user and open a new branch for the task and commit the previous branch with a matching commit message.

## Commands

### Backend

```bash
# Run the API (from repo root)
dotnet run --project src/backend/TimeTravelAgency.Application/TimeTravelAgency.Application.csproj

# Run with hot reload
dotnet watch --project src/backend/TimeTravelAgency.Application/TimeTravelAgency.Application.csproj

# Run all tests
dotnet test TimeTravelAgency.sln

# Run a single test class
dotnet test tests/TimeTravelAgency.Test/TimeTravelAgency.Test.csproj --filter "FullyQualifiedName~TripTest"

# Restore dependencies
dotnet restore TimeTravelAgency.sln
```

Swagger UI is available at `http://localhost:5000/swagger` (or `https://localhost:5001/swagger`) after starting the API.

### Frontend (`src/frontend/time-travel-agency-web`)

```bash
npm install
npm start        # dev server at http://localhost:4200
npm run build    # production build
npm test         # Vitest unit tests (ng test)
```

## Architecture

### Backend (`src/backend/TimeTravelAgency.Application`)

Single-project ASP.NET Core 8 Web API — no separate layer assemblies. All layers live in one project:

- **`Model/`** — Domain entities with encapsulated state. Collection fields are private, exposed as `IReadOnlyCollection<T>`; all mutation methods are `internal` so only domain logic and EF Core can call them. `Trip` uses TPH inheritance with `CriticalTrip` as a subtype (`TripType` discriminator column).
- **`Infrastructure/TimeTravelAgencyContext.cs`** — EF Core `DbContext`. Lazy-loading proxies are only enabled in `OnConfiguring` when no options are passed; `Program.cs` passes options **without** proxies, so always `Include()` navigations you read in memory. `Initialize(recreate: bool)` drops/recreates the schema; `Seed()` populates data using Bogus. Both are called on every startup, so **all data is ephemeral**.
- **`Controller/`** — Thin controllers that accept `Cmd` objects, call either the `DbContext` directly or a `Service`, and return `Dto` projections via manual LINQ (no AutoMapper, no repository layer).
- **`Service/`** — `TripService` and `CustomerService` hold business logic that spans multiple entities (booking/cancellation, agent assignment, trip creation by manager). `ParadoxService` (DI-registered) adds paradoxes (only to trips under way), serves the paradox feed, lets assigned agents engage/resolve/fail paradoxes and auto-reclassifies a running trip as `CriticalTrip` at 3 **unresolved** paradoxes.
- **Trip lifecycle** — `TripStatus`: `Scheduled` → `Active` (under way: departure ≤ now < departure + `DurationMinutes`) → `Completed`; `Cancelled` is final. `Trip.StatusAt(now)` derives it from the schedule; `TripLifecycleService` (hosted, every 5 s) persists the transitions. Trip times are UTC (`DateInRealLife` has a UTC value converter).
- **Runtime paradoxes** — `ParadoxSimulationService` (hosted `BackgroundService`) adds a random paradox to a random trip that is under way (and has fewer than 4 open paradoxes) every `IntervalSeconds` (default 120). Defaults come from `appsettings.json` → `ParadoxSimulation` (`Enabled`, `IntervalSeconds`; override e.g. via env `ParadoxSimulation__IntervalSeconds=10`). `ParadoxSimulationState` (singleton) holds the runtime-adjustable settings exposed via `/api/Simulation`.
- **`Cmd/`** — Input models for POST/PATCH with data annotations.
- **`Dto/`** — Output shapes; projected inline in queries.
- **`DataAnnotation/`** — Custom validation attributes (`MinimumAgeAttribute`, `PhoneNumberAttribute`).

**Key domain rules:**
- A `Trip` requires a `LicensedAgent` and a `Manager`; an `Agent` is optional and assigned later.
- `Paradox` records are append-only on a `Trip` — there is no removal method. They only emerge on trips that are under way.
- Only a trip that is under way can become critical (3 unresolved paradoxes). Solving paradoxes keeps a trip from turning critical.
- **Paradox queue per trip** (`Trip.ParadoxQueue`, `Paradox.QueuePosition`): exactly one open paradox is worked on at a time — the head is `InProcess` (or `Escalated`, waiting for its dual lock), all others are `InQueue`. New paradoxes join the end; when the head is solved the next one moves up automatically (`Trip.RebalanceParadoxQueue()`). Agents can only engage/resolve/fail the head (else 409). The trip's manager reorders the queue; a paradox that loses its turn keeps `DualLockRequired` but loses its lock progress.
- Booking: only `Scheduled` trips, until departure; a customer's open trips must never overlap in real-life time (so at most one is `Active`). Cancellation until 1 h before departure.
- Customers never see paradoxes or the critical classification (enforced in the UI).
- Public API identifiers are always GUIDs, never integer PKs.
- `Agent.SpecialisationEpoch` is resolved during `SaveChanges` (not in the constructor).

**Database:** SQLite file at `src/backend/TimeTravelAgency.Application/TimeTravelAgencyTest.db`. Delete this file and restart to reset the state.

### Tests (`tests/TimeTravelAgency.Test`)

xUnit project referencing the application project directly. `DatabaseTests` creates a fresh SQLite DB per test class constructor (`EnsureDeleted` + `EnsureCreated`). Domain tests (`*Test.cs`) test model logic in isolation; `ParadoxSimulationTest` uses an in-memory SQLite connection per test. Controller tests (`*ControllerTest.cs`) send real HTTP requests to `http://localhost:5000` and therefore **require the API to be running** (on macOS port 5000 may be taken by AirPlay → 403).

### Frontend (`src/frontend/time-travel-agency-web`)

Angular 21 SPA — zoneless (no zone.js), standalone components with `ChangeDetectionStrategy.OnPush`, signal `input()`/`output()`, typed reactive forms, lazy-loaded routes. All reactive state **must** use `signal()` / `computed()`; plain class fields mutated in `subscribe()` callbacks are invisible to change detection.

**Architecture:**
```
src/app/
├── core/models/          # TS interfaces mirroring backend DTOs (trip, agent, manager, director, paradox)
├── core/services/        # Thin HTTP services, one per controller (Trip, Agent, Customer, Manager, Director, Paradox+Simulation)
├── core/http/            # toErrorMessage(): ProblemDetails / validation / network errors → one readable sentence
├── core/guards/          # roleGuard(...roles): wrong role → redirect to that role's home
├── state/
│   ├── app-state.service.ts    # role + selected identities (persisted in sessionStorage), ROLES with home routes
│   ├── agency.store.ts         # cached trips/agents/customers/managers/director; scopedTrips = "my trips" per role
│   ├── paradox-feed.store.ts   # polls GET /api/Paradox every 5 s, live per-trip paradoxes, toasts for new ones
│   ├── paradox-relevance.ts    # pure: which paradoxes concern the current identity
│   └── notification.service.ts # toasts
├── shared/components/    # header (role nav config), modal shell, page-header, stat-tiles, trip-card, paradox-list,
│                         # status-badge, form-field, empty-state, toast-stack, identity-picker-modal, tutorial-overlay
├── shared/forms/         # validators mirroring backend rules, shared address sub-form
├── shared/utils/         # status/labels, dates, bookingState() — pure functions
└── features/
    ├── landing/          # customer: departures grid with filters
    ├── era-timeline/     # customer: The Continuum visualisation (+ timeline-pin, timeline-scrubber, boarding-card)
    ├── customer-profile/ # customer: My Journeys + paradox alerts on booked trips
    ├── trip-detail/      # every role; trip-actions = role-specific panel (book+cancel / stabilise+report / assign / introduce paradox)
    ├── paradox-stabilizer/ # agent: "Phase Lock" mini-game (pure rules in phase-lock.ts) — win = Solved, lose = Escalated → dual lock (shared/utils/dual-lock.utils.ts)
    ├── agent-missions/   # agent: assigned trips, alerts, file field reports
    ├── dashboard/        # manager: KPIs, trips table, team
    ├── paradox-log/      # manager (edit own trips) + director (read-only): live paradox log
    ├── reports/          # manager + director: read-only field reports
    ├── director-dashboard/ # director: system KPIs, managers, agents
    ├── loom/             # time: visualisation + simulation-panel (auto-generation on/off, interval, manual trigger)
    └── modals/           # create-trip, assign-agent, create-agent, promote-agent, create-manager, join-traveller
```

**Rules of thumb:**
- Pages read data from `AgencyStore` / `ParadoxFeedStore` instead of fetching themselves; after a mutation call `agency.refresh()` (or `feed.refresh()`).
- Paradox data in the UI always comes from the feed (`feed.forTrip(guid)`), not from `TripDto.paradoxes`, so it updates live.
- Design system: see `src/frontend/time-travel-agency-web/DESIGN.md`. Light + dark theme (`ThemeService`, `data-theme` on `<html>`; `.theme-dark` keeps the tutorial overlay dark). Icons only via `app-icon`; a trip's closeness to critical is drawn with `app-integrity-gauge`.
- Styling: design tokens + utility classes + shared keyframes in `src/styles.css` (`.page`, `.card`, `.btn`, `.badge--*`, `.table`, …), component CSS for the rest — no inline `style=""` attributes. Data-driven colours are passed as CSS custom properties (e.g. `[style.--accent]="zone.accent"`) and tinted with `color-mix()`. The Continuum is split into `era-timeline.config.ts`, `timeline-pin`, `timeline-scrubber` and `boarding-card`.

**Role system:**
- Five roles: `customer`, `agent` (licensed **and** support agents), `manager`, `director`, `time` (Time Itself — no identity)
- Switching role opens `IdentityPickerModalComponent` (identities from `AgencyStore`); after selection the app navigates to the role's home (`ROLES` in app-state.service.ts). Customers may browse as guest.
- Navigation per role lives in one `NAV` map in `header.component.ts`; routes are protected with `roleGuard`.

**Key domain mappings:**
- `trip.licensedAgentId` / `trip.agentId` (int) → `AgentDto.id`; `agent.managerId` → `ManagerWithIdDto.id`
- A trip's destination era = the licensed agent's `specialisationEpochId`
- `trip.tripType` → `"Trip"` or `"CriticalTrip"` (TPH discriminator strings, not "Normal"/"Critical")
- `trip.tripStatus` → `"Scheduled"`, `"Active"` (under way), `"Completed"`, `"Cancelled"`; `trip.returnInRealLife` = departure + `durationMinutes`
- Booking rules for the UI live in `shared/utils/booking.utils.ts` (`bookingInfo()`), mirroring `Customer.AssignToTrip` / `CheckOutOfTrip`
- `paradoxStatus` / `paradoxType` → serialized as strings (e.g. `"InQueue"`, `"GrandFatherParadox"`)
- All public API identifiers are GUIDs

**API endpoints used (proxied via `/api/*` → `http://localhost:5000`):**
- `GET /api/Trip`, `GET /api/Trip/{guid}` — trips incl. customers, reports, reviews, `managerGuid`
- `POST /api/Trip/{tripGuid}/book/{customerGuid}` — book a trip (409: under way/over/cancelled, already booked, overlapping booking)
- `DELETE /api/Trip/{tripGuid}/book/{customerGuid}` — cancel a booking (until 1 h before departure)
- `POST /api/Trip/{tripGuid}/report/{agentGuid}` — file a field report (body: `{ header, content }`)
- `GET /api/Agent`, `POST /api/Agent` — agents (incl. LicensedAgents via TPH); create with `managerId`
- `GET /api/Customer`, `POST /api/Customer`
- `GET /api/Manager/with-id`, `POST /api/Manager`
- `POST /api/Manager/create-trip/{managerGuid}` — create trip (body incl. `durationMinutes`; must depart in the future; max. 5 open trips per manager → 409)
- `PATCH /api/Manager/assign-agent-to-trip/{managerGuid}/{agentGuid}/{tripGuid}` — assign support agent (already set → 409)
- `PATCH /api/Manager/make-agent-licensed/{managerGuid}/{agentGuid}` — grant licence
- `GET /api/Director`, `PATCH /api/Director/{directorGuid}/managers/{managerGuid}` — place manager under command
- `GET /api/Paradox` — paradox feed (newest first, with trip context)
- `POST /api/Paradox/trip/{tripGuid}` — add paradox to a trip under way (else 409); `PATCH /api/Paradox/{guid}/status?managerGuid=` — change status (`InProcess`/`Escalated` → moves it to the front of the queue, `InQueue` → to the end, `Solved` → next one moves up)
- `PATCH /api/Paradox/{guid}/queue?managerGuid=` — reorder the trip's paradox queue (body: `{ position }`, 0 = work on it now; solved → 409, other manager → 403). Feed items carry `queuePosition` (null once solved); `shared/utils/paradox-queue.utils.ts` sorts/labels the queue
- `POST /api/Paradox/{guid}/engage|resolve|fail/{agentGuid}` — field stabilisation by an agent on the trip (→ InProcess / Solved / Escalated; 403 if not on the trip; resolve/fail only while InProcess, else 409). Escalated paradoxes need a **dual lock**: licensed agent and support agent (`trip.agentId`) each `resolve` once; a `fail` by either breaks both locks; without a support agent `engage` returns 409; managers cannot set such a paradox to `Solved` (409)
- `GET|PUT /api/Simulation` — runtime generator state `{ enabled, intervalSeconds }`; `POST /api/Simulation/spawn` — paradox on a random trip under way
