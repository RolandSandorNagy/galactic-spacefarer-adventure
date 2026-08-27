# Galactic Spacefarer Adventure

A CAP (SAP Cloud Application Programming Model) reference application that manages galactic
spacefarer records — including stardust collection, wormhole navigation skill, origin planet,
position and spacesuit color — behind a role- and attribute-based authorization layer, with a
Fiori Elements List Report / Object Page UI for browsing and editing.

## Project overview

The service tracks *Spacefarers* and the reference data they relate to (origin planets,
departments, positions, spacesuit colors). Every Spacefarer belongs to an origin planet, and
access to Spacefarer data is restricted so that a user is only able to see and manage records
for the planet they are attributed to (with a dedicated administrator role that can see and
manage everything). Two OData services expose this data: a secured CRUD API for programmatic
access and a draft-enabled Fiori Elements service that powers the UI.

## Implemented features by assessment task

| Task | What was implemented |
|---|---|
| 1 — Spacefarer data model | `db/schema.cds`: `SpaceFarers` entity with stardust collection, wormhole navigation skill, origin planet, spacesuit color, plus `Departments`/`Positions`/`Planets`/`SpacesuitColors` reference entities and seed data in `db/data/`. |
| 2 — Service definition | `srv/galactic-service.cds` / `srv/galactic-service.js`: `GalacticService` at `/galactic`, full CRUD on `SpaceFarers`, protected by authentication, role-based restrictions and a planet-based row filter. |
| 3 — Event handlers | `srv/galactic-service.js`: `before` event handlers validate and derive stardust/navigation values on `CREATE`/`UPDATE`; an `after` event handler on `CREATE` sends a welcome email via `srv/cosmic-notification-service.js`. |
| 4 — List Report | `app/spacefarers`: a Fiori Elements List Report (`sap.fe.templates.ListReport`) showing spacefarers with stardust status and spacesuit color, with filtering, sorting and pagination; non-admin users only see the records authorized for their own planet. |
| 5 — Object Page | Same app, `sap.fe.templates.ObjectPage` target with `@odata.draft.enabled`; stardust collection and spacesuit color are editable, all other fields are read-only or immutable. |

## Technology stack

- **SAP Cloud Application Programming Model (CAP)** — `@sap/cds` (Node.js runtime, ESM)
- **SQLite** (`@cap-js/sqlite`) as the local development database
- **SAP Fiori Elements** (List Report + Object Page floorplans, OData V4, draft handling)
- **UI5 tooling** (`@ui5/cli`, `@sap/ux-ui5-tooling`) and `cds-plugin-ui5` for serving the app alongside the CAP service during development
- **nodemailer** for outbound welcome emails
- **@sap/xssec** and **xsuaa** for production authentication (via `xs-security.json`)
- **Node.js built-in test runner** (`node --test`) with `@cap-js/cds-test` for integration tests

## Architecture

```
db/      domain model (CDS) + CSV seed data, SQLite at design time
srv/     two OData services sharing the same domain model
app/     Fiori Elements app consuming the Fiori-facing service
test/    integration tests running against an in-memory instance of the app
```

Both services are backed by the same `galactic.spacefarer` domain model. `GalacticFioriService`
extends `GalacticService` in code (`class GalacticFioriService extends GalacticService`), so the
planet-based authorization check and the stardust/navigation preparation logic implemented once
for the CRUD API automatically apply to the Fiori draft service as well.

## Data model

Defined in `db/schema.cds`, namespace `galactic.spacefarer`:

- **`SpaceFarers`** (`cuid`, `managed`) — `firstName`, `lastName`, `email` (unique), `stardustCollection` + `stardustCollectionStatus` (`LOW` / `READY` / `ELITE`), `wormholeNavigationSkill` (0–100) + `navigationRank` (`NOVICE` / `SKILLED` / `EXPERT` / `MASTER`), and associations to `originPlanet`, `position` and `spacesuitColor`.
- **`Planets`**, **`SpacesuitColors`** — simple code lists (`sap.common.CodeList`).
- **`Departments`** — code list; **`Positions`** — code list with a mandatory association to `Departments`.
- All associations are enforced with `@assert.target` and referential integrity is enabled via `cds.features.assert_integrity: "db"` in `package.json`.

## The two services

### `GalacticService` — `/galactic`

The secured CRUD API (`srv/galactic-service.cds`, `srv/galactic-service.js`). Exposes
`SpaceFarers` with full Create/Read/Update/Delete, plus read-only projections of the reference
entities (`Planets`, `Departments`, `Positions`, `SpacesuitColors`).

### `GalacticFioriService` — `/galactic-ui`

The UI-facing service (`srv/galactic-fiori-service.cds`, `srv/galactic-fiori-service.js`) behind
the Fiori Elements app. It reuses `GalacticService`'s handlers and adds:

