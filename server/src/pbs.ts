import {
  AbilitiesFile,
  BerryPlantsFile,
  ItemsFile,
  MovesFile,
  PBSEntry,
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

export function parseTrainerTypesFile(text: string): TrainerTypesFile {
  const sections = parseIniLike(text);
  const entries: PBSEntry[] = sections.map((section, index) => ({
    id: section.id,
    fields: section.fields,
    order: index,
  }));
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
