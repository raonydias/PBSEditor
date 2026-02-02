"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const pbs_js_1 = require("./pbs.js");
const app = (0, express_1.default)();
const normalizePbsOutput = (text) => {
    const normalized = text.replace(/\r?\n/g, "\r\n");
    return normalized.startsWith("\ufeff") ? normalized : `\ufeff${normalized}`;
};
app.use(express_1.default.json({ limit: "50mb" }));
app.use("/assets/graphics", express_1.default.static(path_1.default.join(projectRoot(), "Graphics")));
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
];
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
];
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
];
function projectRoot() {
    const cwd = process.cwd();
    const candidates = [cwd, path_1.default.resolve(cwd, ".."), path_1.default.resolve(cwd, "..", "..")];
    for (const candidate of candidates) {
        const pbsPath = path_1.default.join(candidate, "PBS");
        try {
            (0, fs_1.accessSync)(pbsPath);
            return candidate;
        }
        catch {
            continue;
        }
    }
    return cwd;
}
function pbsDir() {
    return path_1.default.join(projectRoot(), "PBS");
}
function pbsOutputDir() {
    return path_1.default.join(projectRoot(), "PBS_Output");
}
function audioBgmDir() {
    return path_1.default.join(projectRoot(), "Audio", "BGM");
}
async function listPbsFiles(prefix) {
    const dir = pbsDir();
    if (!(await fileExists(dir)))
        return [];
    const entries = await fs_1.promises.readdir(dir, { withFileTypes: true });
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
        if (a.toLowerCase() === main)
            return -1;
        if (b.toLowerCase() === main)
            return 1;
        return a.localeCompare(b);
    });
}
async function listPokemonFiles() {
    const files = await listPbsFiles("pokemon");
    return files.filter((name) => {
        const lower = name.toLowerCase();
        return !lower.startsWith("pokemon_forms") && !lower.startsWith("pokemon_metrics");
    });
}
function clientDistDir() {
    const configured = process.env.PBS_EDITOR_CLIENT_DIST;
    if (configured && configured.trim()) {
        const resolved = path_1.default.resolve(configured);
        if (fileExistsSync(resolved))
            return resolved;
    }
    const candidates = [
        path_1.default.join(projectRoot(), "client", "dist"),
        path_1.default.join(projectRoot(), "client-dist"),
        path_1.default.join(projectRoot(), "dist", "client"),
        path_1.default.join(projectRoot(), "dist"),
    ];
    for (const candidate of candidates) {
        if (fileExistsSync(candidate))
            return candidate;
    }
    return null;
}
async function ensurePbsOutput() {
    await fs_1.promises.mkdir(pbsOutputDir(), { recursive: true });
}
async function fileExists(filePath) {
    try {
        await fs_1.promises.access(filePath);
        return true;
    }
    catch {
        return false;
    }
}
function fileExistsSync(filePath) {
    try {
        (0, fs_1.accessSync)(filePath);
        return true;
    }
    catch {
        return false;
    }
}
function errorBody(error, detail) {
    return detail ? { error, detail } : { error };
}
app.get("/api/project/status", async (_req, res) => {
    const root = projectRoot();
    const pbsPath = pbsDir();
    const hasPbs = await fileExists(pbsPath);
    const missingFiles = [];
    if (hasPbs) {
        for (const file of supportedFiles) {
            if (file === "items.txt") {
                const files = await listPbsFiles("items");
                if (files.length === 0)
                    missingFiles.push(file);
                continue;
            }
            if (file === "types.txt") {
                const files = await listPbsFiles("types");
                if (files.length === 0)
                    missingFiles.push(file);
                continue;
            }
            if (file === "abilities.txt") {
                const files = await listPbsFiles("abilities");
                if (files.length === 0)
                    missingFiles.push(file);
                continue;
            }
            if (file === "moves.txt") {
                const files = await listPbsFiles("moves");
                if (files.length === 0)
                    missingFiles.push(file);
                continue;
            }
            if (file === "ribbons.txt") {
                const files = await listPbsFiles("ribbons");
                if (files.length === 0)
                    missingFiles.push(file);
                continue;
            }
            if (file === "berry_plants.txt") {
                const files = await listPbsFiles("berry_plants");
                if (files.length === 0)
                    missingFiles.push(file);
                continue;
            }
            if (file === "trainer_types.txt") {
                const files = await listPbsFiles("trainer_types");
                if (files.length === 0)
                    missingFiles.push(file);
                continue;
            }
            if (file === "encounters.txt") {
                const files = await listPbsFiles("encounters");
                if (files.length === 0)
                    missingFiles.push(file);
                continue;
            }
            if (file === "trainers.txt") {
                const files = await listPbsFiles("trainers");
                if (files.length === 0)
                    missingFiles.push(file);
                continue;
            }
            if (file === "pokemon.txt") {
                const files = await listPokemonFiles();
                if (files.length === 0)
                    missingFiles.push(file);
                continue;
            }
            if (file === "pokemon_forms.txt") {
                const files = await listPbsFiles("pokemon_forms");
                if (files.length === 0)
                    missingFiles.push(file);
                continue;
            }
            const filePath = path_1.default.join(pbsPath, file);
            if (!(await fileExists(filePath)))
                missingFiles.push(file);
        }
    }
    else {
        missingFiles.push(...supportedFiles);
    }
    const status = {
        root,
        hasPbs,
        supportedFiles: [...supportedFiles],
        missingFiles,
    };
    res.json(status);
});
app.get("/api/pbs/:file", async (req, res) => {
    const file = req.params.file;
    if (!readableFiles.includes(file)) {
        res.status(404).json(errorBody("Unsupported PBS file.", file));
        return;
    }
    const pbsPath = path_1.default.join(pbsDir(), file);
    if (file === "items.txt") {
        const itemFiles = await listPbsFiles("items");
        if (itemFiles.length === 0) {
            res.status(404).json(errorBody("PBS file not found.", pbsPath));
            return;
        }
    }
    else if (file === "moves.txt") {
        const moveFiles = await listPbsFiles("moves");
        if (moveFiles.length === 0) {
            res.status(404).json(errorBody("PBS file not found.", pbsPath));
            return;
        }
    }
    else if (file === "abilities.txt") {
        const abilityFiles = await listPbsFiles("abilities");
        if (abilityFiles.length === 0) {
            res.status(404).json(errorBody("PBS file not found.", pbsPath));
            return;
        }
    }
    else if (file === "ribbons.txt") {
        const ribbonFiles = await listPbsFiles("ribbons");
        if (ribbonFiles.length === 0) {
            res.status(404).json(errorBody("PBS file not found.", pbsPath));
            return;
        }
    }
    else if (file === "trainer_types.txt") {
        const trainerTypeFiles = await listPbsFiles("trainer_types");
        if (trainerTypeFiles.length === 0) {
            res.status(404).json(errorBody("PBS file not found.", pbsPath));
            return;
        }
    }
    else if (file === "types.txt") {
        const typeFiles = await listPbsFiles("types");
        if (typeFiles.length === 0) {
            res.status(404).json(errorBody("PBS file not found.", pbsPath));
            return;
        }
    }
    else if (file === "berry_plants.txt") {
        const berryFiles = await listPbsFiles("berry_plants");
        if (berryFiles.length === 0) {
            res.status(404).json(errorBody("PBS file not found.", pbsPath));
            return;
        }
    }
    else if (file === "encounters.txt") {
        const encounterFiles = await listPbsFiles("encounters");
        if (encounterFiles.length === 0) {
            res.status(404).json(errorBody("PBS file not found.", pbsPath));
            return;
        }
    }
    else if (file === "trainers.txt") {
        const trainerFiles = await listPbsFiles("trainers");
        if (trainerFiles.length === 0) {
            res.status(404).json(errorBody("PBS file not found.", pbsPath));
            return;
        }
    }
    else if (file === "pokemon.txt") {
        const pokemonFiles = await listPokemonFiles();
        if (pokemonFiles.length === 0) {
            res.status(404).json(errorBody("PBS file not found.", pbsPath));
            return;
        }
    }
    else if (file === "pokemon_forms.txt") {
        const formFiles = await listPbsFiles("pokemon_forms");
        if (formFiles.length === 0) {
            res.status(404).json(errorBody("PBS file not found.", pbsPath));
            return;
        }
    }
    else if (!(await fileExists(pbsPath))) {
        res.status(404).json(errorBody("PBS file not found.", pbsPath));
        return;
    }
    try {
        let raw = "";
        if (file === "types.txt") {
            const typeFiles = await listPbsFiles("types");
            const merged = { entries: [], files: typeFiles };
            for (const filename of typeFiles) {
                const filePath = path_1.default.join(pbsDir(), filename);
                if (!(await fileExists(filePath)))
                    continue;
                const fileRaw = await fs_1.promises.readFile(filePath, "utf-8");
                const parsed = (0, pbs_js_1.parseTypesFile)(fileRaw);
                const tagged = parsed.entries.map((entry) => ({ ...entry, sourceFile: filename }));
                merged.entries.push(...tagged);
            }
            res.json(merged);
            return;
        }
        if (file === "abilities.txt") {
            const abilityFiles = await listPbsFiles("abilities");
            const merged = { entries: [], files: abilityFiles };
            for (const filename of abilityFiles) {
                const filePath = path_1.default.join(pbsDir(), filename);
                if (!(await fileExists(filePath)))
                    continue;
                const fileRaw = await fs_1.promises.readFile(filePath, "utf-8");
                const parsed = (0, pbs_js_1.parseAbilitiesFile)(fileRaw);
                const tagged = parsed.entries.map((entry) => ({ ...entry, sourceFile: filename }));
                merged.entries.push(...tagged);
            }
            res.json(merged);
            return;
        }
        if (file === "moves.txt") {
            const moveFiles = await listPbsFiles("moves");
            const merged = { entries: [], files: moveFiles };
            for (const filename of moveFiles) {
                const filePath = path_1.default.join(pbsDir(), filename);
                if (!(await fileExists(filePath)))
                    continue;
                const fileRaw = await fs_1.promises.readFile(filePath, "utf-8");
                const parsed = (0, pbs_js_1.parseMovesFile)(fileRaw);
                const tagged = parsed.entries.map((entry) => ({ ...entry, sourceFile: filename }));
                merged.entries.push(...tagged);
            }
            res.json(merged);
            return;
        }
        if (file === "ribbons.txt") {
            const ribbonFiles = await listPbsFiles("ribbons");
            const merged = { entries: [], files: ribbonFiles };
            for (const filename of ribbonFiles) {
                const filePath = path_1.default.join(pbsDir(), filename);
                if (!(await fileExists(filePath)))
                    continue;
                const fileRaw = await fs_1.promises.readFile(filePath, "utf-8");
                const parsed = (0, pbs_js_1.parseRibbonsFile)(fileRaw);
                const tagged = parsed.entries.map((entry) => ({ ...entry, sourceFile: filename }));
                merged.entries.push(...tagged);
            }
            res.json(merged);
            return;
        }
        if (file === "berry_plants.txt") {
            const berryFiles = await listPbsFiles("berry_plants");
            const merged = { entries: [], files: berryFiles };
            for (const filename of berryFiles) {
                const filePath = path_1.default.join(pbsDir(), filename);
                if (!(await fileExists(filePath)))
                    continue;
                const fileRaw = await fs_1.promises.readFile(filePath, "utf-8");
                const parsed = (0, pbs_js_1.parseBerryPlantsFile)(fileRaw);
                const tagged = parsed.entries.map((entry) => ({ ...entry, sourceFile: filename }));
                merged.entries.push(...tagged);
            }
            res.json(merged);
            return;
        }
        if (file === "items.txt") {
            const itemFiles = await listPbsFiles("items");
            const merged = { entries: [], files: itemFiles };
            for (const filename of itemFiles) {
                const filePath = path_1.default.join(pbsDir(), filename);
                if (!(await fileExists(filePath)))
                    continue;
                const fileRaw = await fs_1.promises.readFile(filePath, "utf-8");
                const parsed = (0, pbs_js_1.parseItemsFile)(fileRaw);
                const tagged = parsed.entries.map((entry) => ({ ...entry, sourceFile: filename }));
                merged.entries.push(...tagged);
            }
            res.json(merged);
            return;
        }
        if (file === "pokemon_forms.txt") {
            const formFiles = await listPbsFiles("pokemon_forms");
            const merged = { entries: [], files: formFiles };
            for (const filename of formFiles) {
                const filePath = path_1.default.join(pbsDir(), filename);
                if (!(await fileExists(filePath)))
                    continue;
                const fileRaw = await fs_1.promises.readFile(filePath, "utf-8");
                const parsed = (0, pbs_js_1.parsePokemonFormsFile)(fileRaw);
                const tagged = parsed.entries.map((entry) => ({ ...entry, sourceFile: filename }));
                merged.entries.push(...tagged);
            }
            res.json(merged);
            return;
        }
        if (file === "pokemon.txt") {
            const pokemonFiles = await listPokemonFiles();
            const merged = { entries: [], files: pokemonFiles };
            for (const filename of pokemonFiles) {
                const filePath = path_1.default.join(pbsDir(), filename);
                if (!(await fileExists(filePath)))
                    continue;
                const fileRaw = await fs_1.promises.readFile(filePath, "utf-8");
                const parsed = (0, pbs_js_1.parsePokemonFile)(fileRaw);
                const tagged = parsed.entries.map((entry) => ({ ...entry, sourceFile: filename }));
                merged.entries.push(...tagged);
            }
            res.json(merged);
            return;
        }
        if (file === "trainer_types.txt") {
            const trainerTypeFiles = await listPbsFiles("trainer_types");
            const merged = { entries: [], files: trainerTypeFiles };
            for (const filename of trainerTypeFiles) {
                const filePath = path_1.default.join(pbsDir(), filename);
                if (!(await fileExists(filePath)))
                    continue;
                const fileRaw = await fs_1.promises.readFile(filePath, "utf-8");
                const parsed = (0, pbs_js_1.parseTrainerTypesFile)(fileRaw);
                const tagged = parsed.entries.map((entry) => ({ ...entry, sourceFile: filename }));
                merged.entries.push(...tagged);
            }
            res.json(merged);
            return;
        }
        if (file === "encounters.txt") {
            const encounterFiles = await listPbsFiles("encounters");
            const merged = { entries: [], files: encounterFiles };
            for (const filename of encounterFiles) {
                const filePath = path_1.default.join(pbsDir(), filename);
                if (!(await fileExists(filePath)))
                    continue;
                const fileRaw = await fs_1.promises.readFile(filePath, "utf-8");
                const parsed = (0, pbs_js_1.parseEncountersFile)(fileRaw);
                const tagged = parsed.entries.map((entry) => ({ ...entry, sourceFile: filename }));
                merged.entries.push(...tagged);
            }
            res.json(merged);
            return;
        }
        if (file === "trainers.txt") {
            const trainerFiles = await listPbsFiles("trainers");
            const merged = { entries: [], files: trainerFiles };
            for (const filename of trainerFiles) {
                const filePath = path_1.default.join(pbsDir(), filename);
                if (!(await fileExists(filePath)))
                    continue;
                const fileRaw = await fs_1.promises.readFile(filePath, "utf-8");
                const parsed = (0, pbs_js_1.parseTrainersFile)(fileRaw);
                const tagged = parsed.entries.map((entry) => ({ ...entry, sourceFile: filename }));
                merged.entries.push(...tagged);
            }
            res.json(merged);
            return;
        }
        if (file === "pokemon.txt") {
            const parsed = (0, pbs_js_1.parsePokemonFile)(raw);
            res.json(parsed);
            return;
        }
        if (file === "pokemon_forms.txt") {
            if (!raw)
                raw = await fs_1.promises.readFile(pbsPath, "utf-8");
            const parsed = (0, pbs_js_1.parsePokemonFormsFile)(raw);
            res.json(parsed);
            return;
        }
        if (file === "trainer_types.txt") {
            const parsed = (0, pbs_js_1.parseTrainerTypesFile)(raw);
            res.json(parsed);
            return;
        }
        res.status(500).json(errorBody("Parser not implemented.", file));
    }
    catch (error) {
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
        const entries = await fs_1.promises.readdir(bgmPath, { withFileTypes: true });
        const supported = new Set([".wav", ".ogg", ".mp3", ".wma", ".mid"]);
        const files = entries
            .filter((entry) => entry.isFile())
            .map((entry) => entry.name)
            .filter((name) => supported.has(path_1.default.extname(name).toLowerCase()))
            .sort((a, b) => a.localeCompare(b));
        res.json({ files });
    }
    catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        res.status(500).json(errorBody("Failed to read BGM folder.", detail));
    }
});
const exportSchema = zod_1.z.union([
    zod_1.z.object({
        entries: zod_1.z
            .array(zod_1.z.object({
            id: zod_1.z.string().min(1),
            order: zod_1.z.number().int().nonnegative(),
            sourceFile: zod_1.z.string().min(1).optional(),
            fields: zod_1.z.array(zod_1.z.object({
                key: zod_1.z.string().min(1),
                value: zod_1.z.string(),
            })),
        }))
            .min(1),
    }),
    zod_1.z.object({
        entries: zod_1.z
            .array(zod_1.z.object({
            id: zod_1.z.string().min(1),
            version: zod_1.z.number().int().nonnegative(),
            name: zod_1.z.string(),
            order: zod_1.z.number().int().nonnegative(),
            sourceFile: zod_1.z.string().min(1).optional(),
            encounterTypes: zod_1.z.array(zod_1.z.object({
                type: zod_1.z.string(),
                probability: zod_1.z.string(),
                slots: zod_1.z.array(zod_1.z.object({
                    chance: zod_1.z.string(),
                    pokemon: zod_1.z.string(),
                    formNumber: zod_1.z.string().optional(),
                    levelMin: zod_1.z.string(),
                    levelMax: zod_1.z.string(),
                })),
            })),
        }))
            .min(1),
    }),
    zod_1.z.object({
        entries: zod_1.z
            .array(zod_1.z.object({
            id: zod_1.z.string().min(1),
            name: zod_1.z.string(),
            version: zod_1.z.number().int().nonnegative(),
            order: zod_1.z.number().int().nonnegative(),
            sourceFile: zod_1.z.string().min(1).optional(),
            flags: zod_1.z.array(zod_1.z.string()),
            items: zod_1.z.array(zod_1.z.string()),
            loseText: zod_1.z.string(),
            pokemon: zod_1.z.array(zod_1.z.object({
                pokemonId: zod_1.z.string(),
                level: zod_1.z.string(),
                name: zod_1.z.string(),
                gender: zod_1.z.string(),
                shiny: zod_1.z.string(),
                superShiny: zod_1.z.string(),
                shadow: zod_1.z.string(),
                moves: zod_1.z.array(zod_1.z.string()),
                ability: zod_1.z.string(),
                abilityIndex: zod_1.z.string(),
                item: zod_1.z.string(),
                nature: zod_1.z.string(),
                ivs: zod_1.z.array(zod_1.z.string()),
                evs: zod_1.z.array(zod_1.z.string()),
                happiness: zod_1.z.string(),
                ball: zod_1.z.string(),
            })),
        }))
            .min(1),
    }),
]);
app.post("/api/pbs/:file/export", async (req, res) => {
    const file = req.params.file;
    if (!exportableFiles.includes(file)) {
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
        const payload = parseResult.data;
        if (file === "items.txt") {
            const entries = payload.entries ?? [];
            const grouped = new Map();
            for (const entry of entries) {
                const source = entry.sourceFile?.trim() || "items.txt";
                const list = grouped.get(source) ?? [];
                list.push(entry);
                grouped.set(source, list);
            }
            const outputs = [];
            for (const [source, groupEntries] of grouped.entries()) {
                const sorted = [...groupEntries].sort((a, b) => a.order - b.order);
                const output = (0, pbs_js_1.exportItemsFile)({ entries: sorted });
                const outputPath = path_1.default.join(pbsOutputDir(), source);
                await fs_1.promises.writeFile(outputPath, normalizePbsOutput(output), "utf-8");
                outputs.push(outputPath);
            }
            res.json({ ok: true, paths: outputs });
            return;
        }
        if (file === "abilities.txt") {
            const entries = payload.entries ?? [];
            const grouped = new Map();
            for (const entry of entries) {
                const source = entry.sourceFile?.trim() || "abilities.txt";
                const list = grouped.get(source) ?? [];
                list.push(entry);
                grouped.set(source, list);
            }
            const outputs = [];
            for (const [source, groupEntries] of grouped.entries()) {
                const sorted = [...groupEntries].sort((a, b) => a.order - b.order);
                const output = (0, pbs_js_1.exportAbilitiesFile)({ entries: sorted });
                const outputPath = path_1.default.join(pbsOutputDir(), source);
                await fs_1.promises.writeFile(outputPath, normalizePbsOutput(output), "utf-8");
                outputs.push(outputPath);
            }
            res.json({ ok: true, paths: outputs });
            return;
        }
        if (file === "types.txt") {
            const entries = payload.entries ?? [];
            const grouped = new Map();
            for (const entry of entries) {
                const source = entry.sourceFile?.trim() || "types.txt";
                const list = grouped.get(source) ?? [];
                list.push(entry);
                grouped.set(source, list);
            }
            const outputs = [];
            for (const [source, groupEntries] of grouped.entries()) {
                const sorted = [...groupEntries].sort((a, b) => a.order - b.order);
                const output = (0, pbs_js_1.exportTypesFile)({ entries: sorted });
                const outputPath = path_1.default.join(pbsOutputDir(), source);
                await fs_1.promises.writeFile(outputPath, normalizePbsOutput(output), "utf-8");
                outputs.push(outputPath);
            }
            res.json({ ok: true, paths: outputs });
            return;
        }
        if (file === "moves.txt") {
            const entries = payload.entries ?? [];
            const grouped = new Map();
            for (const entry of entries) {
                const source = entry.sourceFile?.trim() || "moves.txt";
                const list = grouped.get(source) ?? [];
                list.push(entry);
                grouped.set(source, list);
            }
            const outputs = [];
            for (const [source, groupEntries] of grouped.entries()) {
                const sorted = [...groupEntries].sort((a, b) => a.order - b.order);
                const output = (0, pbs_js_1.exportMovesFile)({ entries: sorted });
                const outputPath = path_1.default.join(pbsOutputDir(), source);
                await fs_1.promises.writeFile(outputPath, normalizePbsOutput(output), "utf-8");
                outputs.push(outputPath);
            }
            res.json({ ok: true, paths: outputs });
            return;
        }
        if (file === "ribbons.txt") {
            const entries = payload.entries ?? [];
            const grouped = new Map();
            for (const entry of entries) {
                const source = entry.sourceFile?.trim() || "ribbons.txt";
                const list = grouped.get(source) ?? [];
                list.push(entry);
                grouped.set(source, list);
            }
            const outputs = [];
            for (const [source, groupEntries] of grouped.entries()) {
                const sorted = [...groupEntries].sort((a, b) => a.order - b.order);
                const output = (0, pbs_js_1.exportRibbonsFile)({ entries: sorted });
                const outputPath = path_1.default.join(pbsOutputDir(), source);
                await fs_1.promises.writeFile(outputPath, normalizePbsOutput(output), "utf-8");
                outputs.push(outputPath);
            }
            res.json({ ok: true, paths: outputs });
            return;
        }
        if (file === "berry_plants.txt") {
            const entries = payload.entries ?? [];
            const grouped = new Map();
            for (const entry of entries) {
                const source = entry.sourceFile?.trim() || "berry_plants.txt";
                const list = grouped.get(source) ?? [];
                list.push(entry);
                grouped.set(source, list);
            }
            const outputs = [];
            for (const [source, groupEntries] of grouped.entries()) {
                const sorted = [...groupEntries].sort((a, b) => a.order - b.order);
                const output = (0, pbs_js_1.exportBerryPlantsFile)({ entries: sorted });
                const outputPath = path_1.default.join(pbsOutputDir(), source);
                await fs_1.promises.writeFile(outputPath, normalizePbsOutput(output), "utf-8");
                outputs.push(outputPath);
            }
            res.json({ ok: true, paths: outputs });
            return;
        }
        if (file === "trainer_types.txt") {
            const entries = payload.entries ?? [];
            const grouped = new Map();
            for (const entry of entries) {
                const source = entry.sourceFile?.trim() || "trainer_types.txt";
                const list = grouped.get(source) ?? [];
                list.push(entry);
                grouped.set(source, list);
            }
            const outputs = [];
            for (const [source, groupEntries] of grouped.entries()) {
                const sorted = [...groupEntries].sort((a, b) => a.order - b.order);
                const output = (0, pbs_js_1.exportTrainerTypesFile)({ entries: sorted });
                const outputPath = path_1.default.join(pbsOutputDir(), source);
                await fs_1.promises.writeFile(outputPath, normalizePbsOutput(output), "utf-8");
                outputs.push(outputPath);
            }
            res.json({ ok: true, paths: outputs });
            return;
        }
        if (file === "encounters.txt") {
            const entries = payload.entries ?? [];
            const grouped = new Map();
            for (const entry of entries) {
                const source = entry.sourceFile?.trim() || "encounters.txt";
                const list = grouped.get(source) ?? [];
                list.push(entry);
                grouped.set(source, list);
            }
            const outputs = [];
            for (const [source, groupEntries] of grouped.entries()) {
                const sorted = [...groupEntries].sort((a, b) => a.order - b.order);
                const output = (0, pbs_js_1.exportEncountersFile)({ entries: sorted });
                const outputPath = path_1.default.join(pbsOutputDir(), source);
                await fs_1.promises.writeFile(outputPath, normalizePbsOutput(output), "utf-8");
                outputs.push(outputPath);
            }
            res.json({ ok: true, paths: outputs });
            return;
        }
        if (file === "trainers.txt") {
            const entries = payload.entries ?? [];
            const grouped = new Map();
            for (const entry of entries) {
                const source = entry.sourceFile?.trim() || "trainers.txt";
                const list = grouped.get(source) ?? [];
                list.push(entry);
                grouped.set(source, list);
            }
            const outputs = [];
            for (const [source, groupEntries] of grouped.entries()) {
                const sorted = [...groupEntries].sort((a, b) => a.order - b.order);
                const output = (0, pbs_js_1.exportTrainersFile)({ entries: sorted });
                const outputPath = path_1.default.join(pbsOutputDir(), source);
                await fs_1.promises.writeFile(outputPath, normalizePbsOutput(output), "utf-8");
                outputs.push(outputPath);
            }
            res.json({ ok: true, paths: outputs });
            return;
        }
        if (file === "pokemon.txt") {
            const entries = payload.entries ?? [];
            const grouped = new Map();
            for (const entry of entries) {
                const source = entry.sourceFile?.trim() || "pokemon.txt";
                const list = grouped.get(source) ?? [];
                list.push(entry);
                grouped.set(source, list);
            }
            const outputs = [];
            for (const [source, groupEntries] of grouped.entries()) {
                const sorted = [...groupEntries].sort((a, b) => a.order - b.order);
                const output = (0, pbs_js_1.exportPokemonFile)({ entries: sorted });
                const outputPath = path_1.default.join(pbsOutputDir(), source);
                await fs_1.promises.writeFile(outputPath, normalizePbsOutput(output), "utf-8");
                outputs.push(outputPath);
            }
            res.json({ ok: true, paths: outputs });
            return;
        }
        if (file === "pokemon_forms.txt") {
            const entries = payload.entries ?? [];
            const grouped = new Map();
            for (const entry of entries) {
                const source = entry.sourceFile?.trim() || "pokemon_forms.txt";
                const list = grouped.get(source) ?? [];
                list.push(entry);
                grouped.set(source, list);
            }
            const outputs = [];
            for (const [source, groupEntries] of grouped.entries()) {
                const sorted = [...groupEntries].sort((a, b) => a.order - b.order);
                const output = (0, pbs_js_1.exportPokemonFormsFile)({ entries: sorted });
                const outputPath = path_1.default.join(pbsOutputDir(), source);
                await fs_1.promises.writeFile(outputPath, normalizePbsOutput(output), "utf-8");
                outputs.push(outputPath);
            }
            res.json({ ok: true, paths: outputs });
            return;
        }
        const output = file === "abilities.txt"
            ? (0, pbs_js_1.exportAbilitiesFile)(payload)
            : file === "berry_plants.txt"
                ? (0, pbs_js_1.exportBerryPlantsFile)(payload)
                : file === "ribbons.txt"
                    ? (0, pbs_js_1.exportRibbonsFile)(payload)
                    : file === "moves.txt"
                        ? (0, pbs_js_1.exportMovesFile)(payload)
                        : file === "pokemon.txt"
                            ? (0, pbs_js_1.exportPokemonFile)(payload)
                            : file === "pokemon_forms.txt"
                                ? (0, pbs_js_1.exportPokemonFormsFile)(payload)
                                : file === "trainer_types.txt"
                                    ? (0, pbs_js_1.exportTrainerTypesFile)(payload)
                                    : file === "encounters.txt"
                                        ? (0, pbs_js_1.exportEncountersFile)(payload)
                                        : file === "trainers.txt"
                                            ? (0, pbs_js_1.exportTrainersFile)(payload)
                                            : (0, pbs_js_1.exportTypesFile)(payload);
        const outputPath = path_1.default.join(pbsOutputDir(), file);
        await fs_1.promises.writeFile(outputPath, normalizePbsOutput(output), "utf-8");
        res.json({ ok: true, path: outputPath });
    }
    catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        res.status(500).json(errorBody("Failed to export PBS file.", detail));
    }
});
const clientDist = clientDistDir();
if (clientDist) {
    app.use(express_1.default.static(clientDist));
    app.get("*", (req, res, next) => {
        if (req.path.startsWith("/api"))
            return next();
        const indexPath = path_1.default.join(clientDist, "index.html");
        if (!fileExistsSync(indexPath))
            return next();
        res.sendFile(indexPath);
    });
}
app.listen(PORT, () => {
    console.log(`PBS Editor server running on http://localhost:${PORT}`);
});
