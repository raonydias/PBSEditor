
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AbilitiesFile,
  ItemsFile,
  MovesFile,
  PBSEntry,
  PokemonFile,
  PokemonFormsFile,
  TypesFile,
} from "@pbs/shared";
import { exportPokemonForms, getAbilities, getItems, getMoves, getPokemon, getPokemonForms, getTypes } from "../api";
import { serializeEntries, useDirty } from "../dirty";

const emptyForms: PokemonFormsFile = { entries: [] };
const emptyPokemon: PokemonFile = { entries: [] };
const emptyTypes: TypesFile = { entries: [] };
const emptyAbilities: AbilitiesFile = { entries: [] };
const emptyMoves: MovesFile = { entries: [] };
const emptyItems: ItemsFile = { entries: [] };

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
  "Shedinja",
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

const FORBIDDEN_FIELDS = new Set(["Name", "GenderRatio", "GrowthRate", "Incense"]);

const ALLOWED_FIELDS = [
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
] as const;

const INHERITED_FIELDS = new Set([
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
]);

const EXCLUSIVE_FIELDS = new Set(["PokedexForm", "MegaStone", "MegaMove", "MegaMessage", "UnmegaForm"]);

const DISPLAY_FIELD_ORDER = [
  "FormName",
  "Category",
  "Types",
  "Abilities",
  "HiddenAbilities",
  "CatchRate",
  "EggGroups",
  "HatchSteps",
  "Offspring",
  "Height",
  "Weight",
  "BaseExp",
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
  "PokedexForm",
  "MegaStone",
  "MegaMove",
  "MegaMessage",
  "UnmegaForm",
] as const;

