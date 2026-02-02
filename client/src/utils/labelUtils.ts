const ABBREVIATIONS: Record<string, string> = {
  id: "ID",
  hp: "HP",
  pp: "PP",
  bgm: "BGM",
  tm: "TM",
  tr: "TR",
  hm: "HM",
  ev: "EV",
  evs: "EVs",
  iv: "IV",
  ivs: "IVs",
};

const KNOWN_KEYS = new Set<string>([
  "Abilities",
  "Accuracy",
  "BPPrice",
  "BaseExp",
  "BaseMoney",
  "BaseStats",
  "BattleBGM",
  "BattleUse",
  "CatchRate",
  "Category",
  "Color",
  "Consumable",
  "Description",
  "DryingPerHour",
  "EVs",
  "EffectChance",
  "EggGroups",
  "EggMoves",
  "Evolutions",
  "FieldUse",
  "Flags",
  "FormName",
  "FunctionCode",
  "Gender",
  "GenderRatio",
  "Generation",
  "GrowthRate",
  "Habitat",
  "Happiness",
  "HatchSteps",
  "Height",
  "HiddenAbilities",
  "HoursPerStage",
  "IconPosition",
  "Immunities",
  "Incense",
  "IntroBGM",
  "IsPseudoType",
  "IsSpecialType",
  "Move",
  "Moves",
  "Name",
  "NamePlural",
  "Offspring",
  "Pocket",
  "Pokedex",
  "PortionName",
  "PortionNamePlural",
  "Power",
  "Price",
  "Priority",
  "Resistances",
  "SellPrice",
  "Shape",
  "ShowQuantity",
  "SkillLevel",
  "Target",
  "TotalPP",
  "TutorMoves",
  "Type",
  "Types",
  "VictoryBGM",
  "Weaknesses",
  "Weight",
  "WildItemCommon",
  "WildItemRare",
  "WildItemUncommon",
  "Yield",
]);

const splitKey = (value: string) => {
  const spaced = value
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Za-z])([0-9])/g, "$1 $2")
    .replace(/([0-9])([A-Za-z])/g, "$1 $2");
  return spaced.split(/\s+/).filter(Boolean);
};

const titleToken = (token: string) => {
  if (!token) return token;
  const lower = token.toLowerCase();
  if (lower === "pokemon") return "Pokémon";
  if (ABBREVIATIONS[lower]) return ABBREVIATIONS[lower];
  if (/^[0-9]+$/.test(token)) return token;
  if (/^[A-Z0-9]{2,}$/.test(token)) return token;
  return token[0].toUpperCase() + token.slice(1).toLowerCase();
};

export const formatKeyLabel = (key: string) => {
  return splitKey(key)
    .map((token) => titleToken(token))
    .join(" ");
};

export const formatKeyLabelIfKnown = (key: string) => {
  return KNOWN_KEYS.has(key) ? formatKeyLabel(key) : key;
};
