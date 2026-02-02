import express from "express";
import { z } from "zod";
import { promises as fs, accessSync } from "fs";
import path from "path";
import {
  AbilitiesFile,
  AbilitiesMultiFile,
  ApiError,
  BerryPlantsMultiFile,
  BerryPlantsFile,
  EncountersMultiFile,
  EncountersFile,
  ItemsFile,
  ItemsMultiFile,
  MovesMultiFile,
  MovesFile,
  PokemonFile,
  PokemonFormsFile,
  RibbonsMultiFile,
  ProjectStatus,
  RibbonsFile,
  TrainersMultiFile,
  TrainersFile,
  TrainerTypesFile,
  TrainerTypesMultiFile,
  TypesFile,
  TypesMultiFile,
} from "@pbs/shared";
import {
  exportAbilitiesFile,
  exportBerryPlantsFile,
  exportEncountersFile,
  exportItemsFile,
  exportMovesFile,
  exportPokemonFile,
  exportPokemonFormsFile,
  exportRibbonsFile,
  exportTrainersFile,
  exportTrainerTypesFile,
  exportTypesFile,
  parseAbilitiesFile,
  parseBerryPlantsFile,
  parseEncountersFile,
  parseItemsFile,
  parseMovesFile,
  parsePokemonFile,
  parsePokemonFormsFile,
  parseRibbonsFile,
  parseTrainersFile,
  parseTrainerTypesFile,
  parseTypesFile,
} from "./pbs.js";

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use("/assets/graphics", express.static(path.join(projectRoot(), "Graphics")));

const PORT = process.env.PORT ? Number(process.env.PORT) : 5174;

const supportedFiles = [
  "types.txt",
  "abilities.txt",
  "berry_plants.txt",
  "ribbons.txt",
  "moves.txt",
  "items.txt",
  "trainer_types.txt",
  "pokemon.txt",
  "pokemon_forms.txt",
  "encounters.txt",
  "trainers.txt",
] as const;
const readableFiles = [
  "types.txt",
  "abilities.txt",
  "berry_plants.txt",
  "ribbons.txt",
  "moves.txt",
  "items.txt",
  "trainer_types.txt",
  "pokemon.txt",
  "pokemon_forms.txt",
  "encounters.txt",
  "trainers.txt",
] as const;
const exportableFiles = [
  "types.txt",
  "abilities.txt",
  "berry_plants.txt",
  "ribbons.txt",
  "moves.txt",
  "items.txt",
  "trainer_types.txt",
  "pokemon.txt",
  "pokemon_forms.txt",
  "encounters.txt",
  "trainers.txt",
] as const;

type SupportedFile = (typeof supportedFiles)[number];

type ReadableFile = (typeof readableFiles)[number];

function projectRoot(): string {
  const cwd = process.cwd();
  const candidates = [cwd, path.resolve(cwd, ".."), path.resolve(cwd, "..", "..")];
  for (const candidate of candidates) {
    const pbsPath = path.join(candidate, "PBS");
    try {
      accessSync(pbsPath);
      return candidate;
    } catch {
      continue;
    }
  }
  return cwd;
}

function pbsDir(): string {
  return path.join(projectRoot(), "PBS");
}

function pbsOutputDir(): string {
  return path.join(projectRoot(), "PBS_Output");
}

function audioBgmDir(): string {
  return path.join(projectRoot(), "Audio", "BGM");
}

async function listPbsFiles(prefix: string): Promise<string[]> {
  const dir = pbsDir();
  if (!(await fileExists(dir))) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.toLowerCase().endsWith(".txt"));
  const main = `${prefix}.txt`.toLowerCase();
  const prefixed = `${prefix.toLowerCase()}_`;
  const candidates = files.filter((name) => {
    const lower = name.toLowerCase();
    return lower === main || lower.startsWith(prefixed);
  });
  return candidates.sort((a, b) => {
    if (a.toLowerCase() === main) return -1;
    if (b.toLowerCase() === main) return 1;
    return a.localeCompare(b);
  });
}

