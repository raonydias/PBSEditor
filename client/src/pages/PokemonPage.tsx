
import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  AbilitiesFile,
  ItemsFile,
  ItemsMultiFile,
  MovesFile,
  PBSEntry,
  PokemonFile,
  PokemonMultiFile,
  TypesFile,
} from "@pbs/shared";
import { exportPokemon, getAbilities, getItems, getMoves, getPokemon, getTypes } from "../api";
import { serializeEntries, useDirty } from "../dirty";
import MoveEntryModal from "../components/MoveEntryModal";
import { useScrollTopButton } from "../hooks/useScrollTopButton";
import { formatKeyLabel, formatKeyLabelIfKnown } from "../utils/labelUtils";
import { useSettings } from "../settings";

const emptyPokemon: PokemonFile = { entries: [] };
const emptyFiles: string[] = ["pokemon.txt"];
const emptyTypes: TypesFile = { entries: [] };
const emptyAbilities: AbilitiesFile = { entries: [] };
const emptyMoves: MovesFile = { entries: [] };
const emptyItems: ItemsFile = { entries: [] };

const GENDER_OPTIONS = [
  "AlwaysMale",
  "FemaleOneEighth",
  "Female25Percent",
  "Female50Percent",
  "Female75Percent",
  "FemaleSevenEighths",
  "AlwaysFemale",
  "Genderless",
] as const;

const GROWTH_OPTIONS = ["Fast", "Medium", "Slow", "Parabolic", "Erratic", "Fluctuating"] as const;

const EGG_GROUP_OPTIONS = [
  "Monster",
  "Water1",
  "Bug",
  "Flying",
  "Field",
  "Fairy",
  "Grass",
  "Humanlike",
  "Water3",
  "Mineral",
  "Amorphous",
  "Water2",
  "Ditto",
  "Dragon",
  "Undiscovered",
] as const;

const COLOR_OPTIONS = ["Black", "Blue", "Brown", "Gray", "Green", "Pink", "Purple", "Red", "White", "Yellow"] as const;

const SHAPE_OPTIONS = [
  "Head",
  "Serpentine",
  "Finned",
  "HeadArms",
  "HeadBase",
  "BipedalTail",
  "HeadLegs",
  "Quadruped",
  "Winged",
  "Multiped",
  "MultiBody",
  "Bipedal",
  "MultiWinged",
  "Insectoid",
] as const;

const HABITAT_OPTIONS = [
  "None",
  "Cave",
  "Forest",
  "Grassland",
  "Mountain",
  "Rare",
  "RoughTerrain",
  "Sea",
  "Urban",
  "WatersEdge",
] as const;

const FLAG_OPTIONS = [
  "Legendary",
  "Mythical",
  "UltraBeast",
  "DefaultForm_0",
  "InheritFormFromMother",
  "InheritFormWithEverStone",
] as const;

const EVOLUTION_METHOD_OPTIONS = [
  "Level",
  "LevelMale",
  "LevelFemale",
  "LevelDay",
  "LevelNight",
  "LevelMorning",
  "LevelAfternoon",
  "LevelEvening",
  "LevelNoWeather",
  "LevelSun",
  "LevelRain",
  "LevelSnow",
  "LevelSandstorm",
  "LevelCycling",
  "LevelSurfing",
  "LevelDiving",
  "LevelDarkness",
  "LevelDarkInParty",
  "AttackGreater",
  "AtkDefEqual",
  "DefenseGreater",
  "Silcoon",
  "Cascoon",
  "Ninjask",
  "Shedinja",
  "Beauty",
  "Location",
  "Region",
  "BattleDealCriticalHit",
  "Event",
  "EventAfterDamageTaken",
  "HappinessMove",
  "HasMove",
  "HappinessMoveType",
  "HasMoveType",
  "HappinessHoldItem",
  "HoldItem",
  "HoldItemMale",
  "HoldItemFemale",
  "DayHoldItem",
  "NightHoldItem",
  "HoldItemHappiness",
  "Item",
  "ItemMale",
  "ItemFemale",
  "ItemDay",
  "ItemNight",
  "ItemHappiness",
  "TradeItem",
  "HasInParty",
  "TradeSpecies",
  "LocationFlag",
  "Happiness",
  "HappinessMale",
  "HappinessFemale",
  "HappinessDay",
  "HappinessNight",
  "MaxHappiness",
  "Trade",
  "TradeMale",
  "TradeFemale",
  "TradeDay",
  "TradeNight",
  "None",
] as const;

const EVOLUTION_PARAM_INTEGER = new Set([
  "Level",
  "LevelMale",
  "LevelFemale",
  "LevelDay",
  "LevelNight",
  "LevelMorning",
  "LevelAfternoon",
  "LevelEvening",
  "LevelNoWeather",
  "LevelSun",
  "LevelRain",
  "LevelSnow",
  "LevelSandstorm",
  "LevelCycling",
  "LevelSurfing",
  "LevelDiving",
  "LevelDarkness",
  "LevelDarkInParty",
  "AttackGreater",
  "AtkDefEqual",
  "DefenseGreater",
  "Silcoon",
  "Cascoon",
  "Ninjask",
  "Beauty",
  "Location",
  "Region",
  "BattleDealCriticalHit",
  "Event",
  "EventAfterDamageTaken",
]);

const EVOLUTION_PARAM_MOVE = new Set(["HappinessMove", "HasMove"]);
const EVOLUTION_PARAM_TYPE = new Set(["HappinessMoveType", "HasMoveType"]);
const EVOLUTION_PARAM_ITEM = new Set([
  "HappinessHoldItem",
  "HoldItem",
  "HoldItemMale",
  "HoldItemFemale",
  "DayHoldItem",
  "NightHoldItem",
  "HoldItemHappiness",
  "Item",
  "ItemMale",
  "ItemFemale",
  "ItemDay",
  "ItemNight",
  "ItemHappiness",
  "TradeItem",
]);
const EVOLUTION_PARAM_POKEMON = new Set(["HasInParty", "TradeSpecies"]);
const EVOLUTION_PARAM_STRING = new Set(["LocationFlag"]);
const EVOLUTION_PARAM_NONE = new Set([
  "Happiness",
  "HappinessMale",
  "HappinessFemale",
  "HappinessDay",
  "HappinessNight",
  "MaxHappiness",
  "Trade",
  "TradeMale",
  "TradeFemale",
  "TradeDay",
  "TradeNight",
  "None",
]);

const STAT_DISPLAY = [
  { key: "HP", label: "HP", fileIndex: 0 },
  { key: "ATTACK", label: "Attack", fileIndex: 1 },
  { key: "DEFENSE", label: "Defense", fileIndex: 2 },
  { key: "SPECIAL_ATTACK", label: "Special Attack", fileIndex: 4 },
  { key: "SPECIAL_DEFENSE", label: "Special Defense", fileIndex: 5 },
  { key: "SPEED", label: "Speed", fileIndex: 3 },
] as const;

const EV_ORDER = ["HP", "ATTACK", "DEFENSE", "SPEED", "SPECIAL_ATTACK", "SPECIAL_DEFENSE"] as const;

const DISPLAY_FIELD_ORDER = [
  "Name",
  "FormName",
  "Category",
  "Types",
  "Abilities",
  "HiddenAbilities",
  "GenderRatio",
  "CatchRate",
  "EggGroups",
  "HatchSteps",
  "Incense",
  "Offspring",
  "Height",
  "Weight",
  "BaseExp",
  "GrowthRate",
  "Habitat",
  "Shape",
  "Color",
  "Happiness",
  "Generation",
  "Pokedex",
  "WildItemCommon",
  "WildItemUncommon",
  "WildItemRare",
  "BaseStats",
  "Moves",
  "TutorMoves",
  "EggMoves",
  "Evolutions",
  "Flags",
] as const;