- `@odata.draft.enabled` for draft-based editing on the Object Page;
- `Capabilities.InsertRestrictions.Insertable: false` — creation is not offered in the UI;
- `Capabilities.UpdateRestrictions.Updatable: true`;
- field-level annotations described in [Object Page editability](#object-page-editability) below.

## Authentication, RBAC and planet-based ABAC

Both services require an authenticated user (`@requires: 'authenticated-user'`) and declare
`@restrict` rules on `SpaceFarers`:

- **`SpacefarerViewer`** — read-only, limited to their own planet.
- **`SpacefarerManager`** — read and write, limited to their own planet.
- **`SpacefarerAdmin`** — unrestricted read and write across all planets.

The planet restriction is expressed declaratively as `where: 'originPlanet.code = $user.allowedPlanet'`
on the `READ` and `WRITE` grants. Because that declarative `where` condition cannot be evaluated
against data that does not exist yet, `srv/galactic-service.js` adds an explicit `enforceAllowedPlanet`
`before` event handler on `CREATE` and `UPDATE` that rejects any attempt to create or move a Spacefarer
onto a planet outside the caller's `allowedPlanet` attribute (administrators are exempt).

In local development, authentication is basic auth (`cds.requires.auth.kind: "basic"`), configured
directly in `package.json` with mock users and an `allowedPlanet` attribute per user. For the
`production` profile (`cds.requires["[production]"].auth.kind: "xsuaa"`), the same scopes, role
templates and the `allowedPlanet` attribute are defined in `xs-security.json` for SAP Authorization
and Trust Management (XSUAA). This configuration is present in the repository but has not been
deployed to SAP BTP; only the local `basic` auth profile has been run and tested.

### Local mock users

All local users share the password `test`:

| Username | Role | Allowed planet |
|---|---|---|
| `planet-x-viewer` | `SpacefarerViewer` | `PLANET_X` |
| `planet-y-viewer` | `SpacefarerViewer` | `PLANET_Y` |
| `planet-x-manager` | `SpacefarerManager` | `PLANET_X` |
| `planet-y-manager` | `SpacefarerManager` | `PLANET_Y` |
| `galactic-admin` | `SpacefarerAdmin` | *(all planets)* |

## Stardust and navigation validation/enhancement rules

Implemented in the `before` event handler `prepareForCosmicJourney` (`srv/galactic-service.js`), run on
`CREATE` and `UPDATE` whenever the corresponding raw value is present in the request:

- `stardustCollection` must be a non-negative integer, otherwise the request is rejected with `400`.
  It is mapped to `stardustCollectionStatus`: `< 1000` → `LOW`, `< 5000` → `READY`, `>= 5000` → `ELITE`.
- `wormholeNavigationSkill` must be an integer between 0 and 100 (also enforced at the model level via
  `@assert.range: [0, 100]` in `db/schema.cds`), otherwise the request is rejected with `400`. It is
  mapped to `navigationRank`: `< 50` → `NOVICE`, `< 70` → `SKILLED`, `< 90` → `EXPERT`, `>= 90` → `MASTER`.
- `stardustCollectionStatus` and `navigationRank` are annotated `@readonly` on both services
  and set by the handler rather than accepted from client input, so they cannot be spoofed by a caller.
  (and set by the handler, not accepted from client input), so they cannot be spoofed by a caller.

## Welcome-email behavior

An `after` event handler on `CREATE` (`scheduleCosmicWelcomeNotification` in `srv/galactic-service.js`)
sends a congratulatory email once the creating transaction has succeeded (`req.on('succeeded', ...)`),
so notification delivery never blocks or fails the HTTP response. `srv/cosmic-notification-service.js`
builds and sends the message via `nodemailer`; failures are caught with `Promise.allSettled` and
logged through `cds.log('cosmic-notifications')` rather than propagated.

Transport configuration is read from environment variables:

| Variable | Purpose |
|---|---|
| `SMTP_HOST` | SMTP server host |
| `SMTP_PORT` | SMTP server port (defaults to `587`) |
| `SMTP_SECURE` | Set to `true` to use an implicit TLS connection |
| `SMTP_USER` | SMTP auth username |
| `SMTP_PASSWORD` | SMTP auth password |
| `NOTIFICATION_FROM` | Sender address (defaults to `Galactic Adventure <noreply@galactic-adventure.example>`) |

If `SMTP_HOST`, `SMTP_USER` and `SMTP_PASSWORD` are not all set — which is the case for local
development and for the automated tests — the service falls back to nodemailer's `jsonTransport`,
which builds the email in memory without sending it anywhere.

## Object Page editability

Field-level annotations on `GalacticFioriService.SpaceFarers` (`srv/galactic-fiori-service.cds`):

- `stardustCollection` and `spacesuitColor` are `@mandatory` and editable.
- `firstName`, `lastName`, `email`, `originPlanet`, `position` and `wormholeNavigationSkill` are
  `@Core.Immutable @mandatory` — required on creation, fixed afterwards.
- `stardustCollectionStatus` and `navigationRank` are `@readonly` — server-computed only.

## Prerequisites

- Node.js 22
- npm

## Installation and local startup

```bash
npm install
npm start
```

`npm start` runs `cds-serve`, which boots both OData services (`/galactic` and `/galactic-ui`)
against an in-memory SQLite database seeded from `db/data/*.csv`.

## Opening the Fiori application

```bash
npm run watch-spacefarers
```

This runs `cds watch --open galactic.spacefarer.spacefarers/index.html?sap-ui-xx-viewCache=false`,
which starts the CAP server together with the Fiori Elements app (served through `cds-plugin-ui5`
and the `fiori-tools-proxy`/`fiori-tools-appreload` middlewares configured in
`app/spacefarers/ui5.yaml`) and opens the app in the browser. Log in with any of the mock users
listed above.

## Tests

```bash
npm test
```

This runs `cross-env CDS_PLUGIN_UI5_ACTIVE=false node --test test/galactic-service.test.js` — the
UI5 plugin is disabled so the test run only bootstraps the backend services via `@cap-js/cds-test`.
The suite currently contains 48 tests across 10 suites, all passing.

### What the integration tests cover

`test/galactic-service.test.js` (using fixtures in `test/fixtures/`) exercises, against a real
in-memory instance of the app:

- **Authentication** — invalid credentials are rejected.
- **Read/create/update/delete authorization** on `GalacticService` — per-role access and the
  planet-based row filter, including that a manager cannot move a record onto another planet.
- **Reference data** — read access works, and write attempts (even by an administrator) are
  rejected because `Planets` etc. are exposed read-only.
- **Cosmic preparation** — the full stardust/navigation threshold matrix, rejection of invalid
  values, recalculation on update, and that clients cannot directly overwrite the calculated
  `stardustCollectionStatus`/`navigationRank` fields.
- **Cosmic notifications** — a welcome email is sent on successful creation, not sent when
  creation is rejected, contains the expected recipient/content, and a delivery failure does not
  prevent the Spacefarer from being created.
- **List query behavior** — combined filtering, sorting and pagination via OData query options.
- **`GalacticFioriService` draft lifecycle** — draft edit/activate/discard, that read-only fields
  cannot be changed through a draft, that an invalid draft cannot be activated, and that the same
  planet-based authorization rules apply to draft editing and deletion.

## UI5 production build

```bash
npm exec --workspace spacefarers -- ui5 build --all --clean-dest
```

This builds the Fiori Elements app into `app/spacefarers/dist/` (excluded from version control via
`.gitignore`). The command has been run and verified locally; there is no Cloud Foundry deployment
descriptor (e.g. `mta.yaml`) or CI/CD pipeline in this repository.

## Key design decisions

- **Reference data is exposed as read-only projections.** `Planets`, `Departments`, `Positions` and
  `SpacesuitColors` are `@readonly` in both services; the data available locally is populated from
  the seed CSV files in `db/data/`.
- **Calculated fields are server-controlled.** `stardustCollectionStatus` and `navigationRank` are
  always derived by the `before` event handler from the raw stardust/navigation values and are
  annotated `@readonly` on both services, so client-supplied values for these fields are ignored.
- **Fiori creation is intentionally disabled.** `GalacticFioriService` sets
  `Capabilities.InsertRestrictions.Insertable: false`, so new Spacefarers are not created from the
  List Report/Object Page UI. `CREATE` remains fully available through `GalacticService` at
  `/galactic`.
- **Only stardust collection and spacesuit color are editable on the Object Page.** All other
  business fields are `@Core.Immutable` once a Spacefarer exists.
- **A notification failure does not roll back a successful creation.** The welcome email is sent
  after the creating transaction has already succeeded, and delivery errors are caught and logged
  rather than surfaced to the caller.

## Project structure

```
db/
  schema.cds                    domain model
  data/*.csv                    seed data
srv/
  galactic-service.cds/.js      GalacticService (/galactic) — CRUD API, auth, event handlers
  galactic-fiori-service.cds/.js GalacticFioriService (/galactic-ui) — draft-enabled UI service
  cosmic-notification-service.js welcome-email sending (nodemailer)
app/
  services.cds                  aggregates app-level annotations
  spacefarers/                  Fiori Elements app (List Report + Object Page)
    annotations.cds             UI annotations (line items, facets, field groups, labels)
    webapp/manifest.json        app descriptor, routing, data source
test/
  galactic-service.test.js      integration tests
  fixtures/*.json                request payloads used by the tests
xs-security.json                XSUAA scopes/role templates/attributes for production auth
```

## Known limitations

- No Cloud Foundry deployment descriptor (e.g. `mta.yaml`) or CI/CD pipeline is included. The UI5
  production build has been verified locally (see [UI5 production build](#ui5-production-build)),
  and the XSUAA configuration in `xs-security.json` has not been deployed to SAP BTP; the project
  has only been run and tested locally against SQLite with the `basic` auth profile.
- The auto-generated OPA journey tests under
  `app/spacefarers/webapp/test/integration/*.gen.js` are the default Fiori tools scaffolding and
  have not been extended with custom UI test scenarios.
