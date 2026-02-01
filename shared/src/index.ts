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
