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

Angular 21 scaffold — only the app shell exists; no feature components have been built yet.