export default function PokemonPage() {
  const [data, setData] = useState<PokemonFile>(emptyPokemon);
  const [types, setTypes] = useState<TypesFile>(emptyTypes);
  const [abilities, setAbilities] = useState<AbilitiesFile>(emptyAbilities);
  const [moves, setMoves] = useState<MovesFile>(emptyMoves);
  const [items, setItems] = useState<ItemsFile>(emptyItems);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sourceFiles, setSourceFiles] = useState<string[]>(emptyFiles);
  const [activeSource, setActiveSource] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [idError, setIdError] = useState<string | null>(null);
  const [entryErrors, setEntryErrors] = useState<Record<string, Record<string, string>>>({});
  const [entryIdErrors, setEntryIdErrors] = useState<Record<string, string | null>>({});
  const [filter, setFilter] = useState("");
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [baselineEntries, setBaselineEntries] = useState<PBSEntry[]>([]);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);
  const [addSourceDraft, setAddSourceDraft] = useState<string>("pokemon.txt");
  const dirty = useDirty();
  const showTop = useScrollTopButton();
  const { openSettings, settings } = useSettings();

  const ensurePokemonDefaults = (entry: PBSEntry, sourceFile: string) => {
    const defaults = buildDefaultPokemonEntry(entry.id, entry.order, sourceFile);
    const existing = new Map(entry.fields.map((field) => [field.key, field.value]));
    const defaultKeys = new Set(defaults.fields.map((field) => field.key));
    const merged = defaults.fields.map((field) => ({
      key: field.key,
      value: existing.get(field.key) ?? field.value,
    }));
    for (const field of entry.fields) {
      if (!defaultKeys.has(field.key)) merged.push(field);
    }
    return { ...entry, fields: merged, sourceFile: entry.sourceFile ?? sourceFile };
  };

  const normalizePokemonMulti = (payload: PokemonMultiFile): PokemonFile => {
    const files = payload.files?.length ? payload.files : ["pokemon.txt"];
    const normalized = payload.entries.map((entry) => {
      const source = entry.sourceFile ?? files[0] ?? "pokemon.txt";
      return ensurePokemonDefaults(entry, source);
    });
    return { entries: normalized };
  };
  useEffect(() => {
    let isMounted = true;
    Promise.all([getPokemon(), getTypes(), getAbilities(), getMoves(), getItems()])
      .then(([pokemonResult, typesResult, abilitiesResult, movesResult, itemsResult]) => {
        if (!isMounted) return;
        const normalized = normalizePokemonMulti(pokemonResult);
        setData(normalized);
        setBaselineEntries(normalized.entries);
        setTypes({ entries: typesResult.entries });
        setAbilities({ entries: abilitiesResult.entries });
        setMoves({ entries: movesResult.entries });
        setItems({ entries: (itemsResult as ItemsMultiFile).entries });
        setActiveId(normalized.entries[0]?.id ?? null);
        const files = pokemonResult.files?.length ? pokemonResult.files : ["pokemon.txt"];
        setSourceFiles(files);
        const snap = serializeEntries(normalized.entries);
        setSnapshot(snap);
        dirty.setDirty("pokemon", false);
        setActiveSource(files.length === 1 ? files[0] : "ALL");
      })
      .catch((err: Error) => {
        if (!isMounted) return;
        setError(err.message);
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    dirty.setCurrentKey("pokemon");
  }, []);

  const activeEntry = useMemo(() => {
    return data.entries.find((entry) => entry.id === activeId) ?? null;
  }, [data.entries, activeId]);


  const filteredEntries = useMemo(() => {
    const needle = filter.trim().toUpperCase();
    const sourceFiltered =
      activeSource === "ALL"
        ? data.entries
        : data.entries.filter((entry) => (entry.sourceFile ?? "pokemon.txt") === activeSource);
    if (!needle) return sourceFiltered;
    return sourceFiltered.filter((entry) => entry.id.includes(needle));
  }, [data.entries, filter, activeSource]);

  useEffect(() => {
    if (!activeId) return;
    if (filteredEntries.some((entry) => entry.id === activeId)) return;
    setActiveId(filteredEntries[0]?.id ?? null);
  }, [filteredEntries, activeId]);

  useEffect(() => {
    setIdError(null);
  }, [activeId]);

  const typeOptions = useMemo(() => types.entries.map((entry) => entry.id), [types.entries]);
  const abilityOptions = useMemo(() => abilities.entries.map((entry) => entry.id), [abilities.entries]);
  const moveOptions = useMemo(() => moves.entries.map((entry) => entry.id), [moves.entries]);
  const itemOptions = useMemo(() => items.entries.map((entry) => entry.id), [items.entries]);
  const pokemonOptions = useMemo(() => data.entries.map((entry) => entry.id), [data.entries]);

  const updateEntry = (updated: PBSEntry) => {
    setData((prev) => ({
      ...prev,
      entries: prev.entries.map((entry) => (entry.id === updated.id ? updated : entry)),
    }));
  };

  const validateEntryId = (entry: PBSEntry, nextIdRaw: string) => {
    const nextId = nextIdRaw.trim().toUpperCase();
    if (!nextId) return "ID is required.";
    if (!/^[A-Z0-9_]+$/.test(nextId)) return "ID must use A-Z, 0-9, or _ only.";
    if (data.entries.some((item) => item.id.toLowerCase() === nextId.toLowerCase() && item.id !== entry.id)) {
      return "ID must be unique.";
    }
    return null;
  };

  const updateEntryId = (entry: PBSEntry, nextIdRaw: string) => {
    const nextId = nextIdRaw.trim().toUpperCase();
    setData((prev) => ({
      ...prev,
      entries: prev.entries.map((item) => {
        if (item.id !== entry.id) return item;
        const nextFields = item.fields.map((field) => {
          if (field.key !== "Name") return field;
          if (field.value.trim().toLowerCase() !== entry.id.toLowerCase()) return field;
          return { ...field, value: toTitleCase(nextId) };
        });
        return { ...item, id: nextId, fields: nextFields };
      }),
    }));
    setActiveId(nextId);
    setEntryErrors((prev) => {
      if (!(entry.id in prev)) return prev;
      const next = { ...prev, [nextId]: prev[entry.id] };
      delete next[entry.id];
      return next;
    });
    setEntryIdErrors((prev) => {
      if (!(entry.id in prev)) return prev;
      const next = { ...prev, [nextId]: prev[entry.id] };
      delete next[entry.id];
      return next;
    });
  };
  const validateEntryFields = (entry: PBSEntry) => {
    const errors: Record<string, string> = {};
    const getField = (key: string) => entry.fields.find((field) => field.key === key)?.value ?? "";

    const name = getField("Name").trim();
    if (!name) errors.Name = "Name is required.";

    const typesValue = getField("Types").trim();
    const typeParts = splitList(typesValue);
    if (!typeParts[0]) {
      errors.Types = "PrimaryType is required.";
    } else if (!typeOptions.includes(typeParts[0])) {
      errors.Types = "PrimaryType must be a valid Type ID.";
    } else if (typeParts[1] && !typeOptions.includes(typeParts[1])) {
      errors.Types = "SecondaryType must be a valid Type ID.";
    }

    const gender = getField("GenderRatio").trim();
    if (!gender) {
      errors.GenderRatio = "GenderRatio is required.";
    } else if (!GENDER_OPTIONS.includes(gender as (typeof GENDER_OPTIONS)[number])) {
      errors.GenderRatio = "GenderRatio must be a valid option.";
    }

    const growth = getField("GrowthRate").trim();
    if (!growth) {
      errors.GrowthRate = "GrowthRate is required.";
    } else if (!GROWTH_OPTIONS.includes(growth as (typeof GROWTH_OPTIONS)[number])) {
      errors.GrowthRate = "GrowthRate must be a valid option.";
    }

    const baseExp = getField("BaseExp").trim();
    if (!baseExp) {
      errors.BaseExp = "BaseExp is required.";
    } else if (!/^\d+$/.test(baseExp)) {
      errors.BaseExp = "BaseExp must be an integer.";
    } else if (Number(baseExp) < 1) {
      errors.BaseExp = "BaseExp must be at least 1.";
    }

    const baseStats = getField("BaseStats").trim();
    if (!baseStats) {
      errors.BaseStats = "BaseStats is required.";
    } else {
      const parts = baseStats.split(",").map((part) => part.trim());
      if (parts.length !== 6 || parts.some((part) => part === "")) {
        errors.BaseStats = "BaseStats must have 6 values.";
      } else if (parts.some((part) => !/^\d+$/.test(part) || Number(part) < 1)) {
        errors.BaseStats = "BaseStats values must be integers of at least 1.";
      }
    }

    const catchRate = getField("CatchRate").trim();
    if (!catchRate) {
      errors.CatchRate = "CatchRate is required.";
    } else if (!/^\d+$/.test(catchRate)) {
      errors.CatchRate = "CatchRate must be an integer.";
    } else if (Number(catchRate) < 0) {
      errors.CatchRate = "CatchRate must be 0 or greater.";
    }

    const happiness = getField("Happiness").trim();
    if (!happiness) {
      errors.Happiness = "Happiness is required.";
    } else if (!/^\d+$/.test(happiness)) {
      errors.Happiness = "Happiness must be an integer.";
    } else if (Number(happiness) < 0) {
      errors.Happiness = "Happiness must be 0 or greater.";
    }

    const abilitiesValue = getField("Abilities").trim();
    const abilityParts = splitList(abilitiesValue);
    if (abilityParts[0] && !abilityOptions.includes(abilityParts[0])) {
      errors.Abilities = "Ability1 must be a valid Ability ID.";
    }
    if (abilityParts[1] && !abilityOptions.includes(abilityParts[1])) {
      errors.Abilities = "Ability2 must be a valid Ability ID.";
    }

    const movesPairs = parseMovePairs(getField("Moves"));
    for (const pair of movesPairs) {
      if (!pair.level && !pair.move) continue;
      if (!pair.level) {
        errors.Moves = "Move entries need a level.";
        break;
      }
      if (!/^-?\d+$/.test(pair.level) || Number(pair.level) < -1) {
        errors.Moves = "Move levels must be integers of at least -1.";
        break;
      }
      if (!pair.move) {
        errors.Moves = "Move entries need a Move ID.";
        break;
      }
      if (!moveOptions.includes(pair.move)) {
        errors.Moves = "Move entries must use valid Move IDs.";
        break;
      }
    }

    const hiddenAbilities = splitList(getField("HiddenAbilities"));
    if (hiddenAbilities.some((value) => !abilityOptions.includes(value))) {
      errors.HiddenAbilities = "HiddenAbilities must use valid Ability IDs.";
    }

    const tutorMoves = splitList(getField("TutorMoves"));
    if (tutorMoves.some((value) => !moveOptions.includes(value))) {
      errors.TutorMoves = "TutorMoves must use valid Move IDs.";
    }

    const eggMoves = splitList(getField("EggMoves"));
    if (eggMoves.some((value) => !moveOptions.includes(value))) {
      errors.EggMoves = "EggMoves must use valid Move IDs.";
    }

    const evolutionsRaw = getField("Evolutions").trim();
    const evolutionEntries = parseEvolutionEntries(evolutionsRaw);
    for (const evo of evolutionEntries) {
      if (!evo.pokemon && !evo.method && !evo.parameter) continue;
      if (!evo.pokemon) {
        errors.Evolutions = "Evolution entries need a Pokemon ID.";
        break;
      }
      if (!pokemonOptions.includes(evo.pokemon)) {
        errors.Evolutions = "Evolution entries must use valid Pokemon IDs.";
        break;
      }
      if (!evo.method) {
        errors.Evolutions = "Evolution entries need a method.";
        break;
      }
      const method = evo.method;
      const paramKind = resolveEvolutionParamKind(method);
      if (paramKind === "integer") {
        if (!evo.parameter) {
          errors.Evolutions = "Evolution entries need a parameter.";
          break;
        }
        if (!/^\d+$/.test(evo.parameter) || Number(evo.parameter) < 1) {
          errors.Evolutions = "Evolution parameters must be integers of at least 1.";
          break;
        }
      } else if (paramKind === "move") {
        if (!evo.parameter) {
          errors.Evolutions = "Evolution entries need a Move ID.";
          break;
        }
        if (!moveOptions.includes(evo.parameter)) {
          errors.Evolutions = "Evolution entries must use valid Move IDs.";
          break;
        }
      } else if (paramKind === "type") {
        if (!evo.parameter) {
          errors.Evolutions = "Evolution entries need a Type ID.";
          break;
        }
        if (!typeOptions.includes(evo.parameter)) {
          errors.Evolutions = "Evolution entries must use valid Type IDs.";
          break;
        }
      } else if (paramKind === "item") {
        if (!evo.parameter) {
          errors.Evolutions = "Evolution entries need an Item ID.";
          break;
        }
        if (!itemOptions.includes(evo.parameter)) {
          errors.Evolutions = "Evolution entries must use valid Item IDs.";
          break;
        }
      } else if (paramKind === "pokemon") {
        if (!evo.parameter) {
          errors.Evolutions = "Evolution entries need a Pokemon ID.";
          break;
        }
        if (!pokemonOptions.includes(evo.parameter)) {
          errors.Evolutions = "Evolution entries must use valid Pokemon IDs.";
          break;
        }
      } else if (paramKind === "none") {
        if (evo.parameter) {
          errors.Evolutions = "Evolution entries for this method must not have a parameter.";
          break;
        }
      } else {
        if (!evo.parameter) {
          errors.Evolutions = "Evolution entries need a parameter.";
          break;
        }
        if (/\s/.test(evo.parameter)) {
          errors.Evolutions = "Evolution parameters must not contain spaces.";
          break;
        }
      }
    }

    const evsRaw = getField("EVs").trim();
    if (evsRaw) {
      const parts = evsRaw.split(",").map((part) => part.trim()).filter(Boolean);
      if (parts.length % 2 !== 0) {
        errors.EVs = "EVs must be Identifier,Value pairs.";
      } else {
        for (let index = 0; index < parts.length; index += 2) {
          const id = parts[index];
          const value = parts[index + 1];
          if (!EV_ORDER.includes(id as (typeof EV_ORDER)[number])) {
            errors.EVs = "EVs must use valid identifiers.";
            break;
          }
          if (!/^\d+$/.test(value) || Number(value) < 1) {
            errors.EVs = "EV values must be integers of at least 1.";
            break;
          }
        }
      }
    }

    const eggGroups = splitList(getField("EggGroups"));
    if (eggGroups.length === 0) {
      errors.EggGroups = "EggGroups is required.";
    }

    const hatchSteps = getField("HatchSteps").trim();
    if (hatchSteps) {
      if (!/^\d+$/.test(hatchSteps)) {
        errors.HatchSteps = "HatchSteps must be an integer.";
      } else if (Number(hatchSteps) < 1) {
        errors.HatchSteps = "HatchSteps must be at least 1.";
      }
    }

    const incense = getField("Incense").trim();
    if (incense && !itemOptions.includes(incense)) {
      errors.Incense = "Incense must be a valid Item ID.";
    }

    const offspring = splitList(getField("Offspring"));
    if (offspring.some((value) => !pokemonOptions.includes(value))) {
      errors.Offspring = "Offspring must use valid Pokemon IDs.";
    }

    const height = getField("Height").trim();
    if (!height) {
      errors.Height = "Height is required.";
    } else if (!/^\d+(\.\d)?$/.test(height)) {
      errors.Height = "Height must be a number with up to 1 decimal place.";
    }

    const weight = getField("Weight").trim();
    if (!weight) {
      errors.Weight = "Weight is required.";
    } else if (!/^\d+(\.\d)?$/.test(weight)) {
      errors.Weight = "Weight must be a number with up to 1 decimal place.";
    }

    const color = getField("Color").trim();
    if (!color) {
      errors.Color = "Color is required.";
    } else if (!COLOR_OPTIONS.includes(color as (typeof COLOR_OPTIONS)[number])) {
      errors.Color = "Color must be a valid option.";
    }

    const shape = getField("Shape").trim();
    if (!shape) {
      errors.Shape = "Shape is required.";
    } else if (!SHAPE_OPTIONS.includes(shape as (typeof SHAPE_OPTIONS)[number])) {
      errors.Shape = "Shape must be a valid option.";
    }

    const habitat = getField("Habitat").trim();
    if (!habitat) {
      errors.Habitat = "Habitat is required.";
    } else if (!HABITAT_OPTIONS.includes(habitat as (typeof HABITAT_OPTIONS)[number])) {
      errors.Habitat = "Habitat must be a valid option.";
    }

    const category = getField("Category").trim();
    if (!category) errors.Category = "Category is required.";

    const pokedex = getField("Pokedex").trim();
    if (!pokedex) errors.Pokedex = "Pokedex is required.";

    const generation = getField("Generation").trim();
    if (!generation) {
      errors.Generation = "Generation is required.";
    } else if (!/^\d+$/.test(generation)) {
      errors.Generation = "Generation must be an integer.";
    } else if (Number(generation) < 0) {
      errors.Generation = "Generation must be 0 or greater.";
    }

    const flags = splitList(getField("Flags"));
    if (flags.some((value) => /\s/.test(value))) {
      errors.Flags = "Flags must not contain spaces.";
    }

    const wildCommon = getField("WildItemCommon").trim();
    if (wildCommon && !itemOptions.includes(wildCommon)) {
      errors.WildItemCommon = "WildItemCommon must be a valid Item ID.";
    }

    const wildUncommon = getField("WildItemUncommon").trim();
    if (wildUncommon && !itemOptions.includes(wildUncommon)) {
      errors.WildItemUncommon = "WildItemUncommon must be a valid Item ID.";
    }

    const wildRare = getField("WildItemRare").trim();
    if (wildRare && !itemOptions.includes(wildRare)) {
      errors.WildItemRare = "WildItemRare must be a valid Item ID.";
    }

    return errors;
  };
  const validateAndStoreEntry = (entry: PBSEntry) => {
    const fieldErrorMap = validateEntryFields(entry);
    const idErrorMessage = validateEntryId(entry, entry.id);
    setEntryErrors((prev) => ({ ...prev, [entry.id]: fieldErrorMap }));
    setEntryIdErrors((prev) => ({ ...prev, [entry.id]: idErrorMessage }));
    return { fieldErrorMap, idErrorMessage };
  };

  const validateAllEntries = () => {
    const nextFieldErrors: Record<string, Record<string, string>> = {};
    const nextIdErrors: Record<string, string | null> = {};
    for (const entry of data.entries) {
      nextFieldErrors[entry.id] = validateEntryFields(entry);
      nextIdErrors[entry.id] = validateEntryId(entry, entry.id);
    }
    setEntryErrors(nextFieldErrors);
    setEntryIdErrors(nextIdErrors);
  };

  const fieldErrors = activeEntry ? entryErrors[activeEntry.id] ?? {} : {};

  const collectEntryErrors = (entry: PBSEntry) => {
    const errors: string[] = [];
    const idErrorMessage = entryIdErrors[entry.id];
    if (idErrorMessage) errors.push(`ID: ${idErrorMessage}`);
    const fieldErrorMap = entryErrors[entry.id] ?? {};
    for (const [key, message] of Object.entries(fieldErrorMap ?? {})) {
      errors.push(`${key}: ${message}`);
    }
    return errors;
  };

  const invalidEntries = useMemo(() => {
    return data.entries
      .map((entry) => ({ entry, errors: collectEntryErrors(entry) }))
      .filter((item) => item.errors.length > 0);
  }, [data.entries, entryErrors, entryIdErrors]);

  const hasInvalidEntries = invalidEntries.length > 0;

  const isActiveEntryDirty = useMemo(() => {
    if (!activeEntry) return false;
    const source = activeEntry.sourceFile ?? "pokemon.txt";
    const baseline = baselineEntries.find(
      (entry) => entry.id === activeEntry.id && (entry.sourceFile ?? "pokemon.txt") === source
    );
    if (!baseline) return true;
    return serializeEntries([activeEntry]) !== serializeEntries([baseline]);
  }, [activeEntry, baselineEntries]);

  const handleResetEntry = () => {
    if (!activeEntry) return;
    const source = activeEntry.sourceFile ?? "pokemon.txt";
    const baseline = baselineEntries.find(
      (entry) => entry.id === activeEntry.id && (entry.sourceFile ?? "pokemon.txt") === source
    );
    if (!baseline) {
      setData((prev) => {
        const nextEntries = prev.entries.filter((entry) => entry.id !== activeEntry.id);
        const nextActive =
          nextEntries.find((entry) => entry.order > activeEntry.order)?.id ?? nextEntries[0]?.id ?? null;
        setActiveId(nextActive);
        return { ...prev, entries: nextEntries };
      });
      setStatus(`Reset removed ${activeEntry.id}.`);
      return;
    }
    const cloned = JSON.parse(JSON.stringify(baseline)) as PBSEntry;
    setData((prev) => ({
      ...prev,
      entries: prev.entries.map((entry) => (entry.id === activeEntry.id ? cloned : entry)),
    }));
    setStatus(`Reset ${activeEntry.id}.`);
  };

  useEffect(() => {
    if (loading) return;
    validateAllEntries();
  }, [loading, typeOptions.length, abilityOptions.length, moveOptions.length, itemOptions.length]);

  useEffect(() => {
    if (!snapshot) return;
    const nextSnap = serializeEntries(data.entries);
    dirty.setDirty("pokemon", nextSnap !== snapshot);
  }, [data.entries, snapshot]);

  const handleExport = async () => {
    setStatus(null);
    setError(null);
    try {
      await exportPokemon(data, settings);
      const nextSnap = serializeEntries(data.entries);
      setSnapshot(nextSnap);
      setBaselineEntries(data.entries);
      dirty.setDirty("pokemon", false);
      const target = settings.exportMode === "PBS" ? "PBS/" : "PBS_Output/";
      setStatus(`Exported Pokemon files to ${target}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  };

  const handleAddEntry = (targetFile?: string) => {
    setStatus(null);
    setError(null);
    setIdError(null);
    const availableFiles = sourceFiles.length ? sourceFiles : ["pokemon.txt"];
    const resolvedTarget = targetFile ?? (activeSource === "ALL" ? availableFiles[0] : activeSource);
    const newId = nextAvailableId("NEWPOKEMON");
    const newEntry: PBSEntry = buildDefaultPokemonEntry(
      newId,
      nextOrderForSource(resolvedTarget),
      resolvedTarget
    );
    setData((prev) => ({
      ...prev,
      entries: [...prev.entries, newEntry],
    }));
    setActiveId(newId);
    setStatus(`Added ${newId}. Remember to export when ready.`);
    const fieldErrorMap = validateEntryFields(newEntry);
    setEntryErrors((prev) => ({ ...prev, [newId]: fieldErrorMap }));
    setEntryIdErrors((prev) => ({ ...prev, [newId]: validateEntryId(newEntry, newId) }));
  };

  const handleDuplicateEntry = (entry: PBSEntry) => {
    setStatus(null);
    setError(null);
    setIdError(null);
    const baseId = entry.id.endsWith("COPY") ? entry.id : `${entry.id}COPY`;
    const newId = nextCopyId(baseId);
    const duplicated: PBSEntry = {
      ...entry,
      id: newId,
      order: nextOrderForSource(entry.sourceFile ?? "pokemon.txt"),
      sourceFile: entry.sourceFile,
      fields: entry.fields.map((field) => ({ ...field })),
    };
    setData((prev) => ({
      ...prev,
      entries: [...prev.entries, duplicated],
    }));
    setActiveId(newId);
    setStatus(`Duplicated ${entry.id} as ${newId}.`);
    const fieldErrorMap = validateEntryFields(duplicated);
    setEntryErrors((prev) => ({ ...prev, [newId]: fieldErrorMap }));
    setEntryIdErrors((prev) => ({ ...prev, [newId]: validateEntryId(duplicated, newId) }));
  };

  const handleDeleteEntry = (entry: PBSEntry) => {
    setStatus(null);
    setError(null);
    setIdError(null);
    const confirmDelete = window.confirm(`Delete ${entry.id}? This cannot be undone.`);
    if (!confirmDelete) return;
    setData((prev) => {
      const nextEntries = prev.entries.filter((item) => item.id !== entry.id);
      const nextActive =
        nextEntries.find((item) => item.order > entry.order)?.id ??
        nextEntries[nextEntries.length - 1]?.id ??
        null;
      setActiveId(nextActive);
      return { ...prev, entries: nextEntries };
    });
    setEntryErrors((prev) => {
      const next = { ...prev };
      delete next[entry.id];
      return next;
    });
    setEntryIdErrors((prev) => {
      const next = { ...prev };
      delete next[entry.id];
      return next;
    });
    setStatus(`Deleted ${entry.id}.`);
  };

  const nextOrderForSource = (sourceFile: string) => {
    const orders = data.entries
      .filter((entry) => (entry.sourceFile ?? "pokemon.txt") === sourceFile)
      .map((entry) => entry.order + 1);
    return Math.max(0, ...orders);
  };

  const nextAvailableId = (base: string) => {
    const existing = new Set(data.entries.map((entry) => entry.id.toLowerCase()));
    if (!existing.has(base.toLowerCase())) return base;
    let counter = 2;
    while (existing.has(`${base}${counter}`.toLowerCase())) counter += 1;
    return `${base}${counter}`;
  };

  const nextCopyId = (baseId: string) => {
    const existing = new Set(data.entries.map((entry) => entry.id.toLowerCase()));
    if (!existing.has(baseId.toLowerCase())) return baseId;
    let index = 0;
    while (true) {
      const suffix = indexToLetters(index);
      const candidate = `${baseId}${suffix}`;
      if (!existing.has(candidate.toLowerCase())) return candidate;
      index += 1;
    }
  };

  const indexToLetters = (index: number) => {
    let n = index + 1;
    let result = "";
    while (n > 0) {
      const rem = (n - 1) % 26;
      result = String.fromCharCode(65 + rem) + result;
      n = Math.floor((n - 1) / 26);
    }
    return result;
  };

  const buildDefaultPokemonEntry = (id: string, order: number, sourceFile: string): PBSEntry => ({
    id,
    order,
    sourceFile,
    fields: [
      { key: "Name", value: toTitleCase(id) },
      { key: "FormName", value: "" },
      { key: "Types", value: "NORMAL" },
      { key: "GenderRatio", value: "Female50Percent" },
      { key: "GrowthRate", value: "Medium" },
      { key: "BaseExp", value: "100" },
      { key: "BaseStats", value: "1,1,1,1,1,1" },
      { key: "EVs", value: "" },
      { key: "CatchRate", value: "255" },
      { key: "Happiness", value: "70" },
      { key: "Moves", value: "" },
      { key: "Abilities", value: "" },
      { key: "HiddenAbilities", value: "" },
      { key: "TutorMoves", value: "" },
      { key: "EggMoves", value: "" },
      { key: "EggGroups", value: "Undiscovered" },
      { key: "HatchSteps", value: "" },
      { key: "Incense", value: "" },
      { key: "Offspring", value: "" },
      { key: "Height", value: "0.1" },
      { key: "Weight", value: "0.1" },
      { key: "Color", value: "Red" },
      { key: "Shape", value: "Head" },
      { key: "Habitat", value: "None" },
      { key: "Category", value: "???" },
      { key: "Pokedex", value: "???" },
      { key: "Generation", value: "0" },
      { key: "Flags", value: "" },
      { key: "WildItemCommon", value: "" },
      { key: "WildItemUncommon", value: "" },
      { key: "WildItemRare", value: "" },
      { key: "Evolutions", value: "" },
    ],
  });

  const toTitleCase = (value: string) => {
    const lower = value.toLowerCase();
    return lower ? lower[0].toUpperCase() + lower.slice(1) : "";
  };

  if (loading) {
    return <div className="panel">Loading pokemon.txt...</div>;
  }

  if (error && data.entries.length === 0) {
    return (
      <div className="panel">
        <h1>Pokemon Editor</h1>
        <p className="error">{error}</p>
      </div>
    );
  }

  return (
    <div className="editor-layout">
      <section className="list-panel">
        <div className="panel-header">
          <h1>Pokémon</h1>
          <button
            className="ghost"
            onClick={() => {
              const availableFiles = sourceFiles.length ? sourceFiles : ["pokemon.txt"];
              if (activeSource === "ALL" && availableFiles.length > 1) {
                setAddSourceDraft(availableFiles[0]);
                setShowAddSourceModal(true);
                return;
              }
              handleAddEntry();
            }}
          >
            Add New
          </button>
        </div>
        <div className="list-filter">
          <select
            className="input"
            value={activeSource}
            onChange={(event) => setActiveSource(event.target.value)}
          >
            <option value="ALL">All files</option>
            {sourceFiles.map((file) => (
              <option key={file} value={file}>
                {file}
              </option>
            ))}
          </select>
        </div>
        <div className="list-filter">
          <input
            className="input"
            placeholder="Filter by ID..."
            value={filter}
            onChange={(event) => setFilter(event.target.value.toUpperCase())}
          />
        </div>
        <div className="list">
          {filteredEntries.map((entry) => (
            <button
              key={entry.id}
              className={`list-item list-item-iconic ${entry.id === activeId ? "active" : ""}`}
              onClick={() => setActiveId(entry.id)}
            >
              <div className="list-item-content">
                <div className="list-item-text">
                  <div className="list-title">{entry.id}</div>
                  <div className="list-sub">
                    {getFieldValue(entry, "Name") || "(no name)"}{" "}
                    {activeSource === "ALL" && entry.sourceFile ? `• ${entry.sourceFile}` : ""}
                  </div>
                </div>
                <span className="list-item-icon" aria-hidden="true">
                  <img
                    src={`/assets/graphics/Pokemon/Icons/${entry.id}.png`}
                    alt=""
                    loading="lazy"
                    onError={(event) => {
                      const img = event.currentTarget;
                      if (img.dataset.fallback === "1") return;
                      img.dataset.fallback = "1";
                      img.src = "/assets/graphics/Pokemon/Icons/000.png";
                    }}
                  />
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>
      <section className="detail-panel">
        {activeEntry ? (
          <PokemonDetail
            entry={activeEntry}
            onChange={updateEntry}
            onRename={updateEntryId}
            onValidateId={validateEntryId}
            onValidateEntry={validateAndStoreEntry}
            onDuplicate={handleDuplicateEntry}
            onDelete={handleDeleteEntry}
            onMoveEntry={() => setShowMoveModal(true)}
            canMoveEntry={activeSource !== "ALL"}
            idError={idError}
            onSetIdError={setIdError}
            fieldErrors={fieldErrors}
            typeOptions={typeOptions}
            abilityOptions={abilityOptions}
            moveOptions={moveOptions}
            itemOptions={itemOptions}
            pokemonOptions={pokemonOptions}
          />
        ) : (
          <div className="panel">Select a Pokemon to edit.</div>
        )}
        {activeEntry && (
          <MoveEntryModal
            open={showMoveModal}
            total={
              activeEntry
                ? data.entries.filter(
                    (entry) => (entry.sourceFile ?? "pokemon.txt") === (activeEntry.sourceFile ?? "pokemon.txt")
                  ).length
                : data.entries.length
            }
            title={activeEntry.id}
            onClose={() => setShowMoveModal(false)}
            onMove={(targetIndex) => {
              const nextEntries = moveEntryByIdWithinSource(
                data.entries,
                activeEntry.id,
                activeEntry.sourceFile ?? "pokemon.txt",
                targetIndex
              );
              setData({ entries: nextEntries });
            }}
          />
        )}
        {showAddSourceModal && (
          <div className="modal-backdrop">
            <div className="modal">
              <h2>Add Pokémon</h2>
              <p>Select which file this entry should be added to.</p>
              <div className="field-list">
                <div className="field-row single">
                  <label className="label">Target file</label>
                  <select
                    className="input"
                    value={addSourceDraft}
                    onChange={(event) => setAddSourceDraft(event.target.value)}
                  >
                    {sourceFiles.map((file) => (
                      <option key={file} value={file}>
                        {file}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="button-row">
                <button className="ghost" onClick={() => setShowAddSourceModal(false)}>
                  Cancel
                </button>
                <button
                  className="primary"
                  onClick={() => {
                    handleAddEntry(addSourceDraft || "pokemon.txt");
                    setShowAddSourceModal(false);
                  }}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
        {showAddSourceModal && (
          <div className="modal-backdrop">
            <div className="modal">
              <h2>Add Pokémon</h2>
              <p>Select which file this entry should be added to.</p>
              <div className="field-list">
                <div className="field-row single">
                  <label className="label">Target file</label>
                  <select
                    className="input"
                    value={addSourceDraft}
                    onChange={(event) => setAddSourceDraft(event.target.value)}
                  >
                    {sourceFiles.map((file) => (
                      <option key={file} value={file}>
                        {file}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="button-row">
                <button className="ghost" onClick={() => setShowAddSourceModal(false)}>
                  Cancel
                </button>
                <button
                  className="primary"
                  onClick={() => {
                    handleAddEntry(addSourceDraft || "pokemon.txt");
                    setShowAddSourceModal(false);
                  }}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
        {invalidEntries.length > 0 && (
          <section className="panel">
            <div className="panel-header">
              <h2>Validation Issues</h2>
              <div className="muted">Fix these before exporting.</div>
            </div>
            <div className="field-list">
              {invalidEntries.map(({ entry, errors }) => (
                <div key={entry.id} className="list-field">
                  <div className="list-field-row">
                    <strong>{entry.id}</strong>
                    <button
                      className="ghost"
                      onClick={() => {
                        setActiveId(entry.id);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Go to entry
                    </button>
                  </div>
                  <div className="muted">
                    {errors.map((message, index) => (
                      <div key={`${entry.id}-${index}`}>{message}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </section>
      <section className="export-bar">
        <div className="export-settings">
          <button className="ghost settings" title="Settings" onClick={openSettings}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z"/>
            </svg>
          </button>
          <span className="export-mode">
            {settings.exportMode === "PBS"
              ? `PBS${settings.createBackup ? ` (backup${settings.backupLimit > 0 ? `: ${settings.backupLimit}` : ""})` : ""}`
              : "PBS_Output"}
          </span>
        </div>
        <div className="export-actions" onMouseEnter={validateAllEntries}>
          {status && <span className="status">{status}</span>}
          {error && <span className="error">{error}</span>}
          {showTop && (
            <button
              className="ghost top"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              title="Back to top"
            ><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="m7.247 4.86-4.796 5.481c-.566.647-.106 1.659.753 1.659h9.592a1 1 0 0 0 .753-1.659l-4.796-5.48a1 1 0 0 0-1.506 0z"/>
            </svg></button>
          )}
          <button className="ghost reset" onClick={handleResetEntry} disabled={!isActiveEntryDirty}>
            Reset
          </button>
          <button className="primary" onClick={handleExport} disabled={Boolean(idError) || hasInvalidEntries}>
            Export pokemon.txt
          </button>
          {hasInvalidEntries && <span className="muted">Fix validation issues before export.</span>}
        </div>
      </section>
    </div>
  );
}

type DetailProps = {
  entry: PBSEntry;
  onChange: (entry: PBSEntry) => void;
  onRename: (entry: PBSEntry, nextId: string) => void;
  onValidateId: (entry: PBSEntry, nextId: string) => string | null;
  onValidateEntry: (entry: PBSEntry) => void;
  onDuplicate: (entry: PBSEntry) => void;
  onDelete: (entry: PBSEntry) => void;
  onMoveEntry: () => void;
  canMoveEntry: boolean;
  idError: string | null;
  onSetIdError: (value: string | null) => void;
  fieldErrors: Record<string, string>;
  typeOptions: string[];
  abilityOptions: string[];
  moveOptions: string[];
  itemOptions: string[];
  pokemonOptions: string[];
};

function PokemonDetail({
  entry,
  onChange,
  onRename,
  onValidateId,
  onValidateEntry,
  onDuplicate,
  onDelete,
  onMoveEntry,
  canMoveEntry,
  idError,
  onSetIdError,
  fieldErrors,
  typeOptions,
  abilityOptions,
  moveOptions,
  itemOptions,
  pokemonOptions,
}: DetailProps) {
  const [idDraft, setIdDraft] = useState(entry.id);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const validateTimer = useRef<number | null>(null);

  useEffect(() => {
    setIdDraft(entry.id);
  }, [entry.id]);

  useEffect(() => {
    return () => {
      if (validateTimer.current !== null) {
        window.clearTimeout(validateTimer.current);
      }
    };
  }, []);


  const scheduleValidate = () => {
    if (validateTimer.current !== null) {
      window.clearTimeout(validateTimer.current);
    }
    validateTimer.current = window.setTimeout(() => {
      onValidateEntry(entry);
    }, 0);
  };

  const updateFieldValue = (key: string, value: string) => {
    const index = entry.fields.findIndex((field) => field.key === key);
    if (index < 0) return;
    const nextFields = entry.fields.map((field, idx) =>
      idx == index ? { ...field, value } : field
    );
    onChange({ ...entry, fields: nextFields });
  };

  const updateFieldKey = (oldKey: string, nextKey: string, value: string) => {
    const index = entry.fields.findIndex((field) => field.key === oldKey);
    if (index < 0) return;
    const nextFields = entry.fields.map((field, idx) =>
      idx == index ? { key: nextKey, value } : field
    );
    onChange({ ...entry, fields: nextFields });
  };

  const addField = () => {
    onChange({
      ...entry,
      fields: [...entry.fields, { key: "NewKey", value: "" }],
    });
  };

  const getFieldValue = (key: string) => entry.fields.find((field) => field.key === key)?.value ?? "";
  const setFieldValue = (key: string, value: string) => {
    const index = entry.fields.findIndex((field) => field.key === key);
    if (index === -1) return;
    updateFieldValue(key, value);
  };

  const typesValue = getFieldValue("Types");
  const typeParts = splitList(typesValue);
  const primaryType = typeParts[0] ?? "";
  const secondaryType = typeParts[1] ?? "";

  const abilitiesValue = getFieldValue("Abilities");
  const abilityParts = splitList(abilitiesValue);
  const ability1 = abilityParts[0] ?? "";
  const ability2 = abilityParts[1] ?? "";
  const baseStats = parseBaseStats(getFieldValue("BaseStats"));
  const evMap = parseEVMap(getFieldValue("EVs"));
  const statInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const evInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const updateTypes = (primary: string, secondary: string) => {
    if (!primary) {
      setFieldValue("Types", "");
      return;
    }
    const safePrimary = primary.toUpperCase();
    const safeSecondary = secondary.toUpperCase();
    if (safeSecondary && safeSecondary !== "NONE") {
      setFieldValue("Types", `${safePrimary},${safeSecondary}`);
    } else {
      setFieldValue("Types", safePrimary);
    }
  };

  const updateAbilities = (first: string, second: string) => {
    if (!first) {
      setFieldValue("Abilities", "");
      return;
    }
    if (second) {
      setFieldValue("Abilities", `${first},${second}`);
    } else {
      setFieldValue("Abilities", first);
    }
  };

  const updateEvolutions = (
    entries: { pokemon: string; method: string; parameter: string }[],
    index: number,
    next: Partial<{ pokemon: string; method: string; parameter: string }>
  ) => {
    const nextEntries = entries.map((entry, idx) => (idx === index ? { ...entry, ...next } : entry));
    const updated = nextEntries[index];
    const paramKind = resolveEvolutionParamKind(updated.method);
    if (paramKind === "none") {
      updated.parameter = "";
    }
    setFieldValue("Evolutions", buildEvolutionString(nextEntries));
  };

  return (
    <div className="panel" onBlurCapture={scheduleValidate}>
      <div className="panel-header">
        <h2>{entry.id}</h2>
        <div className="button-row">
          <button
            className={`ghost${canMoveEntry ? "" : " disabled"}`}
            onClick={onMoveEntry}
            disabled={!canMoveEntry}
            title={!canMoveEntry ? "Can't move while viewing all files." : ""}
          >
            Move Entry
          </button>
          <button className="ghost" onClick={() => onDuplicate(entry)}>
            Duplicate
          </button>
          <button className="ghost" onClick={addField}>
            Add Field
          </button>
          <button className="danger" tabIndex={-1} onClick={() => onDelete(entry)}>
            Delete
          </button>
        </div>
      </div>
      <div className="pokemon-sprite pokemon-sprite-left">
        <img
          src={`/assets/graphics/Pokemon/Front/${entry.id}.png`}
          key={entry.id}
          alt=""
          width={96}
          height={96}
          onLoad={(event) => {
            event.currentTarget.style.visibility = "visible";
          }}
          onError={(event) => {
            const img = event.currentTarget;
            if (img.dataset.fallback === "1") {
              img.style.visibility = "hidden";
              return;
            }
            img.dataset.fallback = "1";
            img.src = "/assets/graphics/Pokemon/Front/000.png";
          }}
        />
      </div>
      <div className="field-list">
        <div className="field-row single" data-field-key="ID">
          <label className="label">{formatKeyLabel("Pokemon ID")}</label>
          <input
            className="input"
            value={idDraft}
            onChange={(event) => {
              const nextDraft = event.target.value.toUpperCase();
              setIdDraft(nextDraft);
              const errorMessage = onValidateId(entry, nextDraft);
              onSetIdError(errorMessage);
              if (!errorMessage && nextDraft !== entry.id) {
                onRename(entry, nextDraft);
              }
            }}
          />
          {idError && <span className="field-error">{idError}</span>}
        </div>
      </div>
      <div className="field-list">
        {getOrderedFields(entry.fields, DISPLAY_FIELD_ORDER).map((field, index) => {
          if (field.key === "Name") {
            return (
              <div key={`${field.key}-${index}`} className="field-row" data-field-key="Name">
                <input className="input key-label" value={formatKeyLabel("Name")} readOnly tabIndex={-1} />
                <input
                  className="input"
                  value={field.value}
                  onChange={(event) => updateFieldValue(field.key, event.target.value)}
                />
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "FormName") {
            return (
              <div key={`${field.key}-${index}`} className="field-row" data-field-key="FormName">
                <input className="input key-label" value={formatKeyLabel("FormName")} readOnly tabIndex={-1} />
                <input
                  className="input"
                  value={field.value}
                  onChange={(event) => updateFieldValue(field.key, event.target.value)}
                />
              </div>
            );
          }

          if (field.key === "Types") {
            const typesMatch = primaryType && secondaryType && primaryType === secondaryType;
            return (
              <div key={`${field.key}-${index}`} className="field-row" data-field-key="Types">
                <input className="input key-label" value={formatKeyLabel("PrimaryType")} readOnly tabIndex={-1} />
                <input
                  className="input"
                  list="type-options"
                  value={primaryType || ""}
                  onChange={(event) => updateTypes(event.target.value.toUpperCase(), secondaryType)}
                />
                {primaryType && (
                  <>
                    <input className="input key-label" value={formatKeyLabel("SecondaryType")} readOnly tabIndex={-1} />
                    <input
                      className="input"
                      list="type-options"
                      value={secondaryType || ""}
                      placeholder="(None)"
                      onChange={(event) => updateTypes(primaryType, event.target.value.toUpperCase())}
                    />
                  </>
                )}
                {fieldErrors.Types && (
                  <div className="field-row single">
                    <span className="field-error">{fieldErrors.Types}</span>
                  </div>
                )}
                {typesMatch && (
                  <div className="field-row single">
                    <span className="field-warning">
                      SecondaryType matches PrimaryType; export will use PrimaryType only.
                    </span>
                  </div>
                )}
              </div>
            );
          }

          if (field.key === "GenderRatio") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input key-label" value={formatKeyLabel("GenderRatio")} readOnly tabIndex={-1} />
                <select
                  className="input"
                  value={field.value}
                  onChange={(event) => updateFieldValue(field.key, event.target.value)}
                >
                  {GENDER_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "GrowthRate") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input key-label" value={formatKeyLabel("GrowthRate")} readOnly tabIndex={-1} />
                <select
                  className="input"
                  value={field.value}
                  onChange={(event) => updateFieldValue(field.key, event.target.value)}
                >
                  {GROWTH_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option === "Medium"
                        ? "Medium / Medium Fast"
                        : option === "Parabolic"
                        ? "Parabolic / Medium Slow"
                        : option}
                    </option>
                  ))}
                </select>
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "BaseExp" || field.key === "CatchRate" || field.key === "Happiness") {
            const warn =
              (field.key === "CatchRate" || field.key === "Happiness") && Number(field.value || 0) > 255;
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input key-label" value={formatKeyLabelIfKnown(field.key)} readOnly tabIndex={-1} />
                <input
                  className="input"
                  value={field.value}
                  onChange={(event) => updateFieldValue(field.key, event.target.value)}
                />
                {warn && <span className="field-warning">Values above 255 have no effect.</span>}
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "BaseStats") {
            return (
              <div key={`${field.key}-${index}`} className="list-field" data-field-key="BaseStats">
                <div className="list-field-label">BASE STATS</div>
                <div className="stats-grid">
                  {STAT_DISPLAY.map((stat, displayIndex) => (
                    <div key={stat.key} className="stats-row">
                      <div className="stats-label">{stat.label}</div>
                      <input
                        className="input"
                        value={baseStats[stat.fileIndex] ?? "1"}
                        ref={(el) => {
                          statInputRefs.current[displayIndex] = el;
                        }}
                        onKeyDown={(event) => {
                          if (event.key !== "Tab") return;
                          const currentIndex = displayIndex;
                          if (event.shiftKey) {
                            if (currentIndex > 0) {
                              event.preventDefault();
                              statInputRefs.current[currentIndex - 1]?.focus();
                            }
                            return;
                          }
                          if (currentIndex < STAT_DISPLAY.length - 1) {
                            event.preventDefault();
                            statInputRefs.current[currentIndex + 1]?.focus();
                          } else {
                            event.preventDefault();
                            evInputRefs.current[0]?.focus();
                          }
                        }}
                        onChange={(event) => {
                          const next = event.target.value;
                          const nextStats = [...baseStats];
                          nextStats[stat.fileIndex] = next;
                          setFieldValue("BaseStats", nextStats.join(","));
                        }}
                      />
                      <div className="stats-ev-label">EV</div>
                      <input
                        className="input stats-ev-input"
                        value={evMap.get(stat.key) ?? "0"}
                        ref={(el) => {
                          evInputRefs.current[displayIndex] = el;
                        }}
                        onKeyDown={(event) => {
                          if (event.key !== "Tab") return;
                          const currentIndex = displayIndex;
                          if (event.shiftKey) {
                            if (currentIndex === 0) {
                              event.preventDefault();
                              statInputRefs.current[STAT_DISPLAY.length - 1]?.focus();
                            } else {
                              event.preventDefault();
                              evInputRefs.current[currentIndex - 1]?.focus();
                            }
                            return;
                          }
                          if (currentIndex < STAT_DISPLAY.length - 1) {
                            event.preventDefault();
                            evInputRefs.current[currentIndex + 1]?.focus();
                          }
                        }}
                        onChange={(event) => {
                          const next = event.target.value.trim();
                          const nextMap = new Map(evMap);
                          if (!next || Number(next) === 0) {
                            nextMap.delete(stat.key);
                          } else {
                            nextMap.set(stat.key, next);
                          }
                          setFieldValue("EVs", buildEVsString(nextMap));
                        }}
                      />
                    </div>
                  ))}
                </div>
                {fieldErrors.BaseStats && <span className="field-error">{fieldErrors.BaseStats}</span>}
                {fieldErrors.EVs && <span className="field-error">{fieldErrors.EVs}</span>}
              </div>
            );
          }

          if (field.key === "EVs") {
            return null;
          }

          if (field.key === "Abilities") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input key-label" value={formatKeyLabel("Ability1")} readOnly tabIndex={-1} />
                <input
                  className="input"
                  list="ability-options"
                  value={ability1}
                  placeholder="(none)"
                  onChange={(event) => {
                    const next = event.target.value;
                    if (!next) {
                      updateAbilities("", "");
                    } else {
                      updateAbilities(next, ability2);
                    }
                  }}
                />
                {ability1 && (
                  <>
                    <input className="input key-label" value={formatKeyLabel("Ability2")} readOnly tabIndex={-1} />
                    <input
                      className="input"
                      list="ability-options"
                      value={ability2}
                      placeholder="(none)"
                      onChange={(event) => updateAbilities(ability1, event.target.value)}
                    />
                  </>
                )}
                {fieldErrors.Abilities && <span className="field-error">{fieldErrors.Abilities}</span>}
              </div>
            );
          }

          if (field.key === "Moves") {
            const pairs = ensureMovePairs(parseMovePairs(field.value));
            return (
              <div key={`${field.key}-${index}`} className="list-field">
                <div className="list-field-header">
                  <div className="list-field-label">Moves</div>
                </div>
                <div className="moves-grid">
                  {pairs.map((pair, pairIndex) => (
                    <div key={`move-${pairIndex}`} className="moves-row">
                      <input
                        className="input moves-level"
                        value={pair.level}
                        placeholder="Level"
                        onChange={(event) => {
                          const next = event.target.value;
                          const nextPairs = updateMovePair(pairs, pairIndex, next, pair.move, false);
                          setFieldValue("Moves", buildMovesString(nextPairs));
                        }}
                        onBlur={() => {
                          const nextPairs = updateMovePair(pairs, pairIndex, pair.level, pair.move, true);
                          setFieldValue("Moves", buildMovesString(nextPairs));
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            const nextPairs = updateMovePair(pairs, pairIndex, pair.level, pair.move, true);
                            setFieldValue("Moves", buildMovesString(nextPairs));
                          }
                        }}
                      />
                      <input
                        className="input"
                        list="move-options"
                        value={pair.move}
                        placeholder="Select move..."
                        onChange={(event) => {
                          const nextPairs = updateMovePair(pairs, pairIndex, pair.level, event.target.value, false);
                          setFieldValue("Moves", buildMovesString(nextPairs));
                        }}
                        onBlur={() => {
                          const nextPairs = updateMovePair(pairs, pairIndex, pair.level, pair.move, true);
                          setFieldValue("Moves", buildMovesString(nextPairs));
                        }}
                      />
                      <button
                        className="danger" tabIndex={-1}
                        onClick={() => {
                          const nextPairs = pairs.filter((_, idx) => idx !== pairIndex);
                          setFieldValue("Moves", buildMovesString(nextPairs));
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                {fieldErrors.Moves && <span className="field-error">{fieldErrors.Moves}</span>}
                <datalist id="move-options">
                  {moveOptions.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </div>
            );
          }

          if (field.key === "Evolutions") {
            const evolutions = ensureEvolutionEntries(parseEvolutionEntries(field.value));
            return (
              <div key={`${field.key}-${index}`} className="list-field">
                <div className="list-field-header">
                  <div className="list-field-label">Evolutions</div>
                </div>
                <div className="moves-grid">
                  {evolutions.map((evo, evoIndex) => {
                    const paramKind = resolveEvolutionParamKind(evo.method);
                    return (
                      <div key={`evo-${evoIndex}`} className="moves-row">
                        <input
                          className="input"
                          list="pokemon-options"
                          value={evo.pokemon}
                          placeholder="ID"
                          onChange={(event) =>
                            updateEvolutions(evolutions, evoIndex, { pokemon: event.target.value })
                          }
                        />
                        <input
                          className="input"
                          list="evolution-method-options"
                          value={evo.method}
                          placeholder="Method"
                          onChange={(event) =>
                            updateEvolutions(evolutions, evoIndex, { method: event.target.value })
                          }
                        />
                        {paramKind === "integer" && (
                          <input
                            className="input"
                            value={evo.parameter}
                            placeholder="Parameter"
                            onChange={(event) =>
                              updateEvolutions(evolutions, evoIndex, { parameter: event.target.value })
                            }
                          />
                        )}
                        {paramKind === "move" && (
                          <input
                            className="input"
                            list="move-options"
                            value={evo.parameter}
                            placeholder="Move ID"
                            onChange={(event) =>
                              updateEvolutions(evolutions, evoIndex, { parameter: event.target.value })
                            }
                          />
                        )}
                        {paramKind === "type" && (
                          <input
                            className="input"
                            list="type-options"
                            value={evo.parameter}
                            placeholder="Type ID"
                            onChange={(event) =>
                              updateEvolutions(evolutions, evoIndex, { parameter: event.target.value })
                            }
                          />
                        )}
                        {paramKind === "item" && (
                          <input
                            className="input"
                            list="item-options"
                            value={evo.parameter}
                            placeholder="Item ID"
                            onChange={(event) =>
                              updateEvolutions(evolutions, evoIndex, { parameter: event.target.value })
                            }
                          />
                        )}
                        {paramKind === "pokemon" && (
                          <input
                            className="input"
                            list="pokemon-options"
                            value={evo.parameter}
                            placeholder="Pokemon ID"
                            onChange={(event) =>
                              updateEvolutions(evolutions, evoIndex, { parameter: event.target.value })
                            }
                          />
                        )}
                        {paramKind === "none" && (
                          <input
                            className="input"
                            value={evo.parameter}
                            placeholder="(none)"
                            onChange={(event) =>
                              updateEvolutions(evolutions, evoIndex, { parameter: event.target.value })
                            }
                          />
                        )}
                        {paramKind === "string" && (
                          <input
                            className="input"
                            value={evo.parameter}
                            placeholder="Parameter"
                            onChange={(event) =>
                              updateEvolutions(evolutions, evoIndex, { parameter: event.target.value })
                            }
                          />
                        )}
                        <button
                          className="danger" tabIndex={-1}
                          onClick={() => {
                            const nextList = evolutions.filter((_, idx) => idx !== evoIndex);
                            setFieldValue("Evolutions", buildEvolutionString(nextList));
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
                {fieldErrors.Evolutions && <span className="field-error">{fieldErrors.Evolutions}</span>}
              </div>
            );
          }

          if (field.key === "HiddenAbilities") {
            return (
              <SelectListField
                key={`${field.key}-${index}`}
                label="HiddenAbilities"
                value={field.value}
                options={abilityOptions}
                onChange={(nextValue) => updateFieldValue(field.key, nextValue)}
                error={fieldErrors[field.key]}
                inputMode="datalist"
                datalistId="ability-options"
                renderDatalist={false}
              />
            );
          }

          if (field.key === "TutorMoves") {
            return (
              <SelectListField
                key={`${field.key}-${index}`}
                label="TutorMoves"
                value={field.value}
                options={moveOptions}
                onChange={(nextValue) => updateFieldValue(field.key, nextValue.toUpperCase())}
                error={fieldErrors[field.key]}
                inputMode="datalist"
                datalistId="move-options"
                renderDatalist={false}
              />
            );
          }

          if (field.key === "EggMoves") {
            return (
              <SelectListField
                key={`${field.key}-${index}`}
                label="EggMoves"
                value={field.value}
                options={moveOptions}
                onChange={(nextValue) => updateFieldValue(field.key, nextValue.toUpperCase())}
                error={fieldErrors[field.key]}
                inputMode="datalist"
                datalistId="move-options"
                renderDatalist={false}
              />
            );
          }

          if (field.key === "EggGroups") {
            return (
              <SelectListField
                key={`${field.key}-${index}`}
                label="EggGroups"
                value={field.value}
                options={EGG_GROUP_OPTIONS}
                onChange={(nextValue) => updateFieldValue(field.key, nextValue)}
                error={fieldErrors[field.key]}
                inputMode="datalist"
              />
            );
          }

          if (field.key === "HatchSteps") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input key-label" value={formatKeyLabel("HatchSteps")} readOnly tabIndex={-1} />
                <input
                  className="input"
                  value={field.value}
                  onFocus={() => setFocusedField(field.key)}
                  onBlur={() => setFocusedField(null)}
                  onChange={(event) => updateFieldValue(field.key, event.target.value)}
                />
                {focusedField === field.key && (
                  <span className="field-hint">As of Scarlet &amp; Violet 1 cycle = 128 steps.</span>
                )}
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "Incense") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input key-label" value={formatKeyLabel("Incense")} readOnly tabIndex={-1} />
                <input
                  className="input"
                  list="item-options"
                  value={field.value}
                  placeholder="(none)"
                  onChange={(event) => updateFieldValue(field.key, event.target.value)}
                />
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "Offspring") {
            return (
              <SelectListField
                key={`${field.key}-${index}`}
                label="Offspring"
                value={field.value}
                options={pokemonOptions}
                onChange={(nextValue) => updateFieldValue(field.key, nextValue)}
                error={fieldErrors[field.key]}
                inputMode="datalist"
                datalistId="pokemon-options"
                renderDatalist={false}
              />
            );
          }

          if (field.key === "Height" || field.key === "Weight") {
            const hint = field.key === "Height" ? "Value in meters." : "Value in kilograms.";
            const showHint = focusedField === field.key;
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input key-label" value={formatKeyLabelIfKnown(field.key)} readOnly tabIndex={-1} />
                <input
                  className="input"
                  value={field.value}
                  onFocus={() => setFocusedField(field.key)}
                  onBlur={() => setFocusedField(null)}
                  onChange={(event) => updateFieldValue(field.key, event.target.value.replace(",", "."))}
                />
                {showHint && <span className="field-hint">{hint}</span>}
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "Color") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input key-label" value={formatKeyLabel("Color")} readOnly tabIndex={-1} />
                <select
                  className="input"
                  value={field.value}
                  onChange={(event) => updateFieldValue(field.key, event.target.value)}
                >
                  {COLOR_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "Shape") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input key-label" value={formatKeyLabel("Shape")} readOnly tabIndex={-1} />
                <select
                  className="input"
                  value={field.value}
                  onChange={(event) => updateFieldValue(field.key, event.target.value)}
                >
                  {SHAPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "Habitat") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input key-label" value={formatKeyLabel("Habitat")} readOnly tabIndex={-1} />
                <select
                  className="input"
                  value={field.value}
                  onChange={(event) => updateFieldValue(field.key, event.target.value)}
                >
                  {HABITAT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "Category" || field.key === "Pokedex") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input key-label" value={formatKeyLabelIfKnown(field.key)} readOnly tabIndex={-1} />
                <input
                  className="input"
                  value={field.value}
                  onChange={(event) => updateFieldValue(field.key, event.target.value)}
                />
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "Generation") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input key-label" value={formatKeyLabel("Generation")} readOnly tabIndex={-1} />
                <input
                  className="input"
                  value={field.value}
                  onChange={(event) => updateFieldValue(field.key, event.target.value)}
                />
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "Flags") {
            return (
              <ListFieldEditor
                key={`${field.key}-${index}`}
                label="Flags"
                value={field.value}
                options={FLAG_OPTIONS}
                onChange={(nextValue) => updateFieldValue(field.key, nextValue)}
                error={fieldErrors[field.key]}
              />
            );
          }

          if (field.key === "WildItemCommon" || field.key === "WildItemUncommon" || field.key === "WildItemRare") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input key-label" value={formatKeyLabelIfKnown(field.key)} readOnly tabIndex={-1} />
                <input
                  className="input"
                  list="item-options"
                  value={field.value}
                  placeholder="(none)"
                  onChange={(event) => updateFieldValue(field.key, event.target.value)}
                />
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          return (
            <div key={`${field.key}-${index}`} className="field-row">
              {formatKeyLabelIfKnown(field.key) !== field.key ? (
                <input className="input key-label" value={formatKeyLabelIfKnown(field.key)} readOnly tabIndex={-1} />
              ) : (
                <input
                  className="input"
                  value={field.key}
                  onChange={(event) => updateFieldKey(field.key, event.target.value, field.value)}
                />
              )}
              <input
                className="input"
                value={field.value}
                onChange={(event) => updateFieldValue(field.key, event.target.value)}
              />
              {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
            </div>
          );
        })}
        <datalist id="type-options">
          {typeOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
        <datalist id="ability-options">
          {abilityOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
        <datalist id="pokemon-options">
          {pokemonOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
        <datalist id="type-options">
          {typeOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
        <datalist id="evolution-method-options">
          {EVOLUTION_METHOD_OPTIONS.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
        <datalist id="item-options">
          {itemOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </div>
    </div>
  );
}

type SelectListFieldProps = {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (nextValue: string) => void;
  error?: string;
  inputMode?: "select" | "datalist";
  datalistId?: string;
  renderDatalist?: boolean;
};

const SelectListField = memo(function SelectListField({
  label,
  value,
  options,
  onChange,
  error,
  inputMode = "select",
  datalistId,
  renderDatalist = true,
}: SelectListFieldProps) {
  const displayLabel = formatKeyLabel(label);
  const items = splitList(value);
  const [draft, setDraft] = useState("");
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const canCollapse = items.length > 5;
  const [collapsed, setCollapsed] = useState(canCollapse);
  const resolvedDatalistId = datalistId ?? `${label}-options`;

  useEffect(() => {
    if (!canCollapse) setCollapsed(false);
  }, [canCollapse]);
  useEffect(() => {
    setDrafts({});
  }, [value]);

  const updateAt = (index: number, next: string) => {
    if (!next) return;
    const nextItems = [...items];
    if (index === items.length) {
      nextItems.push(next);
    } else {
      nextItems[index] = next;
    }
    const deduped = nextItems.filter((item, idx) => nextItems.indexOf(item) === idx);
    onChange(deduped.join(","));
  };

  const commitAt = (index: number) => {
    const next = (drafts[index] ?? items[index] ?? "").trim();
    if (!next) {
      setDrafts((prev) => {
        if (!(index in prev)) return prev;
        const updated = { ...prev };
        delete updated[index];
        return updated;
      });
      return;
    }
    updateAt(index, next);
    setDrafts((prev) => {
      if (!(index in prev)) return prev;
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });
  };

  const commitDraft = () => {
    const next = draft.trim();
    if (!next) return;
    updateAt(items.length, next);
    setDraft("");
  };

  const removeAt = (index: number) => {
    const nextItems = [...items];
    nextItems.splice(index, 1);
    onChange(nextItems.join(","));
  };

  return (
    <div className="list-field">
      <div className="list-field-header">
        <div className="list-field-label">{displayLabel}</div>
        {canCollapse && (
          <button className="ghost" onClick={() => setCollapsed((prev) => !prev)} tabIndex={-1}>
            {collapsed ? `Show (${items.length}) ▾` : "Hide ▴"}
          </button>
        )}
      </div>
      {!collapsed && (
        <div className="list-field-items">
          {items.map((item, index) => (
            <div key={`${label}-${index}`} className="list-field-row">
              {inputMode === "datalist" ? (
                <input
                  className="input"
                  list={resolvedDatalistId}
                  value={drafts[index] ?? item}
                  onChange={(event) =>
                    setDrafts((prev) => ({ ...prev, [index]: event.target.value }))
                  }
                  onBlur={() => commitAt(index)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitAt(index);
                    }
                  }}
                />
              ) : (
                <select
                  className="input"
                  value={item}
                  onChange={(event) => updateAt(index, event.target.value)}
                >
                  {options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              )}
              <button className="danger" tabIndex={-1} onClick={() => removeAt(index)}>
                Remove
              </button>
            </div>
          ))}
          <div className="list-field-row">
            {inputMode === "datalist" ? (
              <input
                className="input"
                list={resolvedDatalistId}
                value={draft}
                placeholder={`Add ${displayLabel}...`}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={commitDraft}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitDraft();
                  }
                }}
              />
            ) : (
              <select className="input" value="" onChange={(event) => updateAt(items.length, event.target.value)}>
                <option value="">Add {displayLabel}...</option>
                {options
                  .filter((option) => !items.includes(option))
                  .map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
              </select>
            )}
          </div>
          {inputMode === "datalist" && renderDatalist && (
            <datalist id={resolvedDatalistId}>
              {options.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          )}
        </div>
      )}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
});

type ListFieldEditorProps = {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (nextValue: string) => void;
  error?: string;
};

const ListFieldEditor = memo(function ListFieldEditor({ label, value, options, onChange, error }: ListFieldEditorProps) {
  const displayLabel = formatKeyLabel(label);
  const items = splitList(value);
  const [draft, setDraft] = useState("");
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const canCollapse = items.length > 5;
  const [collapsed, setCollapsed] = useState(canCollapse);

  useEffect(() => {
    if (!canCollapse) setCollapsed(false);
  }, [canCollapse]);
  useEffect(() => {
    setDrafts({});
  }, [value]);

  const handleSelectChange = (index: number, next: string) => {
    const normalized = normalizeOption(next, options);
    const nextItems = [...items];
    if (normalized === "") {
      nextItems.splice(index, 1);
    } else if (index === items.length) {
      nextItems.push(normalized);
    } else {
      nextItems[index] = normalized;
    }
    const deduped = nextItems.filter((item, idx) => nextItems.indexOf(item) === idx);
    onChange(deduped.join(","));
  };

  const commitDraft = () => {
    const next = draft.trim();
    if (!next) return;
    handleSelectChange(items.length, next);
    setDraft("");
  };

  const commitAt = (index: number) => {
    const next = (drafts[index] ?? items[index] ?? "").trim();
    if (!next) {
      setDrafts((prev) => {
        if (!(index in prev)) return prev;
        const updated = { ...prev };
        delete updated[index];
        return updated;
      });
      return;
    }
    handleSelectChange(index, next);
    setDrafts((prev) => {
      if (!(index in prev)) return prev;
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });
  };

  return (
    <div className="list-field">
      <div className="list-field-header">
        <div className="list-field-label">{displayLabel}</div>
        {canCollapse && (
          <button className="ghost" onClick={() => setCollapsed((prev) => !prev)} tabIndex={-1}>
            {collapsed ? `Show (${items.length}) ▾` : "Hide ▴"}
          </button>
        )}
      </div>
      {!collapsed && (
        <div className="list-field-items">
        {items.map((item, index) => (
          <div key={`${label}-${index}`} className="list-field-row">
            <input
              className="input"
              list={`${label}-options`}
              value={drafts[index] ?? item}
              onChange={(event) =>
                setDrafts((prev) => ({ ...prev, [index]: event.target.value }))
              }
              onBlur={() => commitAt(index)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitAt(index);
                }
              }}
            />
            <datalist id={`${label}-options`}>
              {options.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
            <button className="danger" tabIndex={-1} onClick={() => handleSelectChange(index, "")}>
              Remove
            </button>
          </div>
        ))}
        <div className="list-field-row">
          <input
            className="input"
            list={`${label}-options`}
            value={draft}
            placeholder={`Add ${displayLabel}...`}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitDraft}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitDraft();
              }
            }}
          />
          <datalist id={`${label}-options`}>
            {options
              .filter((option) => !items.includes(option))
              .map((option) => (
                <option key={option} value={option} />
              ))}
          </datalist>
        </div>
      </div>
      )}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
});

function splitList(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function getOrderedFields(fields: PBSEntry["fields"], order: readonly string[]) {
  const fieldMap = new Map(fields.map((field) => [field.key, field]));
  const ordered: PBSEntry["fields"] = [];
  const seen = new Set<string>();
  for (const key of order) {
    const field = fieldMap.get(key);
    if (field) {
      ordered.push(field);
      seen.add(key);
    }
  }
  for (const field of fields) {
    if (seen.has(field.key)) continue;
    ordered.push(field);
  }
  return ordered;
}

function getFieldValue(entry: PBSEntry, key: string) {
  return entry.fields.find((field) => field.key === key)?.value ?? "";
}

function normalizeOption(value: string, options: readonly string[]) {
  const match = options.find((option) => option.toLowerCase() === value.toLowerCase());
  return match ?? value;
}

function parseBaseStats(value: string) {
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const filled = Array(6).fill("1");
  for (let index = 0; index < Math.min(parts.length, 6); index += 1) {
    filled[index] = parts[index];
  }
  return filled;
}

function parseEVMap(value: string) {
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const map = new Map<string, string>();
  for (let index = 0; index < parts.length; index += 2) {
    const id = parts[index];
    const val = parts[index + 1];
    if (!id || val === undefined) continue;
    map.set(id, val);
  }
  return map;
}

function buildEVsString(map: Map<string, string>) {
  const tokens: string[] = [];
  for (const id of EV_ORDER) {
    const value = map.get(id);
    if (!value) continue;
    if (Number(value) <= 0) continue;
    tokens.push(id, value);
  }
  return tokens.join(",");
}

function parseMovePairs(value: string) {
  if (!value.trim()) return [];
  const parts = value.split(",").map((part) => part.trim());
  const pairs: { level: string; move: string }[] = [];
  for (let index = 0; index < parts.length; index += 2) {
    pairs.push({ level: parts[index] ?? "", move: parts[index + 1] ?? "" });
  }
  return pairs;
}

function ensureMovePairs(pairs: { level: string; move: string }[]) {
  if (pairs.length === 0) return [{ level: "", move: "" }];
  const last = pairs[pairs.length - 1];
  if (last.level || last.move) return [...pairs, { level: "", move: "" }];
  return pairs;
}

function updateMovePair(
  pairs: { level: string; move: string }[],
  index: number,
  level: string,
  move: string,
  sortNow: boolean
) {
  const next = pairs.map((pair, idx) => (idx === index ? { level, move } : pair));
  if (!sortNow) return next;
  const updated = next[index];
  if (!updated || !updated.level.trim() || !updated.move.trim()) return next;
  const withData = next.filter((pair) => pair.level.trim() !== "" && pair.move.trim() !== "");
  const withoutLevel = next.filter((pair) => pair.level.trim() === "" && pair.move.trim() === "");
  const incomplete = next.filter(
    (pair) =>
      !(pair.level.trim() !== "" && pair.move.trim() !== "") &&
      !(pair.level.trim() === "" && pair.move.trim() === "")
  );
  withData.sort((a, b) => Number(a.level) - Number(b.level));
  return [...withData, ...incomplete, ...withoutLevel];
}

function buildMovesString(pairs: { level: string; move: string }[]) {
  const tokens: string[] = [];
  for (const pair of pairs) {
    if (!pair.level && !pair.move) continue;
    tokens.push(pair.level, pair.move);
  }
  return tokens.join(",");
}

function parseEvolutionEntries(value: string) {
  if (!value.trim()) return [];
  const parts = value.split(",").map((part) => part.trim());
  const entries: { pokemon: string; method: string; parameter: string }[] = [];
  for (let index = 0; index < parts.length; index += 3) {
    entries.push({
      pokemon: parts[index] ?? "",
      method: parts[index + 1] ?? "",
      parameter: parts[index + 2] ?? "",
    });
  }
  return entries;
}

function ensureEvolutionEntries(entries: { pokemon: string; method: string; parameter: string }[]) {
  if (entries.length === 0) return [{ pokemon: "", method: "", parameter: "" }];
  const last = entries[entries.length - 1];
  if (last.pokemon || last.method || last.parameter) return [...entries, { pokemon: "", method: "", parameter: "" }];
  return entries;
}

function buildEvolutionString(entries: { pokemon: string; method: string; parameter: string }[]) {
  const tokens: string[] = [];
  for (const entry of entries) {
    if (!entry.pokemon && !entry.method && !entry.parameter) continue;
    tokens.push(entry.pokemon, entry.method, entry.parameter);
  }
  return tokens.join(",");
}

function resolveEvolutionParamKind(methodRaw: string) {
  const method = methodRaw.trim();
  if (!method) return "string";
  if (EVOLUTION_PARAM_NONE.has(method)) return "none";
  if (EVOLUTION_PARAM_INTEGER.has(method)) return "integer";
  if (EVOLUTION_PARAM_MOVE.has(method)) return "move";
  if (EVOLUTION_PARAM_TYPE.has(method)) return "type";
  if (EVOLUTION_PARAM_ITEM.has(method)) return "item";
  if (EVOLUTION_PARAM_POKEMON.has(method)) return "pokemon";
  if (EVOLUTION_PARAM_STRING.has(method)) return "string";
  return "string";
}

function moveEntryByIdWithinSource(entries: PBSEntry[], id: string, sourceFile: string, targetIndex: number) {
  const scoped = entries.filter((entry) => (entry.sourceFile ?? "pokemon.txt") === sourceFile);
  const fromIndex = scoped.findIndex((entry) => entry.id === id);
  if (fromIndex === -1) return entries;
  const scopedNext = [...scoped];
  const [moved] = scopedNext.splice(fromIndex, 1);
  const clamped = Math.max(0, Math.min(scopedNext.length, targetIndex));
  scopedNext.splice(clamped, 0, moved);
  const reordered = scopedNext.map((entry, index) => ({ ...entry, order: index }));
  let nextIndex = 0;
  return entries.map((entry) => {
    if ((entry.sourceFile ?? "pokemon.txt") !== sourceFile) return entry;
    const nextEntry = reordered[nextIndex];
    nextIndex += 1;
    return nextEntry ?? entry;
  });
}
