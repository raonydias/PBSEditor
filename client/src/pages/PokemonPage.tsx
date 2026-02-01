
import { useEffect, useMemo, useState } from "react";
import { AbilitiesFile, ItemsFile, MovesFile, PBSEntry, PokemonFile, TypesFile } from "@pbs/shared";
import { getAbilities, getItems, getMoves, getPokemon, getTypes } from "../api";
import { serializeEntries, useDirty } from "../dirty";

const emptyPokemon: PokemonFile = { entries: [] };
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

const STAT_DISPLAY = [
  { key: "HP", label: "HP", fileIndex: 0 },
  { key: "ATTACK", label: "Attack", fileIndex: 1 },
  { key: "DEFENSE", label: "Defense", fileIndex: 2 },
  { key: "SPECIAL_ATTACK", label: "Special Attack", fileIndex: 4 },
  { key: "SPECIAL_DEFENSE", label: "Special Defense", fileIndex: 5 },
  { key: "SPEED", label: "Speed", fileIndex: 3 },
] as const;

const EV_ORDER = ["HP", "ATTACK", "DEFENSE", "SPEED", "SPECIAL_ATTACK", "SPECIAL_DEFENSE"] as const;

export default function PokemonPage() {
  const [data, setData] = useState<PokemonFile>(emptyPokemon);
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
    Promise.all([getPokemon(), getTypes(), getAbilities(), getMoves(), getItems()])
      .then(([pokemonResult, typesResult, abilitiesResult, movesResult, itemsResult]) => {
        if (!isMounted) return;
        const normalized = { entries: pokemonResult.entries.map(ensurePokemonDefaults) };
        setData(normalized);
        setTypes(typesResult);
        setAbilities(abilitiesResult);
        setMoves(movesResult);
        setItems(itemsResult);
        setActiveId(normalized.entries[0]?.id ?? null);
        const snap = serializeEntries(normalized.entries);
        setSnapshot(snap);
        dirty.setDirty("pokemon", false);
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
    } else if (eggGroups.some((value) => !EGG_GROUP_OPTIONS.includes(value as (typeof EGG_GROUP_OPTIONS)[number]))) {
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
  const fieldErrors = useMemo(() => {
    if (!activeEntry) return {};
    return validateEntryFields(activeEntry);
  }, [activeEntry, typeOptions, abilityOptions, moveOptions, itemOptions, pokemonOptions]);

  const collectEntryErrors = (entry: PBSEntry) => {
    const errors: string[] = [];
    const idErrorMessage = validateEntryId(entry, entry.id);
    if (idErrorMessage) errors.push(`ID: ${idErrorMessage}`);
    const fieldErrorMap = validateEntryFields(entry);
    for (const [key, message] of Object.entries(fieldErrorMap)) {
      errors.push(`${key}: ${message}`);
    }
    return errors;
  };

  const invalidEntries = useMemo(() => {
    return data.entries
      .map((entry) => ({ entry, errors: collectEntryErrors(entry) }))
      .filter((item) => item.errors.length > 0);
  }, [data.entries, typeOptions, abilityOptions, moveOptions, itemOptions, pokemonOptions]);

  const hasInvalidEntries = useMemo(() => {
    for (const entry of data.entries) {
      if (Object.keys(validateEntryFields(entry)).length > 0) return true;
      const idErrorMessage = validateEntryId(entry, entry.id);
      if (idErrorMessage) return true;
    }
    return false;
  }, [data.entries, typeOptions, abilityOptions, moveOptions, itemOptions, pokemonOptions]);

  useEffect(() => {
    if (!snapshot) return;
    const nextSnap = serializeEntries(data.entries);
    dirty.setDirty("pokemon", nextSnap !== snapshot);
  }, [data.entries, snapshot]);

  const handleAddEntry = () => {
    setStatus(null);
    setError(null);
    setIdError(null);
    const newId = nextAvailableId("NEWPOKEMON");
    const newEntry: PBSEntry = buildDefaultPokemonEntry(newId, nextOrder());
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
    const baseId = entry.id.endsWith("COPY") ? entry.id : `${entry.id}COPY`;
    const newId = nextCopyId(baseId);
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
          <h1>Pokemon</h1>
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
          {filteredEntries.map((entry) => (
            <button
              key={entry.id}
              className={`list-item ${entry.id === activeId ? "active" : ""}`}
              onClick={() => setActiveId(entry.id)}
            >
              <div className="list-title">{entry.id}</div>
              <div className="list-sub">{getFieldValue(entry, "Name") || "(no name)"}</div>
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
          <div className="panel">Select a Pokemon to edit.</div>
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
      </section>
      <section className="export-bar">
        <div className="export-warning">
          Exports never overwrite <strong>PBS/pokemon.txt</strong>. Output goes to <strong>PBS_Output/pokemon.txt</strong>.
        </div>
        <div className="export-actions">
          {status && <span className="status">{status}</span>}
          {error && <span className="error">{error}</span>}
          <button className="primary" disabled>
            Export pokemon.txt (Stage 1 disabled)
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

function PokemonDetail({
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
  const [idDraft, setIdDraft] = useState(entry.id);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    setIdDraft(entry.id);
  }, [entry.id]);

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

  return (
    <div className="panel">
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
        {entry.fields.map((field, index) => {
          if (field.key === "Name") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input" value="Name" readOnly />
                <input
                  className="input"
                  value={field.value}
                  onChange={(event) => updateField(index, field.key, event.target.value)}
                />
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

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

          if (field.key === "GenderRatio") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input" value="GenderRatio" readOnly />
                <select
                  className="input"
                  value={field.value}
                  onChange={(event) => updateField(index, field.key, event.target.value)}
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
                <input className="input" value="GrowthRate" readOnly />
                <select
                  className="input"
                  value={field.value}
                  onChange={(event) => updateField(index, field.key, event.target.value)}
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
                <select
                  className="input"
                  value={ability1}
                  onChange={(event) => {
                    const next = event.target.value;
                    if (!next) {
                      updateAbilities("", "");
                    } else {
                      updateAbilities(next, ability2);
                    }
                  }}
                >
                  <option value="">(none)</option>
                  {abilityOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {ability1 && (
                  <>
                    <input className="input" value="Ability2" readOnly />
                    <select
                      className="input"
                      value={ability2}
                      onChange={(event) => updateAbilities(ability1, event.target.value)}
                    >
                      <option value="">(none)</option>
                      {abilityOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </>
                )}
                {fieldErrors.Abilities && <span className="field-error">{fieldErrors.Abilities}</span>}
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

          if (field.key === "Incense") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input" value="Incense" readOnly />
                <select
                  className="input"
                  value={field.value}
                  onChange={(event) => updateField(index, field.key, event.target.value)}
                >
                  <option value="">(none)</option>
                  {itemOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
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

          if (field.key === "Category" || field.key === "Pokedex") {
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
                <select
                  className="input"
                  value={field.value}
                  onChange={(event) => updateField(index, field.key, event.target.value)}
                >
                  <option value="">(none)</option>
                  {itemOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
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
};

function SelectListField({
  label,
  value,
  options,
  onChange,
  error,
}: SelectListFieldProps) {
  const items = splitList(value);
  const canCollapse = items.length > 5;
  const [collapsed, setCollapsed] = useState(canCollapse);

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
              <button className="ghost" onClick={() => removeAt(index)}>
                Remove
              </button>
            </div>
          ))}
          <div className="list-field-row">
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
          </div>
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
