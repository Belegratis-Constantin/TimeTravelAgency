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
npm test         # Karma unit tests
```

## Architecture

### Backend (`src/backend/TimeTravelAgency.Application`)

Single-project ASP.NET Core 8 Web API — no separate layer assemblies. All layers live in one project:

- **`Model/`** — Domain entities with encapsulated state. Collection fields are private, exposed as `IReadOnlyCollection<T>`; all mutation methods are `internal` so only domain logic and EF Core can call them. `Trip` uses TPH inheritance with `CriticalTrip` as a subtype (`TripType` discriminator column).
- **`Infrastructure/TimeTravelAgencyContext.cs`** — EF Core `DbContext` with lazy-loading proxies. `Initialize(recreate: bool)` drops/recreates the schema; `Seed()` populates data using Bogus. Both are called on every startup, so **all data is ephemeral**.
- **`Controller/`** — Thin controllers that accept `Cmd` objects, call either the `DbContext` directly or a `Service`, and return `Dto` projections via manual LINQ (no AutoMapper, no repository layer).
- **`Service/`** — `TripService` and `CustomerService` hold business logic that spans multiple entities (booking validation, agent assignment, trip creation by manager).
- **`Cmd/`** — Input models for POST/PATCH with data annotations.
- **`Dto/`** — Output shapes; projected inline in queries.
- **`DataAnnotation/`** — Custom validation attributes (`MinimumAgeAttribute`, `PhoneNumberAttribute`).

**Key domain rules:**
- A `Trip` requires a `LicensedAgent` and a `Manager`; an `Agent` is optional and assigned later.
- `Paradox` records are append-only on a `Trip` — there is no removal method.
- Public API identifiers are always GUIDs, never integer PKs.
- `Agent.SpecialisationEpoch` is resolved during `SaveChanges` (not in the constructor).

**Database:** SQLite file at `src/backend/TimeTravelAgency.Application/TimeTravelAgencyTest.db`. Delete this file and restart to reset the state.

### Tests (`tests/TimeTravelAgency.Test`)

xUnit project referencing the application project directly. `DatabaseTests` creates a fresh SQLite DB per test class constructor (`EnsureDeleted` + `EnsureCreated`). Domain tests (`*Test.cs`) test model logic in isolation; controller tests (`*ControllerTest.cs`) test HTTP layer behavior.

### Frontend (`src/frontend/time-travel-agency-web`)

Angular 21 fully implemented SPA — zoneless (no zone.js). All reactive state **must** use `signal()` / `computed()`; plain class fields mutated in `subscribe()` callbacks are invisible to change detection.

**Architecture:**
```
src/app/
├── core/models/          # TS interfaces mirroring backend DTOs
├── core/services/        # HTTP services (TripService, AgentService, CustomerService, ManagerService)
├── state/app-state.service.ts   # Signals-based global state (role, currentCustomer, currentAgent, currentManager)
├── shared/components/    # header, status-badge, identity-picker-modal
├── shared/utils/         # date.utils.ts, status.utils.ts (pure functions)
└── features/
    ├── landing/          # trip grid with filters; trip-card sub-component
    ├── trip-detail/      # booking-box, trip-paradoxes, trip-reviews, trip-staff, trip-timeline
    ├── dashboard/        # manager only — stats-panel, trips-table, agents-panel
    ├── paradox-log/      # manager only — read-only paradox list
    ├── reports/          # agent + manager — agent can file reports via form; read-only for manager
    └── modals/           # create-trip-modal, assign-agent-modal
```

**Role system:**
- Three roles: `customer`, `agent` (= LicensedAgent), `manager`
- Switching role opens `IdentityPickerModalComponent` — fetches real identities from DB
- Agent picker filters to `agentType === 'LicensedAgent'` only (not plain Agents)
- `AppStateService` holds `currentCustomer`, `currentAgent`, `currentManager` signals
- Role label in header shows the selected identity's name

**Key domain mappings:**
- `trip.licensedAgentId` (int) → maps to `AgentDto.id` where `agentType === 'LicensedAgent'`
- `trip.tripType` → `"Trip"` or `"CriticalTrip"` (TPH discriminator strings, not "Normal"/"Critical")
- `paradoxStatus` / `paradoxType` → serialized as strings (e.g. `"InQueue"`, `"GrandFatherParadox"`)
- All public API identifiers are GUIDs

**API endpoints (proxied via `/api/*` → `http://localhost:5000`):**
- `GET /api/Trip` — all trips with paradoxes, reports, reviews, customers
- `GET /api/Trip/{guid}` — single trip
- `POST /api/Trip/{tripGuid}/book/{customerGuid}` — book a trip
- `POST /api/Trip/{tripGuid}/report/{agentGuid}` — file a field report (body: `{ header, content }`)
- `GET /api/Agent` — all agents (includes LicensedAgents via TPH)
- `GET /api/Agent/{guid}` — single agent with their assigned trips
- `GET /api/Customer` — all customers
- `GET /api/Manager` — all managers
- `POST /api/Manager/{managerGuid}/trip` — create trip
- `PATCH /api/Manager/{managerGuid}/assign/{agentGuid}/trip/{tripGuid}` — assign licensed agent
