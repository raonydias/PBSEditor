import { PBSEntry, TypesFile } from "@pbs/shared";

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

export function exportTypesFile(data: TypesFile): string {
  const sorted = [...data.entries].sort((a, b) => a.order - b.order);
  const lines: string[] = [];

  for (const entry of sorted) {
    lines.push(`[${entry.id}]`);
    for (const field of entry.fields) {
      lines.push(`${field.key}=${field.value}`);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}
