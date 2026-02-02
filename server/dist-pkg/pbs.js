"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseIniLike = parseIniLike;
exports.parseTypesFile = parseTypesFile;
exports.parseAbilitiesFile = parseAbilitiesFile;
exports.parseBerryPlantsFile = parseBerryPlantsFile;
exports.parseRibbonsFile = parseRibbonsFile;
exports.parseMovesFile = parseMovesFile;
exports.parseItemsFile = parseItemsFile;
exports.parsePokemonFile = parsePokemonFile;
exports.parsePokemonFormsFile = parsePokemonFormsFile;
exports.parseTrainerTypesFile = parseTrainerTypesFile;
exports.parseEncountersFile = parseEncountersFile;
exports.exportTypesFile = exportTypesFile;
exports.exportAbilitiesFile = exportAbilitiesFile;
exports.exportBerryPlantsFile = exportBerryPlantsFile;
exports.exportRibbonsFile = exportRibbonsFile;
exports.exportMovesFile = exportMovesFile;
exports.exportItemsFile = exportItemsFile;
exports.exportTrainerTypesFile = exportTrainerTypesFile;
exports.exportEncountersFile = exportEncountersFile;
exports.parseTrainersFile = parseTrainersFile;
exports.exportTrainersFile = exportTrainersFile;
exports.exportPokemonFile = exportPokemonFile;
exports.exportPokemonFormsFile = exportPokemonFormsFile;
const EXPORT_HEADER = [
    "# See the documentation on the wiki to learn how to edit this file.",
    "#-------------------------------",
];
const buildExportLines = () => [...EXPORT_HEADER];
function parseIniLike(text) {
    const lines = text.split(/\r?\n/);
    const sections = [];
    let current = null;
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (line.length === 0)
            continue;
        if (line.startsWith(";") || line.startsWith("#"))
            continue;
        const sectionMatch = line.match(/^\[(.+?)\]$/);
        if (sectionMatch) {
            if (current)
                sections.push(current);
            current = { id: sectionMatch[1].trim(), fields: [] };
            continue;
        }
        if (!current)
            continue;
        const eqIndex = line.indexOf("=");
        if (eqIndex === -1)
            continue;
        const key = line.slice(0, eqIndex).trim();
        const value = line.slice(eqIndex + 1).trim();
        current.fields.push({ key, value });
    }
    if (current)
        sections.push(current);
    return sections;
}
function parseTypesFile(text) {
    const sections = parseIniLike(text);
    const entries = sections.map((section, index) => ({
        id: section.id,
        fields: section.fields,
        order: index,
    }));
    return { entries };
}
function parseAbilitiesFile(text) {
    const sections = parseIniLike(text);
    const entries = sections.map((section, index) => ({
        id: section.id,
        fields: section.fields,
        order: index,
    }));
    return { entries };
}
function parseBerryPlantsFile(text) {
    const sections = parseIniLike(text);
    const entries = sections.map((section, index) => ({
        id: section.id,
        fields: section.fields,
        order: index,
    }));
    return { entries };
}
function parseRibbonsFile(text) {
    const sections = parseIniLike(text);
    const entries = sections.map((section, index) => ({
        id: section.id,
        fields: section.fields,
        order: index,
    }));
    return { entries };
}
function parseMovesFile(text) {
    const sections = parseIniLike(text);
    const entries = sections.map((section, index) => ({
        id: section.id,
        fields: section.fields,
        order: index,
    }));
    return { entries };
}
function parseItemsFile(text) {
    const sections = parseIniLike(text);
    const entries = sections.map((section, index) => ({
        id: section.id,
        fields: section.fields,
        order: index,
    }));
    return { entries };
}
function parsePokemonFile(text) {
    const sections = parseIniLike(text);
    const entries = sections.map((section, index) => ({
        id: section.id,
        fields: section.fields,
        order: index,
    }));
    return { entries };
}
function parsePokemonFormsFile(text) {
    const sections = parseIniLike(text);
    const entries = sections.map((section, index) => ({
        id: section.id,
        fields: section.fields,
        order: index,
    }));
    return { entries };
}
function parseTrainerTypesFile(text) {
    const sections = parseIniLike(text);
    const entries = sections.map((section, index) => ({
        id: section.id,
        fields: section.fields,
        order: index,
    }));
    return { entries };
}
function parseEncountersFile(text) {
    const lines = text.split(/\r?\n/);
    const entries = [];
    let current = null;
    let currentType = null;
    const pushCurrent = () => {
        if (current)
            entries.push(current);
    };
    const isNumeric = (value) => /^\d+$/.test(value.trim());
    const splitPokemonForm = (value) => {
        const trimmed = value.trim();
        const match = trimmed.match(/^(.*)_([0-9]+)$/);
        if (!match)
            return { pokemon: trimmed, formNumber: "" };
        return { pokemon: match[1], formNumber: match[2] };
    };
    for (const rawLine of lines) {
        const trimmed = rawLine.trim();
        if (!trimmed)
            continue;
        if (trimmed.startsWith("#") || trimmed.startsWith(";"))
            continue;
        const headerMatch = trimmed.match(/^\[(.+?)\](.*)$/);
        if (headerMatch) {
            pushCurrent();
            const idPart = headerMatch[1].trim();
            const rest = headerMatch[2] ?? "";
            const [idRaw, versionRaw] = idPart.split(",").map((part) => part.trim());
            const version = versionRaw && isNumeric(versionRaw) ? Number(versionRaw) : 0;
            let name = "";
            const commentIndex = rest.indexOf("#");
            if (commentIndex !== -1) {
                name = rest.slice(commentIndex + 1).trim();
            }
            current = {
                id: idRaw ?? "",
                version,
                name,
                encounterTypes: [],
                order: entries.length,
            };
            currentType = null;
            continue;
        }
        if (!current)
            continue;
        const parts = trimmed.split(",").map((part) => part.trim());
        if (parts.length === 0)
            continue;
        if (!isNumeric(parts[0])) {
            const type = parts[0] ?? "";
            const probability = parts[1] ?? "";
            currentType = { type, probability, slots: [] };
            current.encounterTypes.push(currentType);
            continue;
        }
        if (!currentType)
            continue;
        const [chance = "", pokemonRaw = "", levelMin = "", levelMax = ""] = parts;
        const { pokemon, formNumber } = splitPokemonForm(pokemonRaw);
        currentType.slots.push({ chance, pokemon, formNumber, levelMin, levelMax });
    }
    pushCurrent();
    return { entries };
}
function exportTypesFile(data) {
    const sorted = [...data.entries].sort((a, b) => a.order - b.order);
    const lines = buildExportLines();
    for (const entry of sorted) {
        lines.push(`[${entry.id}]`);
        for (const field of entry.fields) {
            if (field.value.trim() === "")
                continue;
            lines.push(`${field.key} = ${field.value}`);
        }
        lines.push("#-------------------------------");
    }
    return lines.join("\n").trimEnd() + "\n";
}
function exportAbilitiesFile(data) {
    const sorted = [...data.entries].sort((a, b) => a.order - b.order);
    const lines = buildExportLines();
    for (const entry of sorted) {
        lines.push(`[${entry.id}]`);
        for (const field of entry.fields) {
            if (field.value.trim() === "")
                continue;
            lines.push(`${field.key} = ${field.value}`);
        }
        lines.push("#-------------------------------");
    }
    return lines.join("\n").trimEnd() + "\n";
}
function exportBerryPlantsFile(data) {
    const sorted = [...data.entries].sort((a, b) => a.order - b.order);
    const lines = buildExportLines();
    for (const entry of sorted) {
        lines.push(`[${entry.id}]`);
        for (const field of entry.fields) {
            if (field.value.trim() === "")
                continue;
            lines.push(`${field.key} = ${field.value}`);
        }
        lines.push("#-------------------------------");
    }
    return lines.join("\n").trimEnd() + "\n";
}
function exportRibbonsFile(data) {
    const sorted = [...data.entries].sort((a, b) => a.order - b.order);
    const lines = buildExportLines();
    for (const entry of sorted) {
        lines.push(`[${entry.id}]`);
        for (const field of entry.fields) {
            if (field.value.trim() === "")
                continue;
            lines.push(`${field.key} = ${field.value}`);
        }
        lines.push("#-------------------------------");
    }
    return lines.join("\n").trimEnd() + "\n";
}
function exportMovesFile(data) {
    const sorted = [...data.entries].sort((a, b) => a.order - b.order);
    const lines = buildExportLines();
    for (const entry of sorted) {
        const category = entry.fields.find((field) => field.key === "Category")?.value?.trim() ?? "";
        const isStatus = category.toLowerCase() === "status";
        let sawTarget = false;
        lines.push(`[${entry.id}]`);
        for (const field of entry.fields) {
            const trimmed = field.value.trim();
            if (field.key === "Target") {
                sawTarget = true;
                if (trimmed === "") {
                    lines.push("Target = None");
                    continue;
                }
            }
            if (trimmed === "")
                continue;
            if (isStatus && field.key === "Power")
                continue;
            lines.push(`${field.key} = ${field.value}`);
        }
        if (!sawTarget) {
            lines.push("Target = None");
        }
        lines.push("#-------------------------------");
    }
    return lines.join("\n").trimEnd() + "\n";
}
function exportItemsFile(data) {
    const sorted = [...data.entries].sort((a, b) => a.order - b.order);
    const lines = buildExportLines();
    for (const entry of sorted) {
        lines.push(`[${entry.id}]`);
        for (const field of entry.fields) {
            if (field.value.trim() === "")
                continue;
            lines.push(`${field.key} = ${field.value}`);
        }
        lines.push("#-------------------------------");
    }
    return lines.join("\n").trimEnd() + "\n";
}
function exportTrainerTypesFile(data) {
    const sorted = [...data.entries].sort((a, b) => a.order - b.order);
    const lines = buildExportLines();
    for (const entry of sorted) {
        lines.push(`[${entry.id}]`);
        for (const field of entry.fields) {
            if (field.value.trim() === "")
                continue;
            lines.push(`${field.key} = ${field.value}`);
        }
        lines.push("#-------------------------------");
    }
    return lines.join("\n").trimEnd() + "\n";
}
function exportEncountersFile(data) {
    const sorted = [...data.entries].sort((a, b) => a.order - b.order);
    const lines = buildExportLines();
    for (const entry of sorted) {
        const idPart = entry.version > 0 ? `${entry.id},${entry.version}` : entry.id;
        const namePart = entry.name?.trim() ? ` # ${entry.name.trim()}` : "";
        lines.push(`[${idPart}]${namePart}`);
        entry.encounterTypes.forEach((encounterType) => {
            if (!encounterType.type.trim())
                return;
            const typeLine = encounterType.probability.trim()
                ? `${encounterType.type.trim()},${encounterType.probability.trim()}`
                : encounterType.type.trim();
            lines.push(typeLine);
            for (const slot of encounterType.slots) {
                const chance = (slot.chance ?? "").trim();
                const pokemonRaw = (slot.pokemon ?? "").trim();
                const levelMin = (slot.levelMin ?? "").trim();
                const levelMax = (slot.levelMax ?? "").trim();
                if (!chance || !pokemonRaw || !levelMin)
                    continue;
                const formNumber = (slot.formNumber ?? "").trim();
                const pokemon = formNumber && /^\d+$/.test(formNumber) && Number(formNumber) > 0
                    ? `${pokemonRaw}_${Number(formNumber)}`
                    : pokemonRaw;
                const parts = [
                    chance,
                    pokemon,
                    levelMin,
                    levelMax,
                ].filter((part, idx) => idx < 3 || part !== "");
                lines.push(`    ${parts.join(",")}`);
            }
        });
        lines.push("#-------------------------------");
    }
    return lines.join("\n").trimEnd() + "\n";
}
const TRAINER_PROPERTY_ORDER = [
    "Name",
    "Gender",
    "Shiny",
    "SuperShiny",
    "Shadow",
    "Moves",
    "Ability",
    "AbilityIndex",
    "Item",
    "Nature",
    "IV",
    "EV",
    "Happiness",
    "Ball",
];
function normalizeStatList(values) {
    const normalized = Array.from({ length: 6 }).map((_, idx) => values[idx] ?? "");
    return normalized;
}
function parseTrainersFile(text) {
    const lines = text.split(/\r?\n/);
    const entries = [];
    let current = null;
    let currentPokemon = null;
    const pushCurrent = () => {
        if (current)
            entries.push(current);
    };
    for (const rawLine of lines) {
        if (!rawLine.trim())
            continue;
        const line = rawLine.trim();
        if (line.startsWith("#") || line.startsWith(";"))
            continue;
        const headerMatch = line.match(/^\[(.+?)\]$/);
        if (headerMatch) {
            pushCurrent();
            const [idRaw = "", nameRaw = "", versionRaw = ""] = headerMatch[1]
                .split(",")
                .map((part) => part.trim());
            const version = versionRaw && /^\d+$/.test(versionRaw) ? Number(versionRaw) : 0;
            current = {
                id: idRaw,
                name: nameRaw,
                version,
                flags: [],
                items: [],
                loseText: "",
                pokemon: [],
                order: entries.length,
            };
            currentPokemon = null;
            continue;
        }
        if (!current)
            continue;
        const eqIndex = line.indexOf("=");
        if (eqIndex === -1)
            continue;
        const key = line.slice(0, eqIndex).trim();
        const value = line.slice(eqIndex + 1).trim();
        if (key === "Pokemon") {
            const [pokemonId = "", level = ""] = value.split(",").map((part) => part.trim());
            currentPokemon = {
                pokemonId,
                level,
                name: "",
                gender: "",
                shiny: "",
                superShiny: "",
                shadow: "",
                moves: [],
                ability: "",
                abilityIndex: "",
                item: "",
                nature: "",
                ivs: normalizeStatList([]),
                evs: normalizeStatList([]),
                happiness: "",
                ball: "",
            };
            current.pokemon.push(currentPokemon);
            continue;
        }
        if (!currentPokemon) {
            if (key === "Flags") {
                current.flags = value ? value.split(",").map((part) => part.trim()).filter(Boolean) : [];
                continue;
            }
            if (key === "Items") {
                current.items = value ? value.split(",").map((part) => part.trim()).filter(Boolean) : [];
                continue;
            }
            if (key === "LoseText") {
                current.loseText = value;
                continue;
            }
            continue;
        }
        switch (key) {
            case "Name":
                currentPokemon.name = value;
                break;
            case "Gender":
                currentPokemon.gender = value;
                break;
            case "Shiny":
                currentPokemon.shiny = value;
                break;
            case "SuperShiny":
                currentPokemon.superShiny = value;
                break;
            case "Shadow":
                currentPokemon.shadow = value;
                break;
            case "Moves":
                currentPokemon.moves = value ? value.split(",").map((part) => part.trim()).filter(Boolean) : [];
                break;
            case "Ability":
                currentPokemon.ability = value;
                break;
            case "AbilityIndex":
                currentPokemon.abilityIndex = value;
                break;
            case "Item":
                currentPokemon.item = value;
                break;
            case "Nature":
                currentPokemon.nature = value;
                break;
            case "IV":
                currentPokemon.ivs = normalizeStatList(value.split(",").map((part) => part.trim()));
                break;
            case "EV":
                currentPokemon.evs = normalizeStatList(value.split(",").map((part) => part.trim()));
                break;
            case "Happiness":
                currentPokemon.happiness = value;
                break;
            case "Ball":
                currentPokemon.ball = value;
                break;
            default:
                break;
        }
    }
    pushCurrent();
    return { entries };
}
function exportTrainersFile(data) {
    const sorted = [...data.entries].sort((a, b) => a.order - b.order);
    const lines = buildExportLines();
    for (const entry of sorted) {
        const headerParts = [entry.id, entry.name].filter(Boolean);
        if (entry.version > 0)
            headerParts.push(String(entry.version));
        lines.push(`[${headerParts.join(",")}]`);
        const flags = entry.flags.map((flag) => flag.trim()).filter(Boolean);
        if (flags.length > 0) {
            lines.push(`Flags = ${flags.join(",")}`);
        }
        const items = entry.items.map((item) => item.trim()).filter(Boolean);
        if (items.length > 0) {
            lines.push(`Items = ${items.join(",")}`);
        }
        if (entry.loseText.trim()) {
            lines.push(`LoseText = ${entry.loseText.trim()}`);
        }
        for (const mon of entry.pokemon) {
            if (!mon.pokemonId.trim() || !mon.level.trim())
                continue;
            lines.push(`Pokemon = ${mon.pokemonId.trim()},${mon.level.trim()}`);
            const ivList = mon.ivs.map((val) => val.trim());
            const evList = mon.evs.map((val) => val.trim());
            const ivValue = ivList.some((val) => val !== "")
                ? ivList.map((val) => (val === "" ? "0" : val)).join(",")
                : "";
            const evValue = evList.some((val) => val !== "")
                ? evList.map((val) => (val === "" ? "0" : val)).join(",")
                : "";
            const abilityIndexValue = mon.abilityIndex.trim().toLowerCase() === "none" ? "" : mon.abilityIndex.trim();
            const props = {
                Name: mon.name.trim(),
                Gender: mon.gender.trim(),
                Shiny: mon.shiny.trim(),
                SuperShiny: mon.superShiny.trim(),
                Shadow: mon.shadow.trim(),
                Moves: mon.moves.filter(Boolean).join(","),
                Ability: mon.ability.trim(),
                AbilityIndex: abilityIndexValue,
                Item: mon.item.trim(),
                Nature: mon.nature.trim(),
                IV: ivValue,
                EV: evValue,
                Happiness: mon.happiness.trim(),
                Ball: mon.ball.trim(),
            };
            for (const key of TRAINER_PROPERTY_ORDER) {
                let value = props[key] ?? "";
                if (!value)
                    continue;
                if (key === "Ability" && !props.Ability)
                    continue;
                if (key === "AbilityIndex" && props.Ability)
                    continue;
                if ((key === "Shiny" || key === "SuperShiny" || key === "Shadow") && value.toLowerCase() === "no") {
                    continue;
                }
                if (key === "Happiness" && value === "70")
                    continue;
                if ((key === "IV" || key === "EV") && value.replace(/,/g, "") === "")
                    continue;
                lines.push(`    ${key} = ${value}`);
            }
        }
        lines.push("#-------------------------------");
    }
    return lines.join("\n").trimEnd() + "\n";
}
function exportPokemonFile(data) {
    const sorted = [...data.entries].sort((a, b) => a.order - b.order);
    const lines = buildExportLines();
    const order = [
        "Name",
        "FormName",
        "Types",
        "BaseStats",
        "GenderRatio",
        "GrowthRate",
        "BaseExp",
        "EVs",
        "CatchRate",
        "Happiness",
        "Abilities",
        "HiddenAbilities",
        "Moves",
        "TutorMoves",
        "EggMoves",
        "EggGroups",
        "HatchSteps",
        "Incense",
        "Offspring",
        "Height",
        "Weight",
        "Color",
        "Shape",
        "Habitat",
        "Category",
        "Pokedex",
        "Generation",
        "Flags",
        "WildItemCommon",
        "WildItemUncommon",
        "WildItemRare",
        "Evolutions",
    ];
    for (const entry of sorted) {
        lines.push(`[${entry.id}]`);
        const fieldMap = new Map(entry.fields.map((field) => [field.key, field.value]));
        const seen = new Set();
        for (const key of order) {
            const value = fieldMap.get(key);
            if (value === undefined)
                continue;
            seen.add(key);
            if (value.trim() === "")
                continue;
            lines.push(`${key} = ${value}`);
        }
        for (const field of entry.fields) {
            if (seen.has(field.key))
                continue;
            if (field.value.trim() === "")
                continue;
            lines.push(`${field.key} = ${field.value}`);
        }
        lines.push("#-------------------------------");
    }
    return lines.join("\n").trimEnd() + "\n";
}
function exportPokemonFormsFile(data) {
    const sorted = [...data.entries].sort((a, b) => a.order - b.order);
    const lines = buildExportLines();
    const order = [
        "FormName",
        "Types",
        "BaseStats",
        "BaseExp",
        "EVs",
        "CatchRate",
        "Happiness",
        "Abilities",
        "HiddenAbilities",
        "Moves",
        "TutorMoves",
        "EggMoves",
        "EggGroups",
        "HatchSteps",
        "Offspring",
        "Height",
        "Weight",
        "Color",
        "Shape",
        "Habitat",
        "Category",
        "Pokedex",
        "Generation",
        "Flags",
        "WildItemCommon",
        "WildItemUncommon",
        "WildItemRare",
        "Evolutions",
        "PokedexForm",
        "MegaStone",
        "MegaMove",
        "MegaMessage",
        "UnmegaForm",
    ];
    for (const entry of sorted) {
        lines.push(`[${entry.id}]`);
        const fieldMap = new Map(entry.fields.map((field) => [field.key, field.value]));
        const seen = new Set();
        for (const key of order) {
            const value = fieldMap.get(key);
            if (value === undefined)
                continue;
            seen.add(key);
            if (value.trim() === "")
                continue;
            lines.push(`${key} = ${value}`);
        }
        for (const field of entry.fields) {
            if (seen.has(field.key))
                continue;
            if (field.value.trim() === "")
                continue;
            lines.push(`${field.key} = ${field.value}`);
        }
        lines.push("#-------------------------------");
    }
    return lines.join("\n").trimEnd() + "\n";
}
