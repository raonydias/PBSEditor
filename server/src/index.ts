import express from "express";
import { z } from "zod";
import { promises as fs, accessSync } from "fs";
import path from "path";
import {
  AbilitiesFile,
  ApiError,
  BerryPlantsFile,
  ItemsFile,
  MovesFile,
  PokemonFile,
  PokemonFormsFile,
  ProjectStatus,
  RibbonsFile,
  TrainerTypesFile,
  TypesFile,
} from "@pbs/shared";
import {
  exportAbilitiesFile,
  exportBerryPlantsFile,
  exportItemsFile,
  exportMovesFile,
  exportPokemonFile,
  exportPokemonFormsFile,
  exportRibbonsFile,
  exportTrainerTypesFile,
  exportTypesFile,
  parseAbilitiesFile,
  parseBerryPlantsFile,
  parseItemsFile,
  parseMovesFile,
  parsePokemonFile,
  parsePokemonFormsFile,
  parseRibbonsFile,
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
  if (!(await fileExists(pbsPath))) {
    res.status(404).json(errorBody("PBS file not found.", pbsPath));
    return;
  }

  try {
    const raw = await fs.readFile(pbsPath, "utf-8");
    if (file === "types.txt") {
      const parsed = parseTypesFile(raw);
      res.json(parsed);
      return;
    }
    if (file === "abilities.txt") {
      const parsed = parseAbilitiesFile(raw);
      res.json(parsed);
      return;
    }
    if (file === "berry_plants.txt") {
      const parsed = parseBerryPlantsFile(raw);
      res.json(parsed);
      return;
    }
    if (file === "ribbons.txt") {
      const parsed = parseRibbonsFile(raw);
      res.json(parsed);
      return;
    }
    if (file === "moves.txt") {
      const parsed = parseMovesFile(raw);
      res.json(parsed);
      return;
    }
    if (file === "items.txt") {
      const parsed = parseItemsFile(raw);
      res.json(parsed);
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

const exportSchema = z.object({
  entries: z
    .array(
      z.object({
        id: z.string().min(1),
        order: z.number().int().nonnegative(),
        fields: z.array(
          z.object({
            key: z.string().min(1),
            value: z.string(),
          })
        ),
      })
    )
    .min(1),
});

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
      | PokemonFormsFile;
    const output =
      file === "abilities.txt"
        ? exportAbilitiesFile(payload as AbilitiesFile)
        : file === "berry_plants.txt"
        ? exportBerryPlantsFile(payload as BerryPlantsFile)
        : file === "ribbons.txt"
        ? exportRibbonsFile(payload as RibbonsFile)
        : file === "moves.txt"
        ? exportMovesFile(payload as MovesFile)
        : file === "items.txt"
        ? exportItemsFile(payload as ItemsFile)
        : file === "pokemon.txt"
        ? exportPokemonFile(payload as PokemonFile)
        : file === "pokemon_forms.txt"
        ? exportPokemonFormsFile(payload as PokemonFormsFile)
        : file === "trainer_types.txt"
        ? exportTrainerTypesFile(payload as TrainerTypesFile)
        : exportTypesFile(payload as TypesFile);
    const outputPath = path.join(pbsOutputDir(), file);
    await fs.writeFile(outputPath, output, "utf-8");
    res.json({ ok: true, path: outputPath });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    res.status(500).json(errorBody("Failed to export PBS file.", detail));
  }
});

app.listen(PORT, () => {
  console.log(`PBS Editor server running on http://localhost:${PORT}`);
});