function clientDistDir(): string | null {
  const configured = process.env.PBS_EDITOR_CLIENT_DIST;
  if (configured && configured.trim()) {
    const resolved = path.resolve(configured);
    if (fileExistsSync(resolved)) return resolved;
  }
  const candidates = [
    path.join(projectRoot(), "client", "dist"),
    path.join(projectRoot(), "client-dist"),
    path.join(projectRoot(), "dist", "client"),
    path.join(projectRoot(), "dist"),
  ];
  for (const candidate of candidates) {
    if (fileExistsSync(candidate)) return candidate;
  }
  return null;
}

async function ensurePbsOutput(): Promise<void> {
  await fs.mkdir(pbsOutputDir(), { recursive: true });
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function fileExistsSync(filePath: string): boolean {
  try {
    accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function errorBody(error: string, detail?: string): ApiError {
  return detail ? { error, detail } : { error };
}

app.get("/api/project/status", async (_req, res) => {
  const root = projectRoot();
  const pbsPath = pbsDir();
  const hasPbs = await fileExists(pbsPath);

  const missingFiles: string[] = [];
  if (hasPbs) {
    for (const file of supportedFiles) {
      if (file === "items.txt") {
        const files = await listPbsFiles("items");
        if (files.length === 0) missingFiles.push(file);
        continue;
      }
      if (file === "types.txt") {
        const files = await listPbsFiles("types");
        if (files.length === 0) missingFiles.push(file);
        continue;
      }
      if (file === "abilities.txt") {
        const files = await listPbsFiles("abilities");
        if (files.length === 0) missingFiles.push(file);
        continue;
      }
      if (file === "moves.txt") {
        const files = await listPbsFiles("moves");
        if (files.length === 0) missingFiles.push(file);
        continue;
      }
      if (file === "ribbons.txt") {
        const files = await listPbsFiles("ribbons");
        if (files.length === 0) missingFiles.push(file);
        continue;
      }
      if (file === "berry_plants.txt") {
        const files = await listPbsFiles("berry_plants");
        if (files.length === 0) missingFiles.push(file);
        continue;
      }
      if (file === "trainer_types.txt") {
        const files = await listPbsFiles("trainer_types");
        if (files.length === 0) missingFiles.push(file);
        continue;
      }
      if (file === "encounters.txt") {
        const files = await listPbsFiles("encounters");
        if (files.length === 0) missingFiles.push(file);
        continue;
      }
      if (file === "trainers.txt") {
        const files = await listPbsFiles("trainers");
        if (files.length === 0) missingFiles.push(file);
        continue;
      }
      const filePath = path.join(pbsPath, file);
      if (!(await fileExists(filePath))) missingFiles.push(file);
    }
  } else {
    missingFiles.push(...supportedFiles);
  }

  const status: ProjectStatus = {
    root,
    hasPbs,
    supportedFiles: [...supportedFiles],
    missingFiles,
  };

  res.json(status);
});

app.get("/api/pbs/:file", async (req, res) => {
  const file = req.params.file as SupportedFile;
  if (!readableFiles.includes(file as ReadableFile)) {
    res.status(404).json(errorBody("Unsupported PBS file.", file));
    return;
  }

  const pbsPath = path.join(pbsDir(), file);
  if (file === "items.txt") {
    const itemFiles = await listPbsFiles("items");
    if (itemFiles.length === 0) {
      res.status(404).json(errorBody("PBS file not found.", pbsPath));
      return;
    }
  } else if (file === "moves.txt") {
    const moveFiles = await listPbsFiles("moves");
    if (moveFiles.length === 0) {
      res.status(404).json(errorBody("PBS file not found.", pbsPath));
      return;
    }
  } else if (file === "abilities.txt") {
    const abilityFiles = await listPbsFiles("abilities");
    if (abilityFiles.length === 0) {
      res.status(404).json(errorBody("PBS file not found.", pbsPath));
      return;
    }
  } else if (file === "ribbons.txt") {
    const ribbonFiles = await listPbsFiles("ribbons");
    if (ribbonFiles.length === 0) {
      res.status(404).json(errorBody("PBS file not found.", pbsPath));
      return;
    }
  } else if (file === "trainer_types.txt") {
    const trainerTypeFiles = await listPbsFiles("trainer_types");
    if (trainerTypeFiles.length === 0) {
      res.status(404).json(errorBody("PBS file not found.", pbsPath));
      return;
    }
  } else if (file === "types.txt") {
    const typeFiles = await listPbsFiles("types");
    if (typeFiles.length === 0) {
      res.status(404).json(errorBody("PBS file not found.", pbsPath));
      return;
    }
  } else if (file === "berry_plants.txt") {
    const berryFiles = await listPbsFiles("berry_plants");
    if (berryFiles.length === 0) {
      res.status(404).json(errorBody("PBS file not found.", pbsPath));
      return;
    }
  } else if (file === "encounters.txt") {
    const encounterFiles = await listPbsFiles("encounters");
    if (encounterFiles.length === 0) {
      res.status(404).json(errorBody("PBS file not found.", pbsPath));
      return;
    }
  } else if (file === "trainers.txt") {
    const trainerFiles = await listPbsFiles("trainers");
    if (trainerFiles.length === 0) {
      res.status(404).json(errorBody("PBS file not found.", pbsPath));
      return;
    }
  } else if (!(await fileExists(pbsPath))) {
    res.status(404).json(errorBody("PBS file not found.", pbsPath));
    return;
  }

  try {
    const raw = await fs.readFile(pbsPath, "utf-8");
    if (file === "types.txt") {
      const typeFiles = await listPbsFiles("types");
      const merged: TypesMultiFile = { entries: [], files: typeFiles };
      for (const filename of typeFiles) {
        const filePath = path.join(pbsDir(), filename);
        if (!(await fileExists(filePath))) continue;
        const fileRaw = await fs.readFile(filePath, "utf-8");
        const parsed = parseTypesFile(fileRaw);
        const tagged = parsed.entries.map((entry) => ({ ...entry, sourceFile: filename }));
        merged.entries.push(...tagged);
      }
      res.json(merged);
      return;
    }
    if (file === "abilities.txt") {
      const abilityFiles = await listPbsFiles("abilities");
      const merged: AbilitiesMultiFile = { entries: [], files: abilityFiles };
      for (const filename of abilityFiles) {
        const filePath = path.join(pbsDir(), filename);
        if (!(await fileExists(filePath))) continue;
        const fileRaw = await fs.readFile(filePath, "utf-8");
        const parsed = parseAbilitiesFile(fileRaw);
        const tagged = parsed.entries.map((entry) => ({ ...entry, sourceFile: filename }));
        merged.entries.push(...tagged);
      }
      res.json(merged);
      return;
    }
    if (file === "moves.txt") {
      const moveFiles = await listPbsFiles("moves");
      const merged: MovesMultiFile = { entries: [], files: moveFiles };
      for (const filename of moveFiles) {
        const filePath = path.join(pbsDir(), filename);
        if (!(await fileExists(filePath))) continue;
        const fileRaw = await fs.readFile(filePath, "utf-8");
        const parsed = parseMovesFile(fileRaw);
        const tagged = parsed.entries.map((entry) => ({ ...entry, sourceFile: filename }));
        merged.entries.push(...tagged);
      }
      res.json(merged);
      return;
    }
    if (file === "ribbons.txt") {
      const ribbonFiles = await listPbsFiles("ribbons");
      const merged: RibbonsMultiFile = { entries: [], files: ribbonFiles };
      for (const filename of ribbonFiles) {
        const filePath = path.join(pbsDir(), filename);
        if (!(await fileExists(filePath))) continue;
        const fileRaw = await fs.readFile(filePath, "utf-8");
        const parsed = parseRibbonsFile(fileRaw);
        const tagged = parsed.entries.map((entry) => ({ ...entry, sourceFile: filename }));
        merged.entries.push(...tagged);
      }
      res.json(merged);
      return;
    }
    if (file === "berry_plants.txt") {
      const berryFiles = await listPbsFiles("berry_plants");
      const merged: BerryPlantsMultiFile = { entries: [], files: berryFiles };
      for (const filename of berryFiles) {
        const filePath = path.join(pbsDir(), filename);
        if (!(await fileExists(filePath))) continue;
        const fileRaw = await fs.readFile(filePath, "utf-8");
        const parsed = parseBerryPlantsFile(fileRaw);
        const tagged = parsed.entries.map((entry) => ({ ...entry, sourceFile: filename }));
        merged.entries.push(...tagged);
      }
      res.json(merged);
      return;
    }
    if (file === "items.txt") {
      const itemFiles = await listPbsFiles("items");
      const merged: ItemsMultiFile = { entries: [], files: itemFiles };
      for (const filename of itemFiles) {
        const filePath = path.join(pbsDir(), filename);
        if (!(await fileExists(filePath))) continue;
        const fileRaw = await fs.readFile(filePath, "utf-8");
        const parsed = parseItemsFile(fileRaw);
        const tagged = parsed.entries.map((entry) => ({ ...entry, sourceFile: filename }));
        merged.entries.push(...tagged);
      }
      res.json(merged);
      return;
    }
    if (file === "trainer_types.txt") {
      const trainerTypeFiles = await listPbsFiles("trainer_types");
      const merged: TrainerTypesMultiFile = { entries: [], files: trainerTypeFiles };
      for (const filename of trainerTypeFiles) {
        const filePath = path.join(pbsDir(), filename);
        if (!(await fileExists(filePath))) continue;
        const fileRaw = await fs.readFile(filePath, "utf-8");
        const parsed = parseTrainerTypesFile(fileRaw);
        const tagged = parsed.entries.map((entry) => ({ ...entry, sourceFile: filename }));
        merged.entries.push(...tagged);
      }
      res.json(merged);
      return;
    }
    if (file === "encounters.txt") {
      const encounterFiles = await listPbsFiles("encounters");
      const merged: EncountersMultiFile = { entries: [], files: encounterFiles };
      for (const filename of encounterFiles) {
        const filePath = path.join(pbsDir(), filename);
        if (!(await fileExists(filePath))) continue;
        const fileRaw = await fs.readFile(filePath, "utf-8");
        const parsed = parseEncountersFile(fileRaw);
        const tagged = parsed.entries.map((entry) => ({ ...entry, sourceFile: filename }));
        merged.entries.push(...tagged);
      }
      res.json(merged);
      return;
    }
    if (file === "trainers.txt") {
      const trainerFiles = await listPbsFiles("trainers");
      const merged: TrainersMultiFile = { entries: [], files: trainerFiles };
      for (const filename of trainerFiles) {
        const filePath = path.join(pbsDir(), filename);
        if (!(await fileExists(filePath))) continue;
        const fileRaw = await fs.readFile(filePath, "utf-8");
        const parsed = parseTrainersFile(fileRaw);
        const tagged = parsed.entries.map((entry) => ({ ...entry, sourceFile: filename }));
        merged.entries.push(...tagged);
      }
      res.json(merged);
      return;
    }
    if (file === "pokemon.txt") {
      const parsed = parsePokemonFile(raw);
      res.json(parsed);
      return;
    }
    if (file === "pokemon_forms.txt") {
      const parsed = parsePokemonFormsFile(raw);
      res.json(parsed);
      return;
    }
    if (file === "trainer_types.txt") {
      const parsed = parseTrainerTypesFile(raw);
      res.json(parsed);
      return;
    }
    res.status(500).json(errorBody("Parser not implemented.", file));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    res.status(500).json(errorBody("Failed to read PBS file.", detail));
  }
});

app.get("/api/assets/bgm", async (_req, res) => {
  const bgmPath = audioBgmDir();
  if (!(await fileExists(bgmPath))) {
    res.status(404).json(errorBody("BGM folder not found.", bgmPath));
    return;
  }
  try {
    const entries = await fs.readdir(bgmPath, { withFileTypes: true });
    const supported = new Set([".wav", ".ogg", ".mp3", ".wma", ".mid"]);
    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => supported.has(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b));
    res.json({ files });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    res.status(500).json(errorBody("Failed to read BGM folder.", detail));
  }
});

const exportSchema = z.union([
  z.object({
    entries: z
      .array(
        z.object({
          id: z.string().min(1),
          order: z.number().int().nonnegative(),
          sourceFile: z.string().min(1).optional(),
          fields: z.array(
            z.object({
              key: z.string().min(1),
              value: z.string(),
            })
          ),
        })
      )
      .min(1),
  }),
  z.object({
    entries: z
      .array(
        z.object({
          id: z.string().min(1),
          version: z.number().int().nonnegative(),
          name: z.string(),
          order: z.number().int().nonnegative(),
          sourceFile: z.string().min(1).optional(),
          encounterTypes: z.array(
            z.object({
              type: z.string(),
              probability: z.string(),
              slots: z.array(
                z.object({
                  chance: z.string(),
                  pokemon: z.string(),
                  formNumber: z.string().optional(),
                  levelMin: z.string(),
                  levelMax: z.string(),
                })
              ),
            })
          ),
        })
      )
      .min(1),
  }),
  z.object({
    entries: z
      .array(
        z.object({
          id: z.string().min(1),
          name: z.string(),
          version: z.number().int().nonnegative(),
          order: z.number().int().nonnegative(),
          sourceFile: z.string().min(1).optional(),
          flags: z.array(z.string()),
          items: z.array(z.string()),
          loseText: z.string(),
          pokemon: z.array(
            z.object({
              pokemonId: z.string(),
              level: z.string(),
              name: z.string(),
              gender: z.string(),
              shiny: z.string(),
              superShiny: z.string(),
              shadow: z.string(),
              moves: z.array(z.string()),
              ability: z.string(),
              abilityIndex: z.string(),
              item: z.string(),
              nature: z.string(),
              ivs: z.array(z.string()),
              evs: z.array(z.string()),
              happiness: z.string(),
              ball: z.string(),
            })
          ),
        })
      )
      .min(1),
  }),
]);

app.post("/api/pbs/:file/export", async (req, res) => {
  const file = req.params.file as SupportedFile;
  if (!exportableFiles.includes(file as ReadableFile)) {
    res.status(404).json(errorBody("Export not supported for PBS file.", file));
    return;
  }

  const parseResult = exportSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json(errorBody("Invalid export payload.", parseResult.error.message));
    return;
  }

  try {
    await ensurePbsOutput();
    const payload = parseResult.data as
      | TypesFile
      | AbilitiesFile
      | BerryPlantsFile
      | RibbonsFile
      | MovesFile
      | ItemsFile
      | TrainerTypesFile
      | PokemonFile
      | PokemonFormsFile
      | EncountersFile
      | TrainersFile;
    if (file === "items.txt") {
      const entries = (payload as ItemsFile).entries ?? [];
      const grouped = new Map<string, typeof entries>();
      for (const entry of entries) {
        const source = entry.sourceFile?.trim() || "items.txt";
        const list = grouped.get(source) ?? [];
        list.push(entry);
        grouped.set(source, list);
      }
      const outputs: string[] = [];
      for (const [source, groupEntries] of grouped.entries()) {
        const sorted = [...groupEntries].sort((a, b) => a.order - b.order);
        const output = exportItemsFile({ entries: sorted });
        const outputPath = path.join(pbsOutputDir(), source);
        await fs.writeFile(outputPath, output, "utf-8");
        outputs.push(outputPath);
      }
      res.json({ ok: true, paths: outputs });
      return;
    }
    if (file === "abilities.txt") {
      const entries = (payload as AbilitiesFile).entries ?? [];
      const grouped = new Map<string, typeof entries>();
      for (const entry of entries) {
        const source = entry.sourceFile?.trim() || "abilities.txt";
        const list = grouped.get(source) ?? [];
        list.push(entry);
        grouped.set(source, list);
      }
      const outputs: string[] = [];
      for (const [source, groupEntries] of grouped.entries()) {
        const sorted = [...groupEntries].sort((a, b) => a.order - b.order);
        const output = exportAbilitiesFile({ entries: sorted });
        const outputPath = path.join(pbsOutputDir(), source);
        await fs.writeFile(outputPath, output, "utf-8");
        outputs.push(outputPath);
      }
      res.json({ ok: true, paths: outputs });
      return;
    }
    if (file === "types.txt") {
      const entries = (payload as TypesFile).entries ?? [];
      const grouped = new Map<string, typeof entries>();
      for (const entry of entries) {
        const source = entry.sourceFile?.trim() || "types.txt";
        const list = grouped.get(source) ?? [];
        list.push(entry);
        grouped.set(source, list);
      }
      const outputs: string[] = [];
      for (const [source, groupEntries] of grouped.entries()) {
        const sorted = [...groupEntries].sort((a, b) => a.order - b.order);
        const output = exportTypesFile({ entries: sorted });
        const outputPath = path.join(pbsOutputDir(), source);
        await fs.writeFile(outputPath, output, "utf-8");
        outputs.push(outputPath);
      }
      res.json({ ok: true, paths: outputs });
      return;
    }
    if (file === "moves.txt") {
      const entries = (payload as MovesFile).entries ?? [];
      const grouped = new Map<string, typeof entries>();
      for (const entry of entries) {
        const source = entry.sourceFile?.trim() || "moves.txt";
        const list = grouped.get(source) ?? [];
        list.push(entry);
        grouped.set(source, list);
      }
      const outputs: string[] = [];
      for (const [source, groupEntries] of grouped.entries()) {
        const sorted = [...groupEntries].sort((a, b) => a.order - b.order);
        const output = exportMovesFile({ entries: sorted });
        const outputPath = path.join(pbsOutputDir(), source);
        await fs.writeFile(outputPath, output, "utf-8");
        outputs.push(outputPath);
      }
      res.json({ ok: true, paths: outputs });
      return;
    }
    if (file === "ribbons.txt") {
      const entries = (payload as RibbonsFile).entries ?? [];
      const grouped = new Map<string, typeof entries>();
      for (const entry of entries) {
        const source = entry.sourceFile?.trim() || "ribbons.txt";
        const list = grouped.get(source) ?? [];
        list.push(entry);
        grouped.set(source, list);
      }
      const outputs: string[] = [];
      for (const [source, groupEntries] of grouped.entries()) {
        const sorted = [...groupEntries].sort((a, b) => a.order - b.order);
        const output = exportRibbonsFile({ entries: sorted });
        const outputPath = path.join(pbsOutputDir(), source);
        await fs.writeFile(outputPath, output, "utf-8");
        outputs.push(outputPath);
      }
      res.json({ ok: true, paths: outputs });
      return;
    }
    if (file === "berry_plants.txt") {
      const entries = (payload as BerryPlantsFile).entries ?? [];
      const grouped = new Map<string, typeof entries>();
      for (const entry of entries) {
        const source = entry.sourceFile?.trim() || "berry_plants.txt";
        const list = grouped.get(source) ?? [];
        list.push(entry);
        grouped.set(source, list);
      }
      const outputs: string[] = [];
      for (const [source, groupEntries] of grouped.entries()) {
        const sorted = [...groupEntries].sort((a, b) => a.order - b.order);
        const output = exportBerryPlantsFile({ entries: sorted });
        const outputPath = path.join(pbsOutputDir(), source);
        await fs.writeFile(outputPath, output, "utf-8");
        outputs.push(outputPath);
      }
      res.json({ ok: true, paths: outputs });
      return;
    }
    if (file === "trainer_types.txt") {
      const entries = (payload as TrainerTypesFile).entries ?? [];
      const grouped = new Map<string, typeof entries>();
      for (const entry of entries) {
        const source = entry.sourceFile?.trim() || "trainer_types.txt";
        const list = grouped.get(source) ?? [];
        list.push(entry);
        grouped.set(source, list);
      }
      const outputs: string[] = [];
      for (const [source, groupEntries] of grouped.entries()) {
        const sorted = [...groupEntries].sort((a, b) => a.order - b.order);
        const output = exportTrainerTypesFile({ entries: sorted });
        const outputPath = path.join(pbsOutputDir(), source);
        await fs.writeFile(outputPath, output, "utf-8");
        outputs.push(outputPath);
      }
      res.json({ ok: true, paths: outputs });
      return;
    }
    if (file === "encounters.txt") {
      const entries = (payload as EncountersFile).entries ?? [];
      const grouped = new Map<string, typeof entries>();
      for (const entry of entries) {
        const source = entry.sourceFile?.trim() || "encounters.txt";
        const list = grouped.get(source) ?? [];
        list.push(entry);
        grouped.set(source, list);
      }
      const outputs: string[] = [];
      for (const [source, groupEntries] of grouped.entries()) {
        const sorted = [...groupEntries].sort((a, b) => a.order - b.order);
        const output = exportEncountersFile({ entries: sorted });
        const outputPath = path.join(pbsOutputDir(), source);
        await fs.writeFile(outputPath, output, "utf-8");
        outputs.push(outputPath);
      }
      res.json({ ok: true, paths: outputs });
      return;
    }
    if (file === "trainers.txt") {
      const entries = (payload as TrainersFile).entries ?? [];
      const grouped = new Map<string, typeof entries>();
      for (const entry of entries) {
        const source = entry.sourceFile?.trim() || "trainers.txt";
        const list = grouped.get(source) ?? [];
        list.push(entry);
        grouped.set(source, list);
      }
      const outputs: string[] = [];
      for (const [source, groupEntries] of grouped.entries()) {
        const sorted = [...groupEntries].sort((a, b) => a.order - b.order);
        const output = exportTrainersFile({ entries: sorted });
        const outputPath = path.join(pbsOutputDir(), source);
        await fs.writeFile(outputPath, output, "utf-8");
        outputs.push(outputPath);
      }
      res.json({ ok: true, paths: outputs });
      return;
    }

    const output =
      file === "abilities.txt"
        ? exportAbilitiesFile(payload as AbilitiesFile)
        : file === "berry_plants.txt"
        ? exportBerryPlantsFile(payload as BerryPlantsFile)
        : file === "ribbons.txt"
        ? exportRibbonsFile(payload as RibbonsFile)
        : file === "moves.txt"
        ? exportMovesFile(payload as MovesFile)
        : file === "pokemon.txt"
        ? exportPokemonFile(payload as PokemonFile)
        : file === "pokemon_forms.txt"
        ? exportPokemonFormsFile(payload as PokemonFormsFile)
        : file === "trainer_types.txt"
        ? exportTrainerTypesFile(payload as TrainerTypesFile)
        : file === "encounters.txt"
        ? exportEncountersFile(payload as EncountersFile)
        : file === "trainers.txt"
        ? exportTrainersFile(payload as TrainersFile)
        : exportTypesFile(payload as TypesFile);
    const outputPath = path.join(pbsOutputDir(), file);
    await fs.writeFile(outputPath, output, "utf-8");
    res.json({ ok: true, path: outputPath });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    res.status(500).json(errorBody("Failed to export PBS file.", detail));
  }
});

const clientDist = clientDistDir();
if (clientDist) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    const indexPath = path.join(clientDist, "index.html");
    if (!fileExistsSync(indexPath)) return next();
    res.sendFile(indexPath);
  });
}

app.listen(PORT, () => {
  console.log(`PBS Editor server running on http://localhost:${PORT}`);
});
