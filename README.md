# PBS Editor

Local, browser-based editor for Pokémon Essentials PBS files. Reads from `./PBS/` and exports to either `./PBS_Output/` (safe) or directly to `./PBS/` (opt‑in).

## Requirements

- Node.js 18+
- Run from an Essentials project root (alongside `PBS/`, `Graphics/`, `Audio/`, etc.)

## Dev (two terminals)

```bash
npm install
npm run dev:server
```

In another terminal:

```bash
npm run dev:client
```

Open `http://localhost:5173` (API served at `http://localhost:5174`).

## Build & Run from Source

```bash
npm run build
npm run start
```

## Release (single EXE)

```bash
npm run release
```

This produces `release/PBSEditor.exe`. The client is embedded in the exe and extracted to the OS temp folder on first run (no `client/` folder required in the user’s project).

## Editors Supported

- Types
- Abilities
- Berry Plants
- Ribbons
- Moves
- Items
- Trainer Types
- Pokémon
- Pokémon Forms
- Encounters
- Trainers

Multi‑file support is implemented (e.g. `items_*.txt`, `moves_*.txt`, etc.) and preserves source files on export.

## Export Modes

Configured in Settings:

- **PBS_Output** (default): writes to `./PBS_Output/` and never touches `PBS/`.
- **PBS**: writes directly into `./PBS/`. Optional backups are stored in `./PBS_Backup/` with a configurable limit.

## Project Root Detection

The server looks for `PBS/` in:

1. Current working directory
2. Parent directory
3. Grandparent directory

Run the server from the project root for predictable behavior.

## Parser Notes

PBS files are INI‑like. The parser:

- Preserves entry ordering.
- Preserves unknown keys.
- Does not preserve comments (except map name in encounters.txt and entry separators).
