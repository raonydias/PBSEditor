import {
  AbilitiesFile,
  BerryPlantsFile,
  EncountersFile,
  ItemsFile,
  MovesFile,
  PBSEntry,
  PokemonFile,
  PokemonFormsFile,
  RibbonsFile,
  TrainerTypesFile,
  TypesFile,
} from "@pbs/shared";

type ParsedSection = {
  id: string;
  fields: { key: string; value: string }[];
};

export function parseIniLike(text: string): ParsedSection[] {
  const lines = text.split(/\r?\n/);
  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length === 0) continue;
    if (line.startsWith(";") || line.startsWith("#")) continue;

    const sectionMatch = line.match(/^\[(.+?)\]$/);
    if (sectionMatch) {
      if (current) sections.push(current);
      current = { id: sectionMatch[1].trim(), fields: [] };
      continue;
    }

    if (!current) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();
    current.fields.push({ key, value });
  }

  if (current) sections.push(current);
  return sections;
}

export function parseTypesFile(text: string): TypesFile {
  const sections = parseIniLike(text);
  const entries: PBSEntry[] = sections.map((section, index) => ({
    id: section.id,
    fields: section.fields,
    order: index,
  }));
  return { entries };
}

export function parseAbilitiesFile(text: string): AbilitiesFile {
  const sections = parseIniLike(text);
  const entries: PBSEntry[] = sections.map((section, index) => ({
    id: section.id,
    fields: section.fields,
    order: index,
  }));
  return { entries };
}

export function parseBerryPlantsFile(text: string): BerryPlantsFile {
  const sections = parseIniLike(text);
  const entries: PBSEntry[] = sections.map((section, index) => ({
    id: section.id,
    fields: section.fields,
    order: index,
  }));
  return { entries };
}

export function parseRibbonsFile(text: string): RibbonsFile {
  const sections = parseIniLike(text);
  const entries: PBSEntry[] = sections.map((section, index) => ({
    id: section.id,
    fields: section.fields,
    order: index,
  }));
  return { entries };
}

export function parseMovesFile(text: string): MovesFile {
  const sections = parseIniLike(text);
  const entries: PBSEntry[] = sections.map((section, index) => ({
    id: section.id,
    fields: section.fields,
    order: index,
  }));
  return { entries };
}

export function parseItemsFile(text: string): ItemsFile {
  const sections = parseIniLike(text);
  const entries: PBSEntry[] = sections.map((section, index) => ({
    id: section.id,
    fields: section.fields,
    order: index,
  }));
  return { entries };
}

export function parsePokemonFile(text: string): PokemonFile {
  const sections = parseIniLike(text);
  const entries: PBSEntry[] = sections.map((section, index) => ({
    id: section.id,
    fields: section.fields,
    order: index,
  }));
  return { entries };
}

export function parsePokemonFormsFile(text: string): PokemonFormsFile {
  const sections = parseIniLike(text);
  const entries: PBSEntry[] = sections.map((section, index) => ({
    id: section.id,
    fields: section.fields,
    order: index,
  }));
  return { entries };
}

export function parseTrainerTypesFile(text: string): TrainerTypesFile {
  const sections = parseIniLike(text);
  const entries: PBSEntry[] = sections.map((section, index) => ({
    id: section.id,
    fields: section.fields,
    order: index,
  }));
  return { entries };
}

export function parseEncountersFile(text: string): EncountersFile {
  const lines = text.split(/\r?\n/);
  const entries: EncountersFile["entries"] = [];
  let current: EncountersFile["entries"][number] | null = null;
  let currentType: EncountersFile["entries"][number]["encounterTypes"][number] | null = null;

  const pushCurrent = () => {
    if (current) entries.push(current);
  };

  const isNumeric = (value: string) => /^\d+$/.test(value.trim());
  const splitPokemonForm = (value: string) => {
    const trimmed = value.trim();
    const match = trimmed.match(/^(.*)_([0-9]+)$/);
    if (!match) return { pokemon: trimmed, formNumber: "" };
    return { pokemon: match[1], formNumber: match[2] };
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#") || trimmed.startsWith(";")) continue;

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

    if (!current) continue;
    const parts = trimmed.split(",").map((part) => part.trim());
    if (parts.length === 0) continue;
    if (!isNumeric(parts[0])) {
      const type = parts[0] ?? "";
      const probability = parts[1] ?? "";
      currentType = { type, probability, slots: [] };
      current.encounterTypes.push(currentType);
      continue;
    }

    if (!currentType) continue;
    const [chance = "", pokemonRaw = "", levelMin = "", levelMax = ""] = parts;
    const { pokemon, formNumber } = splitPokemonForm(pokemonRaw);
    currentType.slots.push({ chance, pokemon, formNumber, levelMin, levelMax });
  }

  pushCurrent();
  return { entries };
}

