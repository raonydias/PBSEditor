export type KeyValue = {
  key: string;
  value: string;
};

export type PBSEntry = {
  id: string;
  fields: KeyValue[];
  order: number;
};

export type TypesFile = {
  entries: PBSEntry[];
};

export type AbilitiesFile = {
  entries: PBSEntry[];
};

export type BerryPlantsFile = {
  entries: PBSEntry[];
};

export type RibbonsFile = {
  entries: PBSEntry[];
};

export type MovesFile = {
  entries: PBSEntry[];
};

export type ItemsFile = {
  entries: PBSEntry[];
};

export type TrainerTypesFile = {
  entries: PBSEntry[];
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
};

export type EncountersFile = {
  entries: EncounterEntry[];
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
