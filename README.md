# PBS Editor (Local)

Local, browser-based editor for Pokemon Essentials PBS files. This app reads from `./PBS/` and **never** overwrites those files. All exports go to `./PBS_Output/`.

## Quick Start (Dev)

1. Open a terminal **inside your Essentials project root** (this repo should live there).
2. Install dependencies:

```bash
npm install
```

3. Start the backend (terminal A):

```bash
npm run dev:server
```

4. Start the frontend (terminal B):

```bash
npm run dev:client
```

The app runs at `http://localhost:5173` and proxies API calls to the local server at `http://localhost:5174`.

### Project Root Detection

The server looks for a `PBS/` folder in:
1. The current working directory (where you run `npm run dev:server` or `npm run start`)
2. The parent directory
3. The grandparent directory

Recommended: run the server from the project root so `PBS/` is found at the same level as `server/`.

## Build + Run (Production)

```bash
npm run build
npm run start
```

The server will still read from `./PBS/` and export to `./PBS_Output/` relative to where you start it.

## Current MVP

- `/types` editor (list + edit + export) for `PBS/types.txt`.
- `/pokemon` skeleton showing Type1/Type2 dropdowns sourced from `types.txt`.

## Export Safety

- The app **never** writes into `PBS/`.
- Exported files go to `PBS_Output/` only.
- You manually copy exported files into `PBS/` when you decide to apply changes.

## Roadmap

Next PBS files to support:
- `abilities.txt`
- `moves.txt`
- `items.txt`
- `pokemon.txt` full editor
- `trainers.txt`

## Add a New Editor Module

1. Add a parser + exporter in `server/src/pbs.ts` (or new module).
2. Register the file in `server/src/index.ts` for read/export endpoints.
3. Create a page in `client/src/pages/` and add a route + sidebar link in `client/src/App.tsx`.
4. If the editor needs cross-file data, add a loader in `client/src/api.ts` and share in component state.

## Parser Notes

PBS files are INI-like. The current parser:
- Preserves entry ordering.
- Preserves unknown keys.
- **Does not preserve comments yet.** This is an intentional MVP limit; comment preservation can be layered in later.
