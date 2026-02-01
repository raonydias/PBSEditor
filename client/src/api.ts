import { AbilitiesFile, BerryPlantsFile, ItemsFile, MovesFile, ProjectStatus, RibbonsFile, TypesFile } from "@pbs/shared";

export async function getProjectStatus(): Promise<ProjectStatus> {
  const res = await fetch("/api/project/status");
  if (!res.ok) {
    throw new Error(`Status failed: ${res.status}`);
  }
  return res.json();
}

export async function getTypes(): Promise<TypesFile> {
  const res = await fetch("/api/pbs/types.txt");
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to load types.txt: ${body}`);
  }
  return res.json();
}

export async function exportTypes(data: TypesFile): Promise<void> {
  const res = await fetch("/api/pbs/types.txt/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Export failed: ${body}`);
  }
}

export async function getAbilities(): Promise<AbilitiesFile> {
  const res = await fetch("/api/pbs/abilities.txt");
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to load abilities.txt: ${body}`);
  }
  return res.json();
}

export async function exportAbilities(data: AbilitiesFile): Promise<void> {
  const res = await fetch("/api/pbs/abilities.txt/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Export failed: ${body}`);
  }
}

export async function getBerryPlants(): Promise<BerryPlantsFile> {
  const res = await fetch("/api/pbs/berry_plants.txt");
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to load berry_plants.txt: ${body}`);
  }
  return res.json();
}

export async function exportBerryPlants(data: BerryPlantsFile): Promise<void> {
  const res = await fetch("/api/pbs/berry_plants.txt/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Export failed: ${body}`);
  }
}

export async function getRibbons(): Promise<RibbonsFile> {
  const res = await fetch("/api/pbs/ribbons.txt");
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to load ribbons.txt: ${body}`);
  }
  return res.json();
}

export async function exportRibbons(data: RibbonsFile): Promise<void> {
  const res = await fetch("/api/pbs/ribbons.txt/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Export failed: ${body}`);
  }
}

export async function getMoves(): Promise<MovesFile> {
  const res = await fetch("/api/pbs/moves.txt");
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to load moves.txt: ${body}`);
  }
  return res.json();
}

export async function exportMoves(data: MovesFile): Promise<void> {
  const res = await fetch("/api/pbs/moves.txt/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Export failed: ${body}`);
  }
}

export async function getItems(): Promise<ItemsFile> {
  const res = await fetch("/api/pbs/items.txt");
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to load items.txt: ${body}`);
  }
  return res.json();
}

export async function exportItems(data: ItemsFile): Promise<void> {
  const res = await fetch("/api/pbs/items.txt/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Export failed: ${body}`);
  }
}