export function exportTypesFile(data: TypesFile): string {
  const sorted = [...data.entries].sort((a, b) => a.order - b.order);
  const lines: string[] = [];

  for (const entry of sorted) {
    lines.push(`[${entry.id}]`);
    for (const field of entry.fields) {
      if (field.value.trim() === "") continue;
      lines.push(`${field.key} = ${field.value}`);
    }
    lines.push("#-------------------------------");
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function exportAbilitiesFile(data: AbilitiesFile): string {
  const sorted = [...data.entries].sort((a, b) => a.order - b.order);
  const lines: string[] = [];

  for (const entry of sorted) {
    lines.push(`[${entry.id}]`);
    for (const field of entry.fields) {
      if (field.value.trim() === "") continue;
      lines.push(`${field.key} = ${field.value}`);
    }
    lines.push("#-------------------------------");
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function exportBerryPlantsFile(data: BerryPlantsFile): string {
  const sorted = [...data.entries].sort((a, b) => a.order - b.order);
  const lines: string[] = [];

  for (const entry of sorted) {
    lines.push(`[${entry.id}]`);
    for (const field of entry.fields) {
      if (field.value.trim() === "") continue;
      lines.push(`${field.key} = ${field.value}`);
    }
    lines.push("#-------------------------------");
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function exportRibbonsFile(data: RibbonsFile): string {
  const sorted = [...data.entries].sort((a, b) => a.order - b.order);
  const lines: string[] = [];

  for (const entry of sorted) {
    lines.push(`[${entry.id}]`);
    for (const field of entry.fields) {
      if (field.value.trim() === "") continue;
      lines.push(`${field.key} = ${field.value}`);
    }
    lines.push("#-------------------------------");
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function exportMovesFile(data: MovesFile): string {
  const sorted = [...data.entries].sort((a, b) => a.order - b.order);
  const lines: string[] = [];

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
      if (trimmed === "") continue;
      if (isStatus && field.key === "Power") continue;
      lines.push(`${field.key} = ${field.value}`);
    }
    if (!sawTarget) {
      lines.push("Target = None");
    }
    lines.push("#-------------------------------");
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function exportItemsFile(data: ItemsFile): string {
  const sorted = [...data.entries].sort((a, b) => a.order - b.order);
  const lines: string[] = [];

  for (const entry of sorted) {
    lines.push(`[${entry.id}]`);
    for (const field of entry.fields) {
      if (field.value.trim() === "") continue;
      lines.push(`${field.key} = ${field.value}`);
    }
    lines.push("#-------------------------------");
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function exportTrainerTypesFile(data: TrainerTypesFile): string {
  const sorted = [...data.entries].sort((a, b) => a.order - b.order);
  const lines: string[] = [];

  for (const entry of sorted) {
    lines.push(`[${entry.id}]`);
    for (const field of entry.fields) {
      if (field.value.trim() === "") continue;
      lines.push(`${field.key} = ${field.value}`);
    }
    lines.push("#-------------------------------");
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function exportEncountersFile(data: EncountersFile): string {
  const sorted = [...data.entries].sort((a, b) => a.order - b.order);
  const lines: string[] = [];

  for (const entry of sorted) {
    const idPart = entry.version > 0 ? `${entry.id},${entry.version}` : entry.id;
    const namePart = entry.name?.trim() ? ` # ${entry.name.trim()}` : "";
    lines.push(`[${idPart}]${namePart}`);

    entry.encounterTypes.forEach((encounterType) => {
      if (!encounterType.type.trim()) return;
      const typeLine = encounterType.probability.trim()
        ? `${encounterType.type.trim()},${encounterType.probability.trim()}`
        : encounterType.type.trim();
      lines.push(typeLine);
      for (const slot of encounterType.slots) {
        const chance = (slot.chance ?? "").trim();
        const pokemonRaw = (slot.pokemon ?? "").trim();
        const levelMin = (slot.levelMin ?? "").trim();
        const levelMax = (slot.levelMax ?? "").trim();
        if (!chance || !pokemonRaw || !levelMin) continue;
        const formNumber = (slot.formNumber ?? "").trim();
        const pokemon =
          formNumber && /^\d+$/.test(formNumber) && Number(formNumber) > 0
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

export function exportPokemonFile(data: PokemonFile): string {
  const sorted = [...data.entries].sort((a, b) => a.order - b.order);
  const lines: string[] = [];
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
    const seen = new Set<string>();
    for (const key of order) {
      const value = fieldMap.get(key);
      if (value === undefined) continue;
      seen.add(key);
      if (value.trim() === "") continue;
      lines.push(`${key} = ${value}`);
    }
    for (const field of entry.fields) {
      if (seen.has(field.key)) continue;
      if (field.value.trim() === "") continue;
      lines.push(`${field.key} = ${field.value}`);
    }
    lines.push("#-------------------------------");
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function exportPokemonFormsFile(data: PokemonFormsFile): string {
  const sorted = [...data.entries].sort((a, b) => a.order - b.order);
  const lines: string[] = [];
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
    const seen = new Set<string>();
    for (const key of order) {
      const value = fieldMap.get(key);
      if (value === undefined) continue;
      seen.add(key);
      if (value.trim() === "") continue;
      lines.push(`${key} = ${value}`);
    }
    for (const field of entry.fields) {
      if (seen.has(field.key)) continue;
      if (field.value.trim() === "") continue;
      lines.push(`${field.key} = ${field.value}`);
    }
    lines.push("#-------------------------------");
  }

  return lines.join("\n").trimEnd() + "\n";
}
