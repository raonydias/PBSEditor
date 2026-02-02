import {
  AbilitiesFile,
  AbilitiesMultiFile,
  BerryPlantsFile,
  BerryPlantsMultiFile,
  EncountersFile,
  EncountersMultiFile,
  ItemsFile,
  ItemsMultiFile,
  MovesFile,
  MovesMultiFile,
  PokemonFile,
  PokemonMultiFile,
  PokemonFormsFile,
  PokemonFormsMultiFile,
  ProjectStatus,
  RibbonsFile,
  RibbonsMultiFile,
  TrainersFile,
  TrainersMultiFile,
  TrainerTypesFile,
  TrainerTypesMultiFile,
  TypesFile,
  TypesMultiFile,
} from "@pbs/shared";

export async function getProjectStatus(): Promise<ProjectStatus> {
  const res = await fetch("/api/project/status");
  if (!res.ok) {
    throw new Error(`Status failed: ${res.status}`);
  }
  return res.json();
}

export async function getTypes(): Promise<TypesMultiFile> {
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

export async function getAbilities(): Promise<AbilitiesMultiFile> {
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

export async function getBerryPlants(): Promise<BerryPlantsMultiFile> {
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

export async function getRibbons(): Promise<RibbonsMultiFile> {
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

export async function getMoves(): Promise<MovesMultiFile> {
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

export async function getItems(): Promise<ItemsMultiFile> {
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

export async function getPokemon(): Promise<PokemonMultiFile> {
  const res = await fetch("/api/pbs/pokemon.txt");
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to load pokemon.txt: ${body}`);
  }
  return res.json();
}

export async function exportPokemon(data: PokemonFile): Promise<void> {
  const res = await fetch("/api/pbs/pokemon.txt/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Export failed: ${body}`);
  }
}

export async function getPokemonForms(): Promise<PokemonFormsMultiFile> {
  const res = await fetch("/api/pbs/pokemon_forms.txt");
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to load pokemon_forms.txt: ${body}`);
  }
  return res.json();
}

export async function exportPokemonForms(data: PokemonFormsFile): Promise<void> {
  const res = await fetch("/api/pbs/pokemon_forms.txt/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Export failed: ${body}`);
  }
}

export async function getTrainerTypes(): Promise<TrainerTypesMultiFile> {
  const res = await fetch("/api/pbs/trainer_types.txt");
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to load trainer_types.txt: ${body}`);
  }
  return res.json();
}

export async function exportTrainerTypes(data: TrainerTypesFile): Promise<void> {
  const res = await fetch("/api/pbs/trainer_types.txt/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Export failed: ${body}`);
  }
}

export async function getEncounters(): Promise<EncountersMultiFile> {
  const res = await fetch("/api/pbs/encounters.txt");
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to load encounters.txt: ${body}`);
  }
  return res.json();
}

export async function exportEncounters(data: EncountersFile): Promise<void> {
  const res = await fetch("/api/pbs/encounters.txt/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Export failed: ${body}`);
  }
}

export async function getTrainers(): Promise<TrainersMultiFile> {
  const res = await fetch("/api/pbs/trainers.txt");
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to load trainers.txt: ${body}`);
  }
  return res.json();
}

export async function exportTrainers(data: TrainersFile): Promise<void> {
  const res = await fetch("/api/pbs/trainers.txt/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Export failed: ${body}`);
  }
}

export async function getBgmFiles(): Promise<string[]> {
  const res = await fetch("/api/assets/bgm");
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to load BGM files: ${body}`);
  }
  const data = (await res.json()) as { files?: string[] };
  return data.files ?? [];
}
