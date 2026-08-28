# Galactic Spacefarers UI

An SAP Fiori Elements application for the Galactic Spacefarer Adventure project, providing a
List Report and an Object Page over the galactic spacefarer data.

## Data source

The app consumes the draft-enabled OData V4 service at `/galactic-ui/` (`GalacticFioriService`).

## Features

- Filtering, sorting and server-side pagination on the List Report.
- Planet-based data visibility: non-admin users only see spacefarers authorized for their
  own planet.
- Draft-enabled Object Page editing.
- Stardust collection and spacesuit color are editable.
- Stardust status and navigation rank are calculated by the server and shown as read-only.
- Value help for reference data fields (origin planet, position, spacesuit color).

## Local startup

Run from the repository root:

```bash
npm install
npm run watch-spacefarers
```

See the [root README](../../readme.md) for the full project documentation, including the
backend services, authentication and local mock users.

## Production build

```bash
npm exec --workspace spacefarers -- ui5 build --all --clean-dest
```

This produces the build output in `app/spacefarers/dist/`, which is generated and excluded
from Git.
