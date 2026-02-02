export type KeyValue = {
  key: string;
  value: string;
};

export type PBSEntry = {
  id: string;
  fields: KeyValue[];
  order: number;
  sourceFile?: string;
};

export type ItemsMultiFile = {
  entries: PBSEntry[];
  files: string[];
};

export type TypesFile = {
  entries: PBSEntry[];
};

export type TypesMultiFile = {
  entries: PBSEntry[];
  files: string[];
};

export type AbilitiesFile = {
  entries: PBSEntry[];
};

export type AbilitiesMultiFile = {
  entries: PBSEntry[];
  files: string[];
};

export type BerryPlantsFile = {
  entries: PBSEntry[];
};

export type BerryPlantsMultiFile = {
  entries: PBSEntry[];
  files: string[];
};
export type RibbonsFile = {
  entries: PBSEntry[];
};

export type RibbonsMultiFile = {
  entries: PBSEntry[];
  files: string[];
};

export type MovesFile = {
  entries: PBSEntry[];
};

export type MovesMultiFile = {
  entries: PBSEntry[];
  files: string[];
};

export type ItemsFile = {
  entries: PBSEntry[];
};

export type TrainerTypesFile = {
  entries: PBSEntry[];
};

export type TrainerTypesMultiFile = {
  entries: PBSEntry[];
  files: string[];
};

export type PokemonFile = {
  entries: PBSEntry[];
};

export type PokemonFormsFile = {
  entries: PBSEntry[];
};

export type EncounterSlot = {
  chance: string;
  pokemon: string;
  formNumber: string;
  levelMin: string;
  levelMax: string;
};

export type EncounterType = {
  type: string;
  probability: string;
  slots: EncounterSlot[];
};

export type EncounterEntry = {
  id: string;
  version: number;
  name: string;
  encounterTypes: EncounterType[];
  order: number;
  sourceFile?: string;
};

export type EncountersFile = {
  entries: EncounterEntry[];
};

export type EncountersMultiFile = {
  entries: EncounterEntry[];
  files: string[];
};

export type TrainerPokemon = {
  pokemonId: string;
  level: string;
  name: string;
  gender: string;
  shiny: string;
  superShiny: string;
  shadow: string;
  moves: string[];
  ability: string;
  abilityIndex: string;
  item: string;
  nature: string;
  ivs: string[];
  evs: string[];
  happiness: string;
  ball: string;
};

export type TrainerEntry = {
  id: string;
  name: string;
  version: number;
  flags: string[];
  items: string[];
  loseText: string;
  pokemon: TrainerPokemon[];
  order: number;
  sourceFile?: string;
};

export type TrainersFile = {
  entries: TrainerEntry[];
};

export type TrainersMultiFile = {
  entries: TrainerEntry[];
  files: string[];
};

export type ProjectStatus = {
  root: string;
  hasPbs: boolean;
  supportedFiles: string[];
  missingFiles: string[];
};

export type ApiError = {
  error: string;
  detail?: string;
};
