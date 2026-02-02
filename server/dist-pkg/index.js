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
app.use(express_1.default.json({ limit: "2mb" }));
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
    if (!(await fileExists(pbsPath))) {
        res.status(404).json(errorBody("PBS file not found.", pbsPath));
        return;
    }
    try {
        const raw = await fs_1.promises.readFile(pbsPath, "utf-8");
        if (file === "types.txt") {
            const parsed = (0, pbs_js_1.parseTypesFile)(raw);
            res.json(parsed);
            return;
        }
        if (file === "abilities.txt") {
            const parsed = (0, pbs_js_1.parseAbilitiesFile)(raw);
            res.json(parsed);
            return;
        }
        if (file === "berry_plants.txt") {
            const parsed = (0, pbs_js_1.parseBerryPlantsFile)(raw);
            res.json(parsed);
            return;
        }
        if (file === "ribbons.txt") {
            const parsed = (0, pbs_js_1.parseRibbonsFile)(raw);
            res.json(parsed);
            return;
        }
        if (file === "moves.txt") {
            const parsed = (0, pbs_js_1.parseMovesFile)(raw);
            res.json(parsed);
            return;
        }
        if (file === "items.txt") {
            const parsed = (0, pbs_js_1.parseItemsFile)(raw);
            res.json(parsed);
            return;
        }
        if (file === "pokemon.txt") {
            const parsed = (0, pbs_js_1.parsePokemonFile)(raw);
            res.json(parsed);
            return;
        }
        if (file === "pokemon_forms.txt") {
            const parsed = (0, pbs_js_1.parsePokemonFormsFile)(raw);
            res.json(parsed);
            return;
        }
        if (file === "trainer_types.txt") {
            const parsed = (0, pbs_js_1.parseTrainerTypesFile)(raw);
            res.json(parsed);
            return;
        }
        if (file === "encounters.txt") {
            const parsed = (0, pbs_js_1.parseEncountersFile)(raw);
            res.json(parsed);
            return;
        }
        if (file === "trainers.txt") {
            const parsed = (0, pbs_js_1.parseTrainersFile)(raw);
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
            encounterTypes: zod_1.z.array(zod_1.z.object({
                type: zod_1.z.string(),
                probability: zod_1.z.string(),
                slots: zod_1.z.array(zod_1.z.object({
                    chance: zod_1.z.string(),
                    pokemon: zod_1.z.string(),
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
        const output = file === "abilities.txt"
            ? (0, pbs_js_1.exportAbilitiesFile)(payload)
            : file === "berry_plants.txt"
                ? (0, pbs_js_1.exportBerryPlantsFile)(payload)
                : file === "ribbons.txt"
                    ? (0, pbs_js_1.exportRibbonsFile)(payload)
                    : file === "moves.txt"
                        ? (0, pbs_js_1.exportMovesFile)(payload)
                        : file === "items.txt"
                            ? (0, pbs_js_1.exportItemsFile)(payload)
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
        await fs_1.promises.writeFile(outputPath, output, "utf-8");
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
