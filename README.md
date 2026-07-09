# TimeTravelAgency

TimeTravelAgency is a full-stack sample project for managing fictional time-travel operations. It combines a .NET 10 Web API backend, an Angular frontend, and xUnit tests.

The domain models trips, agents, licensed support roles, customers, paradoxes, historical events, and reports. It is useful as a learning and reference project for layered backend design, Entity Framework Core modeling, and REST API development.

## Table of Contents

- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Scripts](#scripts)
- [Run the Backend API](#run-the-backend-api)
- [Run the Frontend](#run-the-frontend)
- [Testing](#testing)
- [API Overview](#api-overview)
- [Database and Seed Data](#database-and-seed-data)
- [UML Diagram](#uml-diagram)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Roadmap Ideas](#roadmap-ideas)
- [License](#license)

## Key Features

- Trip lifecycle management with normal and critical trip variants.
- Agent and manager workflows, including assignment logic.
- Customer registration, booking operations, and review handling.
- Paradox tracking as part of trip execution outcomes.
- Rich seeded historical data (epochs and events) for temporal context.
- Swagger/OpenAPI UI for API exploration.
- Unit tests with xUnit.

## Architecture

This repository currently contains:

- **Backend:** ASP.NET Core Web API (`net10.0`) with Entity Framework Core and SQLite.
- **Frontend:** Angular (`@angular/core` 21.x) app scaffold in a dedicated subfolder.
- **Tests:** xUnit project referencing the backend application project.

The backend starts as an executable app and configures controllers, Swagger, and a SQLite database context. On startup, it ensures database creation and seeds sample data.

## Tech Stack

- **Backend:** C#, ASP.NET Core, Entity Framework Core 10, SQLite, Swashbuckle
- **Data seeding:** Bogus
- **Frontend:** Angular 21, TypeScript 5.9, RxJS
- **Testing:** xUnit, Microsoft.NET.Test.Sdk, coverlet.collector
- **Solution tooling:** Visual Studio / Rider / `dotnet` CLI

## Repository Structure

```text
TimeTravelAgency/
|- scripts/
|  |- setup.sh            # Install all dependencies
|  |- start.sh            # Start backend + frontend together
|  |- start-backend.sh    # Start backend with hot-reload only
|  |- start-frontend.sh   # Start Angular dev server only
|  |- test.sh             # Run all test suites
|  |- build.sh            # Production build (backend + frontend)
|  |- reset-db.sh         # Delete SQLite DB (forces reseed on next start)
|- src/
|  |- backend/
|  |  |- TimeTravelAgency.Application/    # .NET 10 Web API + EF Core domain
|  |- frontend/
|     |- time-travel-agency-web/          # Angular application
|- tests/
|  |- TimeTravelAgency.Test/              # xUnit tests
|- TimeTravelAgency.sln
```

## Prerequisites

Install the following tools:

- **.NET SDK 10.0+**
- **Node.js 20+** (recommended for Angular 21)
- **npm** (project currently specifies `npm@11.3.0`)

Optional:

- Visual Studio 2022 / JetBrains Rider / VS Code

## Quick Start

### 1) Clone the repository

```bash
# HTTPS
git clone https://github.com/Belegratis-Constantin/TimeTravelAgency.git

# SSH
git clone git@github.com:Belegratis-Constantin/TimeTravelAgency.git

cd TimeTravelAgency
```

### 2) Install all dependencies

```bash
./scripts/setup.sh
```

This checks for .NET SDK and Node.js, restores NuGet packages, and runs `npm install` for the frontend.

### 3) Start the full project

```bash
./scripts/start.sh
```

This starts both the backend and the Angular dev server in a single terminal. Press `Ctrl+C` to stop both.

| Service  | URL                          |
|----------|------------------------------|
| Backend  | http://localhost:5000/swagger |
| Frontend | http://localhost:4200         |

## Scripts

All scripts live in the `scripts/` directory and are executable bash scripts.

| Script              | What it does                                              |
|---------------------|-----------------------------------------------------------|
| `setup.sh`          | Check prerequisites, restore .NET packages, `npm install` |
| `start.sh`          | Start backend + frontend together (Ctrl+C stops both)     |
| `start-backend.sh`  | Start backend only, with hot-reload (`dotnet watch`)      |
| `start-frontend.sh` | Start Angular dev server only                             |
| `test.sh`           | Run all test suites; `--backend` or `--frontend` flags    |
| `build.sh`          | Release build (backend) + production build (frontend)     |
| `reset-db.sh`       | Delete the SQLite DB — next API start recreates + reseeds |

## Run the Backend API

```bash
# With hot-reload (recommended for development)
./scripts/start-backend.sh

# Plain run (no file watching)
dotnet run --project src/backend/TimeTravelAgency.Application/TimeTravelAgency.Application.csproj
```

Swagger UI is available at `http://localhost:5000/swagger` once the API is running.

## Run the Frontend

```bash
./scripts/start-frontend.sh
```

Or manually from `src/frontend/time-travel-agency-web`:

```bash
npm start        # dev server at http://localhost:4200
npm run build    # production build
```

## Testing

```bash
# Run all suites
./scripts/test.sh

# Backend only
./scripts/test.sh --backend

# Frontend only
./scripts/test.sh --frontend
```

Or manually:

```bash
dotnet test TimeTravelAgency.sln
cd src/frontend/time-travel-agency-web && npm test
```

## API Overview

Base route pattern: `api/[controller]`

Implemented controller groups include:

- `api/Agent`
  - `GET /api/Agent`
  - `GET /api/Agent/{guid}`
  - `DELETE /api/Agent/{guid}`
- `api/Customer`
  - `POST /api/Customer`
  - `GET /api/Customer`
  - `GET /api/Customer/{guid}`
  - `GET /api/Customer/validate-email?email=...`
  - `GET /api/Customer/without-bookings`
- `api/Manager`
  - `POST /api/Manager`
  - `GET /api/Manager`
  - `GET /api/Manager/{guid}`
  - `PATCH /api/Manager/{guid}`
  - `DELETE /api/Manager/{guid}`
  - Additional management routes for trip creation and assignments
- `api/Trip`
  - `GET /api/Trip`
  - `GET /api/Trip/{guid}`
  - `GET /api/Trip/upcoming`
  - `POST /api/Trip/{tripGuid}/book/{customerGuid}`

For complete request/response schemas, use Swagger UI.

## Database and Seed Data

The backend uses SQLite with database file:

- `src/backend/TimeTravelAgency.Application/TimeTravelAgencyTest.db`

On startup, the app currently:

- Ensures the database is created.
- Seeds test/sample records (agents, managers, customers, trips, paradoxes, reports, reviews, and many historical epochs/events).

Note: in the current startup flow, database recreation is enabled during initialization. This behavior is convenient for development/demo scenarios.

## UML Diagram

The UML diagram of the domain model is available here:

![UML Diagram](https://www.plantuml.com/plantuml/png/jHVDSY8tyyvJw8XhpGjyjHzUbhKTgko569ASPKqRLDP8Kv86x4hoxXdrj4pB6RpKLeM3rF_gdsvf-1AYzB6jpKWP6O9OTPXMkf4sYZz7eljz4hg35nKXjwskS24yHA_jLjne7wALDPJaErbGlya86rq30ikdhzh77R4M3o2hfJMlSsSCgAYT_RpnkfcAj8OHYUrTT_oigX9nd1OHk-M2k8_E6V40jTl3aC2aL_zT6bt9U48aH1crwatXqSizU2D94e8EiOii8PS2IHOE6zJ_UqH9dBSXkXeyPN2Iit5TIss8b9AwSjqQU6It49S7-rkZN4s7XF455_Z3wmWFiDTm69DLZrYMceMWjtRZXXCqtu5wNhPn-LJmkVEpBR3QD-sZqGgzNJUWj3Gwo5ISLCOFIlS0ZVDnAlezi4wwRfpQvNRgiNUcaPOBBiEhLM8ZmxDOGnmGd2M1SN9du-KUJF9VTQxO22zHg7xd3K8vHCV6M4on0rc1ftf6B2qohdfz6rb-xhG26w1YUQB8YFEzhH_1l-zuObw_DDgZyubJTFLS6Wjcg6uaiF9EGGWhwMNbNiQqYwRV2z6rCtiu8SXYkPTMRi7_1vDUTZmdhNREKexE6tqQ6ELiYEZXlNoPrQwriNU_6hmWPjk3ZUE-I7AB9Im5a4LpmiHO4t0DkbLGyCQx-Wmr9Cmzv9lchHMg3bZOBcXpfv_Wybr76OvTKjQkqF9tsMd_NzZMcCAtkQiR0n66UwSqVo-V0Q5CnlafGz7e1clcosCVcw4-lXHdpj_SwwYLn2v7LnAGYKVNJ-LatJPfQcTzFQank4tADv7AVFnSejcqeALpHeM_SxpKvI1iw23MBkieOniOo0uhdCydbzGIE-fUYK89CI8ogNmRPB6Cq_xHjD8DCnK4GFX0EB-EKv6XNlhe2NWhpTkWPgbn1eGYu698XIRrN2rs43sh_KRFwabXUZ_wJNZSJWfZflcCVUJv6S9aziSNV34RrBfdp5Oo0BQjMIUIzan5lGS4ywrJzPYq2eo1wdWu9P8-WlZ4JCg98MQ8qeVoY-aNV9XBshn_aebOZ1hHSidV07P89YtOoHXc9Y22o-ZzDDz2J31zFB4qKnUS-uooo3ZjAeSsT8imqmF3NCvo6T6dduc8Mkgya4YO6gN0IedDQmCSBbD2Z6yGLETDkYj-710rQdaeURsmlxRG0i7qzOGOVXvLXJ9vHAgtNjhgHiOTU68Y-QjpCKGl6qvSUQWWH6tnEIGE7VhaVCt9wKZ-5-lpNvDZk_wBGrLDAn7A2nxJW7G-vwEtzfzCfda8_oSEdGW4CeOSRDeZXzacYMIjuszRNOKHlGASKICfz7uGdQwBZgk3E78e_ewyas546ESmjOBDQuCsvUWBsAgjpJy0)

## Troubleshooting

- If `npm install` fails, verify your Node and npm versions.
- Ensure the .NET 10 SDK is installed (`dotnet --info`) if the API fails to start.
- Check the actual URL printed by ASP.NET Core startup logs when Swagger is not reachable.
- To reset an inconsistent database state, delete `TimeTravelAgencyTest.db` and restart the API.

## Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Add or update tests for your changes.
4. Run test suites locally.
5. Open a pull request with a clear description.

## Roadmap Ideas

- Add authentication/authorization (JWT + role-based access).
- Add API versioning and global exception handling middleware.
- Introduce structured logging and health checks.
- Expand frontend feature coverage beyond scaffold state.
- Add CI pipeline for build, test, and lint checks.

## License

This project is licensed under the MIT License.

See the full license text in `LICENSE`.