export default function PokemonFormsPage() {
  const [data, setData] = useState<PokemonFormsFile>(emptyForms);
  const [pokemon, setPokemon] = useState<PokemonFile>(emptyPokemon);
  const [types, setTypes] = useState<TypesFile>(emptyTypes);
  const [abilities, setAbilities] = useState<AbilitiesFile>(emptyAbilities);
  const [moves, setMoves] = useState<MovesFile>(emptyMoves);
  const [items, setItems] = useState<ItemsFile>(emptyItems);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [idError, setIdError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const dirty = useDirty();

  const ensurePokemonDefaults = (entry: PBSEntry) => {
    const defaults = buildDefaultPokemonEntry(entry.id, entry.order);
    const existing = new Map(entry.fields.map((field) => [field.key, field.value]));
    const defaultKeys = new Set(defaults.fields.map((field) => field.key));
    const merged = defaults.fields.map((field) => ({
      key: field.key,
      value: existing.get(field.key) ?? field.value,
    }));
    for (const field of entry.fields) {
      if (!defaultKeys.has(field.key)) merged.push(field);
    }
    return { ...entry, fields: merged };
  };
  useEffect(() => {
    let isMounted = true;
    Promise.all([getPokemonForms(), getPokemon(), getTypes(), getAbilities(), getMoves(), getItems()])
      .then(([formsResult, pokemonResult, typesResult, abilitiesResult, movesResult, itemsResult]) => {
        if (!isMounted) return;
        const normalizedPokemon = { entries: pokemonResult.entries.map(ensurePokemonDefaults) };
        const normalizedForms = normalizeFormEntries(formsResult.entries, normalizedPokemon.entries);
        setData({ entries: normalizedForms });
        setPokemon(normalizedPokemon);
        setTypes(typesResult);
        setAbilities(abilitiesResult);
        setMoves(movesResult);
        setItems(itemsResult);
        setActiveId(normalizedForms[0]?.id ?? null);
        const snap = serializeEntries(normalizedForms);
        setSnapshot(snap);
        dirty.setDirty("pokemon_forms", false);
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
    dirty.setCurrentKey("pokemon_forms");
  }, []);

  const activeEntry = useMemo(() => {
    return data.entries.find((entry) => entry.id === activeId) ?? null;
  }, [data.entries, activeId]);

  const filteredEntries = useMemo(() => {
    const needle = filter.trim().toUpperCase();
    if (!needle) return data.entries;
    return data.entries.filter((entry) => entry.id.includes(needle));
  }, [data.entries, filter]);

  useEffect(() => {
    setIdError(null);
  }, [activeId]);

  const typeOptions = useMemo(() => types.entries.map((entry) => entry.id), [types.entries]);
  const abilityOptions = useMemo(() => abilities.entries.map((entry) => entry.id), [abilities.entries]);
  const moveOptions = useMemo(() => moves.entries.map((entry) => entry.id), [moves.entries]);
  const itemOptions = useMemo(() => items.entries.map((entry) => entry.id), [items.entries]);
  const pokemonOptions = useMemo(() => pokemon.entries.map((entry) => entry.id), [pokemon.entries]);

  const updateEntry = (updated: PBSEntry) => {
    setData((prev) => ({
      ...prev,
      entries: prev.entries.map((entry) => (entry.id === updated.id ? updated : entry)),
    }));
  };

  const validateEntryId = (entry: PBSEntry, pokemonId: string, formNumber: string) => {
    const id = pokemonId.trim().toUpperCase();
    if (!id) return "Pokemon ID is required.";
    if (!pokemonOptions.includes(id)) return "Pokemon ID must be a valid Pokemon.";
    if (!/^\d+$/.test(formNumber) || Number(formNumber) < 1) return "FormNumber must be an integer of at least 1.";
    const fullId = buildFormId(id, formNumber);
    if (data.entries.some((item) => item.id.toLowerCase() === fullId.toLowerCase() && item.id !== entry.id)) {
      return "Pokemon ID and FormNumber must be unique.";
    }
    return null;
  };

  const updateEntryId = (entry: PBSEntry, pokemonId: string, formNumber: string, resetFields: boolean) => {
    const nextId = buildFormId(pokemonId, formNumber);
    setData((prev) => ({
      ...prev,
      entries: prev.entries.map((item) => {
        if (item.id !== entry.id) return item;
        if (!resetFields) return { ...item, id: nextId };
        const nextFields = resetFormFields(item.fields, pokemonId, pokemon.entries);
        return { ...item, id: nextId, fields: nextFields };
      }),
    }));
    setActiveId(nextId);
  };
  const validateEntryFields = (entry: PBSEntry) => {
    const errors: Record<string, string> = {};
    const getField = (key: string) => entry.fields.find((field) => field.key === key)?.value ?? "";

    const typesValue = getField("Types").trim();
    const typeParts = splitList(typesValue);
    if (!typeParts[0]) {
      errors.Types = "PrimaryType is required.";
    } else if (!typeOptions.includes(typeParts[0])) {
      errors.Types = "PrimaryType must be a valid Type ID.";
    } else if (typeParts[1] && !typeOptions.includes(typeParts[1])) {
      errors.Types = "SecondaryType must be a valid Type ID.";
    }

    const baseExp = getField("BaseExp").trim();
    if (baseExp) {
      if (!/^\d+$/.test(baseExp)) {
        errors.BaseExp = "BaseExp must be an integer.";
      } else if (Number(baseExp) < 1) {
        errors.BaseExp = "BaseExp must be at least 1.";
      }
    }

    const baseStats = getField("BaseStats").trim();
    if (baseStats) {
      const parts = baseStats.split(",").map((part) => part.trim());
      if (parts.length !== 6 || parts.some((part) => part === "")) {
        errors.BaseStats = "BaseStats must have 6 values.";
      } else if (parts.some((part) => !/^\d+$/.test(part) || Number(part) < 1)) {
        errors.BaseStats = "BaseStats values must be integers of at least 1.";
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

    const catchRate = getField("CatchRate").trim();
    if (catchRate) {
      if (!/^\d+$/.test(catchRate)) {
        errors.CatchRate = "CatchRate must be an integer.";
      } else if (Number(catchRate) < 0) {
        errors.CatchRate = "CatchRate must be 0 or greater.";
      }
    }

    const happiness = getField("Happiness").trim();
    if (happiness) {
      if (!/^\d+$/.test(happiness)) {
        errors.Happiness = "Happiness must be an integer.";
      } else if (Number(happiness) < 0) {
        errors.Happiness = "Happiness must be 0 or greater.";
      }
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
      if (!/^\d+$/.test(pair.level) || Number(pair.level) < 0) {
        errors.Moves = "Move levels must be integers of at least 0.";
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

    const eggGroups = splitList(getField("EggGroups"));
    if (eggGroups.length && eggGroups.some((value) => !EGG_GROUP_OPTIONS.includes(value as (typeof EGG_GROUP_OPTIONS)[number]))) {
      errors.EggGroups = "EggGroups must be valid options.";
    }

    const hatchSteps = getField("HatchSteps").trim();
    if (hatchSteps) {
      if (!/^\d+$/.test(hatchSteps)) {
        errors.HatchSteps = "HatchSteps must be an integer.";
      } else if (Number(hatchSteps) < 1) {
        errors.HatchSteps = "HatchSteps must be at least 1.";
      }
    }

    const offspring = splitList(getField("Offspring"));
    if (offspring.some((value) => !pokemonOptions.includes(value))) {
      errors.Offspring = "Offspring must use valid Pokemon IDs.";
    }

    const height = getField("Height").trim();
    if (height && !/^\d+(\.\d)?$/.test(height)) {
      errors.Height = "Height must be a number with up to 1 decimal place.";
    }

    const weight = getField("Weight").trim();
    if (weight && !/^\d+(\.\d)?$/.test(weight)) {
      errors.Weight = "Weight must be a number with up to 1 decimal place.";
    }

    const color = getField("Color").trim();
    if (color && !COLOR_OPTIONS.includes(color as (typeof COLOR_OPTIONS)[number])) {
      errors.Color = "Color must be a valid option.";
    }

    const shape = getField("Shape").trim();
    if (shape && !SHAPE_OPTIONS.includes(shape as (typeof SHAPE_OPTIONS)[number])) {
      errors.Shape = "Shape must be a valid option.";
    }

    const habitat = getField("Habitat").trim();
    if (habitat && !HABITAT_OPTIONS.includes(habitat as (typeof HABITAT_OPTIONS)[number])) {
      errors.Habitat = "Habitat must be a valid option.";
    }

    const generation = getField("Generation").trim();
    if (generation) {
      if (!/^\d+$/.test(generation)) {
        errors.Generation = "Generation must be an integer.";
      } else if (Number(generation) < 0) {
        errors.Generation = "Generation must be 0 or greater.";
      }
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

    const megaStone = getField("MegaStone").trim();
    if (megaStone && !itemOptions.includes(megaStone)) {
      errors.MegaStone = "MegaStone must be a valid Item ID.";
    }

    const megaMove = getField("MegaMove").trim();
    if (megaMove && !moveOptions.includes(megaMove)) {
      errors.MegaMove = "MegaMove must be a valid Move ID.";
    }

    const megaMessage = getField("MegaMessage").trim();
    if (megaMessage) {
      if (!/^\d+$/.test(megaMessage)) {
        errors.MegaMessage = "MegaMessage must be an integer.";
      } else if (Number(megaMessage) < 0) {
        errors.MegaMessage = "MegaMessage must be 0 or greater.";
      }
    }

    const unmegaForm = getField("UnmegaForm").trim();
    if (unmegaForm && !pokemonOptions.includes(unmegaForm)) {
      errors.UnmegaForm = "UnmegaForm must be a valid Pokemon ID.";
    }

    return errors;
  };
  const fieldErrors = useMemo(() => {
    if (!activeEntry) return {};
    return validateEntryFields(activeEntry);
  }, [activeEntry, typeOptions, abilityOptions, moveOptions, itemOptions, pokemonOptions]);

  const collectEntryErrors = (entry: PBSEntry) => {
    const errors: string[] = [];
    const { pokemonId, formNumber } = parseFormId(entry.id);
    const idErrorMessage = validateEntryId(entry, pokemonId, formNumber);
    if (idErrorMessage) errors.push(`ID: ${idErrorMessage}`);
    const fieldErrorMap = validateEntryFields(entry);
    for (const [key, message] of Object.entries(fieldErrorMap)) {
      errors.push(`${key}: ${message}`);
    }
    return errors;
  };

  const collectEntryWarnings = (entry: PBSEntry) => {
    const warnings: string[] = [];
    const forbidden = entry.fields
      .map((field) => field.key)
      .filter((key) => FORBIDDEN_FIELDS.has(key));
    if (forbidden.length > 0) {
      warnings.push(
        `Undefinable properties: ${forbidden.join(
          ", "
        )}. These will be ignored on export and may crash Essentials if left in PBS.`
      );
    }
    return warnings;
  };

  const invalidEntries = useMemo(() => {
    return data.entries
      .map((entry) => ({ entry, errors: collectEntryErrors(entry) }))
      .filter((item) => item.errors.length > 0);
  }, [data.entries, typeOptions, abilityOptions, moveOptions, itemOptions, pokemonOptions]);

  const warningEntries = useMemo(() => {
    return data.entries
      .map((entry) => ({ entry, warnings: collectEntryWarnings(entry) }))
      .filter((item) => item.warnings.length > 0);
  }, [data.entries]);

  const hasInvalidEntries = useMemo(() => {
    for (const entry of data.entries) {
      const { pokemonId, formNumber } = parseFormId(entry.id);
      if (validateEntryId(entry, pokemonId, formNumber)) return true;
      if (Object.keys(validateEntryFields(entry)).length > 0) return true;
    }
    return false;
  }, [data.entries, typeOptions, abilityOptions, moveOptions, itemOptions, pokemonOptions]);

  useEffect(() => {
    if (!snapshot) return;
    const nextSnap = serializeEntries(data.entries);
    dirty.setDirty("pokemon_forms", nextSnap !== snapshot);
  }, [data.entries, snapshot]);

  const handleExport = async () => {
    setStatus(null);
    setError(null);
    try {
      const payload = buildExportPayload(data.entries, pokemon.entries);
      await exportPokemonForms(payload);
      const nextSnap = serializeEntries(data.entries);
      setSnapshot(nextSnap);
      dirty.setDirty("pokemon_forms", false);
      setStatus("Exported to PBS_Output/pokemon_forms.txt");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  };

  const handleDeleteForbiddenAndExport = async (entryId: string) => {
    setStatus(null);
    setError(null);
    const nextEntries = data.entries.map((entry) => {
      if (entry.id !== entryId) return entry;
      const cleaned = entry.fields.filter((field) => !FORBIDDEN_FIELDS.has(field.key));
      return { ...entry, fields: cleaned };
    });
    setData((prev) => ({
      ...prev,
      entries: prev.entries.map((entry) => {
        if (entry.id !== entryId) return entry;
        return nextEntries.find((item) => item.id === entryId) ?? entry;
      }),
    }));
    try {
      const payload = buildExportPayload(nextEntries, pokemon.entries);
      await exportPokemonForms(payload);
      const nextSnap = serializeEntries(nextEntries);
      setSnapshot(nextSnap);
      dirty.setDirty("pokemon_forms", false);
      setStatus(`Removed forbidden properties from ${entryId} and exported.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  };

  const handleAddEntry = () => {
    setStatus(null);
    setError(null);
    setIdError(null);
    const defaultPokemon = pokemon.entries[0]?.id ?? "";
    const formNumber = nextFormNumber(defaultPokemon, data.entries);
    const newId = buildFormId(defaultPokemon, String(formNumber));
    const newEntry: PBSEntry = {
      id: newId,
      order: nextOrder(),
      fields: buildFormFields(defaultPokemon, pokemon.entries, []),
    };
    setData((prev) => ({
      ...prev,
      entries: [...prev.entries, newEntry],
    }));
    setActiveId(newId);
    setStatus(`Added ${newId}. Remember to export when ready.`);
  };

  const handleDuplicateEntry = (entry: PBSEntry) => {
    setStatus(null);
    setError(null);
    setIdError(null);
    const { pokemonId } = parseFormId(entry.id);
    const formNumber = nextFormNumber(pokemonId, data.entries);
    const newId = buildFormId(pokemonId, String(formNumber));
    const duplicated: PBSEntry = {
      ...entry,
      id: newId,
      order: nextOrder(),
      fields: entry.fields.map((field) => ({ ...field })),
    };
    setData((prev) => ({
      ...prev,
      entries: [...prev.entries, duplicated],
    }));
    setActiveId(newId);
    setStatus(`Duplicated ${entry.id} as ${newId}.`);
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
    setStatus(`Deleted ${entry.id}.`);
  };

  const nextOrder = () => Math.max(0, ...data.entries.map((entry) => entry.order + 1));

  const buildDefaultPokemonEntry = (id: string, order: number): PBSEntry => ({
    id,
    order,
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
    return <div className="panel">Loading pokemon_forms.txt...</div>;
  }

  if (error && data.entries.length === 0) {
    return (
      <div className="panel">
        <h1>Pokemon Forms</h1>
        <p className="error">{error}</p>
      </div>
    );
  }

  return (
    <div className="editor-layout">
      <section className="list-panel">
        <div className="panel-header">
          <h1>Pokemon Forms</h1>
          <button className="ghost" onClick={handleAddEntry}>
            Add New
          </button>
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
          {filteredEntries.map((entry) => {
            const { pokemonId, formNumber } = parseFormId(entry.id);
            const baseName = getFieldValueFromList(pokemon.entries, pokemonId, "Name");
            return (
              <button
                key={entry.id}
                className={`list-item ${entry.id === activeId ? "active" : ""}`}
                onClick={() => setActiveId(entry.id)}
              >
                <div className="list-title">{entry.id}</div>
                <div className="list-sub">
                  {baseName ? `${baseName} (Form ${formNumber || "?"})` : "(unknown)"}
                </div>
              </button>
            );
          })}
        </div>
      </section>
      <section className="detail-panel">
        {activeEntry ? (
          <PokemonFormDetail
            entry={activeEntry}
            onChange={updateEntry}
            onRename={updateEntryId}
            onValidateId={validateEntryId}
            onDuplicate={handleDuplicateEntry}
            onDelete={handleDeleteEntry}
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
          <div className="panel">Select a form to edit.</div>
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
                    <button className="ghost" onClick={() => setActiveId(entry.id)}>
                      Go to entry
                    </button>
                  </div>
                  <div className="muted">{errors.join(" • ")}</div>
                </div>
              ))}
            </div>
          </section>
        )}
        {warningEntries.length > 0 && (
          <section className="panel">
            <div className="panel-header">
              <h2>Warnings</h2>
              <div className="muted">These will be ignored on export.</div>
            </div>
            <div className="field-list">
              {warningEntries.map(({ entry, warnings }) => (
                <div key={entry.id} className="list-field">
                  <div className="list-field-row">
                    <strong>{entry.id}</strong>
                    <button className="ghost" onClick={() => setActiveId(entry.id)}>
                      Go to entry
                    </button>
                  </div>
                  <div className="list-field-row">
                    <span />
                    <button className="ghost" onClick={() => handleDeleteForbiddenAndExport(entry.id)}>
                      Delete Properties and Export
                    </button>
                  </div>
                  <div className="muted">{warnings.join(" • ")}</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </section>
      <section className="export-bar">
        <div className="export-warning">
          Exports never overwrite <strong>PBS/pokemon_forms.txt</strong>. Output goes to{" "}
          <strong>PBS_Output/pokemon_forms.txt</strong>.
        </div>
        <div className="export-actions">
          {status && <span className="status">{status}</span>}
          {error && <span className="error">{error}</span>}
          <button className="primary" onClick={handleExport} disabled={Boolean(idError) || hasInvalidEntries}>
            Export pokemon_forms.txt
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
  onRename: (entry: PBSEntry, pokemonId: string, formNumber: string, resetFields: boolean) => void;
  onValidateId: (entry: PBSEntry, pokemonId: string, formNumber: string) => string | null;
  onDuplicate: (entry: PBSEntry) => void;
  onDelete: (entry: PBSEntry) => void;
  idError: string | null;
  onSetIdError: (value: string | null) => void;
  fieldErrors: Record<string, string>;
  typeOptions: string[];
  abilityOptions: string[];
  moveOptions: string[];
  itemOptions: string[];
  pokemonOptions: string[];
};

function PokemonFormDetail({
  entry,
  onChange,
  onRename,
  onValidateId,
  onDuplicate,
  onDelete,
  idError,
  onSetIdError,
  fieldErrors,
  typeOptions,
  abilityOptions,
  moveOptions,
  itemOptions,
  pokemonOptions,
}: DetailProps) {
  const { pokemonId, formNumber } = parseFormId(entry.id);
  const [idDraft, setIdDraft] = useState(pokemonId);
  const [formDraft, setFormDraft] = useState(formNumber);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const validateTimer = useRef<number | null>(null);

  useEffect(() => {
    setIdDraft(pokemonId);
    setFormDraft(formNumber);
  }, [pokemonId, formNumber, entry.id]);

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
      const errorMessage = onValidateId(entry, idDraft, formDraft);
      onSetIdError(errorMessage);
    }, 0);
  };

  const updateField = (index: number, key: string, value: string) => {
    const nextFields = entry.fields.map((field, idx) =>
      idx === index ? { key, value } : field
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
    updateField(index, key, value);
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

  const updateTypes = (primary: string, secondary: string) => {
    if (!primary) {
      setFieldValue("Types", "");
      return;
    }
    if (secondary && secondary !== "NONE") {
      setFieldValue("Types", `${primary},${secondary}`);
    } else {
      setFieldValue("Types", primary);
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
          <button className="ghost" onClick={() => onDuplicate(entry)}>
            Duplicate
          </button>
          <button className="ghost" onClick={addField}>
            Add Field
          </button>
          <button className="danger" onClick={() => onDelete(entry)}>
            Delete
          </button>
        </div>
      </div>
      <div className="field-list">
        <div className="field-row single">
          <label className="label">Pokemon ID</label>
          <div className="stack">
            <select
              className="input"
              value={idDraft}
              onChange={(event) => {
                const next = event.target.value;
                setIdDraft(next);
                const errorMessage = onValidateId(entry, next, formDraft);
                onSetIdError(errorMessage);
                if (!errorMessage) {
                  onRename(entry, next, formDraft, true);
                }
              }}
            >
              {pokemonOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <div className="field-row">
              <input className="input" value="FormNumber" readOnly />
              <input
                className="input"
                value={formDraft}
                onChange={(event) => {
                  const next = event.target.value;
                  setFormDraft(next);
                  const errorMessage = onValidateId(entry, idDraft, next);
                  onSetIdError(errorMessage);
                  if (!errorMessage) {
                    onRename(entry, idDraft, next, false);
                  }
                }}
              />
            </div>
          </div>
          {idError && <span className="field-error">{idError}</span>}
        </div>
      </div>
      <div className="field-list">
        {getOrderedFields(entry.fields, DISPLAY_FIELD_ORDER).map((field, index) => {
          if (FORBIDDEN_FIELDS.has(field.key)) return null;

          if (field.key === "FormName") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input" value="FormName" readOnly />
                <input
                  className="input"
                  value={field.value}
                  onChange={(event) => updateField(index, field.key, event.target.value)}
                />
              </div>
            );
          }

          if (field.key === "Types") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input" value="PrimaryType" readOnly />
                <select
                  className="input"
                  value={primaryType || ""}
                  onChange={(event) => updateTypes(event.target.value, secondaryType)}
                >
                  {typeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {fieldErrors.Types && <span className="field-error">{fieldErrors.Types}</span>}
                {primaryType && (
                  <>
                    <input className="input" value="SecondaryType" readOnly />
                    <select
                      className="input"
                      value={secondaryType || "NONE"}
                      onChange={(event) => updateTypes(primaryType, event.target.value)}
                    >
                      <option value="NONE">(None)</option>
                      {typeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            );
          }

          if (field.key === "BaseExp" || field.key === "CatchRate" || field.key === "Happiness") {
            const warn =
              (field.key === "CatchRate" || field.key === "Happiness") && Number(field.value || 0) > 255;
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input" value={field.key} readOnly />
                <input
                  className="input"
                  value={field.value}
                  onChange={(event) => updateField(index, field.key, event.target.value)}
                />
                {warn && <span className="field-warning">Values above 255 have no effect.</span>}
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "BaseStats") {
            return (
              <div key={`${field.key}-${index}`} className="list-field">
                <div className="list-field-label">Base Stats</div>
                <div className="stats-grid">
                  {STAT_DISPLAY.map((stat) => (
                    <div key={stat.key} className="stats-row">
                      <div className="stats-label">{stat.label}</div>
                      <input
                        className="input"
                        value={baseStats[stat.fileIndex] ?? "1"}
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
                <input className="input" value="Ability1" readOnly />
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
                    <input className="input" value="Ability2" readOnly />
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
                        className="ghost"
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
                          placeholder="Pokemon ID"
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
                          className="ghost"
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
                onChange={(nextValue) => updateField(index, field.key, nextValue)}
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
                onChange={(nextValue) => updateField(index, field.key, nextValue)}
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
                onChange={(nextValue) => updateField(index, field.key, nextValue)}
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
                onChange={(nextValue) => updateField(index, field.key, nextValue)}
                error={fieldErrors[field.key]}
              />
            );
          }

          if (field.key === "HatchSteps") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input" value="HatchSteps" readOnly />
                <input
                  className="input"
                  value={field.value}
                  onChange={(event) => updateField(index, field.key, event.target.value)}
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
                onChange={(nextValue) => updateField(index, field.key, nextValue)}
                error={fieldErrors[field.key]}
              />
            );
          }

          if (field.key === "Height" || field.key === "Weight") {
            const hint = field.key === "Height" ? "Value in meters." : "Value in kilograms.";
            const showHint = focusedField === field.key;
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input" value={field.key} readOnly />
                <input
                  className="input"
                  value={field.value}
                  onFocus={() => setFocusedField(field.key)}
                  onBlur={() => setFocusedField(null)}
                  onChange={(event) => updateField(index, field.key, event.target.value.replace(",", "."))}
                />
                {showHint && <span className="field-hint">{hint}</span>}
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "Color") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input" value="Color" readOnly />
                <select
                  className="input"
                  value={field.value}
                  onChange={(event) => updateField(index, field.key, event.target.value)}
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
                <input className="input" value="Shape" readOnly />
                <select
                  className="input"
                  value={field.value}
                  onChange={(event) => updateField(index, field.key, event.target.value)}
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
                <input className="input" value="Habitat" readOnly />
                <select
                  className="input"
                  value={field.value}
                  onChange={(event) => updateField(index, field.key, event.target.value)}
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

          if (field.key === "Category" || field.key === "Pokedex" || field.key === "PokedexForm") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input" value={field.key} readOnly />
                <input
                  className="input"
                  value={field.value}
                  onChange={(event) => updateField(index, field.key, event.target.value)}
                />
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "Generation") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input" value="Generation" readOnly />
                <input
                  className="input"
                  value={field.value}
                  onChange={(event) => updateField(index, field.key, event.target.value)}
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
                onChange={(nextValue) => updateField(index, field.key, nextValue)}
                error={fieldErrors[field.key]}
              />
            );
          }

          if (field.key === "WildItemCommon" || field.key === "WildItemUncommon" || field.key === "WildItemRare") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input" value={field.key} readOnly />
                <input
                  className="input"
                  list="item-options"
                  value={field.value}
                  placeholder="(none)"
                  onChange={(event) => updateField(index, field.key, event.target.value)}
                />
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "MegaStone") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input" value="MegaStone" readOnly />
                <input
                  className="input"
                  list="item-options"
                  value={field.value}
                  placeholder="(none)"
                  onChange={(event) => updateField(index, field.key, event.target.value)}
                />
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "MegaMove") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input" value="MegaMove" readOnly />
                <input
                  className="input"
                  list="move-options"
                  value={field.value}
                  placeholder="(none)"
                  onChange={(event) => updateField(index, field.key, event.target.value)}
                />
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "MegaMessage") {
            const value = field.value.trim();
            const showWarning = value !== "" && Number(value) > 1;
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input" value="MegaMessage" readOnly />
                <input
                  className="input"
                  value={field.value}
                  onChange={(event) => updateField(index, field.key, event.target.value)}
                />
                {showWarning && (
                  <span className="field-warning">
                    Only 0 and 1 are available by default in Essentials.
                  </span>
                )}
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "UnmegaForm") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input" value="UnmegaForm" readOnly />
                <input
                  className="input"
                  list="pokemon-options"
                  value={field.value}
                  placeholder="(none)"
                  onChange={(event) => updateField(index, field.key, event.target.value)}
                />
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          return (
            <div key={`${field.key}-${index}`} className="field-row">
              <input className="input" value={field.key} readOnly />
              <input
                className="input"
                value={field.value}
                onChange={(event) => updateField(index, field.key, event.target.value)}
              />
              {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
            </div>
          );
        })}
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

function SelectListField({
  label,
  value,
  options,
  onChange,
  error,
  inputMode = "select",
  datalistId,
  renderDatalist = true,
}: SelectListFieldProps) {
  const items = splitList(value);
  const canCollapse = items.length > 5;
  const [collapsed, setCollapsed] = useState(canCollapse);
  const resolvedDatalistId = datalistId ?? `${label}-options`;

  useEffect(() => {
    if (!canCollapse) setCollapsed(false);
  }, [canCollapse]);

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

  const removeAt = (index: number) => {
    const nextItems = [...items];
    nextItems.splice(index, 1);
    onChange(nextItems.join(","));
  };

  return (
    <div className="list-field">
      <div className="list-field-header">
        <div className="list-field-label">{label}</div>
        {canCollapse && (
          <button className="ghost" onClick={() => setCollapsed((prev) => !prev)}>
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
                  value={item}
                  onChange={(event) => updateAt(index, event.target.value)}
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
              <button className="ghost" onClick={() => removeAt(index)}>
                Remove
              </button>
            </div>
          ))}
          <div className="list-field-row">
            {inputMode === "datalist" ? (
              <input
                className="input"
                list={resolvedDatalistId}
                value=""
                placeholder={`Add ${label}...`}
                onChange={(event) => updateAt(items.length, event.target.value)}
              />
            ) : (
              <select className="input" value="" onChange={(event) => updateAt(items.length, event.target.value)}>
                <option value="">Add {label}...</option>
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
}

type ListFieldEditorProps = {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (nextValue: string) => void;
  error?: string;
};

function ListFieldEditor({ label, value, options, onChange, error }: ListFieldEditorProps) {
  const items = splitList(value);
  const [draft, setDraft] = useState("");
  const canCollapse = items.length > 5;
  const [collapsed, setCollapsed] = useState(canCollapse);

  useEffect(() => {
    if (!canCollapse) setCollapsed(false);
  }, [canCollapse]);

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

  return (
    <div className="list-field">
      <div className="list-field-header">
        <div className="list-field-label">{label}</div>
        {canCollapse && (
          <button className="ghost" onClick={() => setCollapsed((prev) => !prev)}>
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
              value={item}
              onChange={(event) => handleSelectChange(index, event.target.value)}
            />
            <datalist id={`${label}-options`}>
              {options.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
            <button className="ghost" onClick={() => handleSelectChange(index, "")}>
              Remove
            </button>
          </div>
        ))}
        <div className="list-field-row">
          <input
            className="input"
            list={`${label}-options`}
            value={draft}
            placeholder={`Add ${label}...`}
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
}

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
  const withData = next.filter((pair) => pair.level.trim() !== "");
  const withoutLevel = next.filter((pair) => pair.level.trim() === "");
  withData.sort((a, b) => Number(a.level) - Number(b.level));
  return [...withData, ...withoutLevel];
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

function normalizeFormEntries(entries: PBSEntry[], pokemonEntries: PBSEntry[]) {
  return entries.map((entry) => {
    const { pokemonId } = parseFormId(entry.id);
    const fields = buildFormFields(pokemonId, pokemonEntries, entry.fields);
    return { ...entry, fields };
  });
}

function buildFormFields(pokemonId: string, pokemonEntries: PBSEntry[], existing: PBSEntry["fields"]) {
  const baseMap = getBaseFieldMap(pokemonId, pokemonEntries);
  const existingMap = new Map(existing.map((field) => [field.key, field.value]));
  const fields: PBSEntry["fields"] = [];
  for (const key of ALLOWED_FIELDS) {
    const current = existingMap.get(key);
    if (current !== undefined) {
      fields.push({ key, value: current });
    } else if (INHERITED_FIELDS.has(key)) {
      fields.push({ key, value: baseMap.get(key) ?? "" });
    } else {
      fields.push({ key, value: "" });
    }
  }
  for (const field of existing) {
    if (ALLOWED_FIELDS.includes(field.key as (typeof ALLOWED_FIELDS)[number])) continue;
    fields.push(field);
  }
  return fields;
}

function resetFormFields(fields: PBSEntry["fields"], pokemonId: string, pokemonEntries: PBSEntry[]) {
  const baseMap = getBaseFieldMap(pokemonId, pokemonEntries);
  const nextFields: PBSEntry["fields"] = [];
  for (const key of ALLOWED_FIELDS) {
    if (INHERITED_FIELDS.has(key)) {
      nextFields.push({ key, value: baseMap.get(key) ?? "" });
    } else {
      nextFields.push({ key, value: "" });
    }
  }
  for (const field of fields) {
    if (ALLOWED_FIELDS.includes(field.key as (typeof ALLOWED_FIELDS)[number])) continue;
    nextFields.push(field);
  }
  return nextFields;
}

function getBaseFieldMap(pokemonId: string, pokemonEntries: PBSEntry[]) {
  const entry = pokemonEntries.find((item) => item.id === pokemonId);
  const map = new Map<string, string>();
  if (!entry) return map;
  for (const field of entry.fields) {
    map.set(field.key, field.value);
  }
  return map;
}

function getFieldValueFromList(entries: PBSEntry[], id: string, key: string) {
  return entries.find((entry) => entry.id === id)?.fields.find((field) => field.key === key)?.value ?? "";
}

function buildExportPayload(entries: PBSEntry[], pokemonEntries: PBSEntry[]): PokemonFormsFile {
  const exportEntries = entries.map((entry) => {
    const { pokemonId } = parseFormId(entry.id);
    const baseMap = getBaseFieldMap(pokemonId, pokemonEntries);
    const currentMap = new Map(entry.fields.map((field) => [field.key, field.value]));
    const changes: Record<string, boolean> = {};
    for (const key of ALLOWED_FIELDS) {
      const current = (currentMap.get(key) ?? "").trim();
      const baseline = INHERITED_FIELDS.has(key) ? (baseMap.get(key) ?? "").trim() : "";
      changes[key] = current !== baseline;
    }

    const abilitiesChanged = changes.Abilities || changes.HiddenAbilities;
    const wildChanged = changes.WildItemCommon || changes.WildItemUncommon || changes.WildItemRare;

    const fields: PBSEntry["fields"] = [];
    for (const key of ALLOWED_FIELDS) {
      const value = (currentMap.get(key) ?? "").trim();
      if (!value && !changes[key]) continue;
      if (EXCLUSIVE_FIELDS.has(key)) {
        if (!value) continue;
        fields.push({ key, value });
        continue;
      }
      if (key === "Abilities" || key === "HiddenAbilities") {
        if (abilitiesChanged && value) fields.push({ key, value });
        continue;
      }
      if (key === "WildItemCommon" || key === "WildItemUncommon" || key === "WildItemRare") {
        if (wildChanged && value) fields.push({ key, value });
        continue;
      }
      if (!changes[key]) continue;
      if (!value) continue;
      fields.push({ key, value });
    }

    for (const field of entry.fields) {
      if (ALLOWED_FIELDS.includes(field.key as (typeof ALLOWED_FIELDS)[number])) continue;
      if (FORBIDDEN_FIELDS.has(field.key)) continue;
      if (field.value.trim() === "") continue;
      fields.push({ key: field.key, value: field.value });
    }

    return { ...entry, fields };
  });

  return { entries: exportEntries };
}

function nextFormNumber(pokemonId: string, entries: PBSEntry[]) {
  if (!pokemonId) return 1;
  const used = entries
    .map((entry) => parseFormId(entry.id))
    .filter((parsed) => parsed.pokemonId === pokemonId)
    .map((parsed) => Number(parsed.formNumber))
    .filter((value) => Number.isFinite(value) && value >= 1);
  if (used.length === 0) return 1;
  return Math.max(...used) + 1;
}

function parseFormId(raw: string) {
  const parts = raw.split(",").map((part) => part.trim());
  return {
    pokemonId: parts[0] ?? "",
    formNumber: parts[1] ?? "",
  };
}

function buildFormId(pokemonId: string, formNumber: string) {
  return `${pokemonId.trim().toUpperCase()},${formNumber.trim()}`;
}
