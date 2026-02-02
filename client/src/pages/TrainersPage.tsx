
import { useEffect, useMemo, useState } from "react";
import type { TrainerEntry, TrainerPokemon, TrainersFile, PokemonFile, MovesFile, ItemsFile, AbilitiesFile } from "@pbs/shared";
import { exportTrainers, getAbilities, getItems, getMoves, getPokemon, getTrainers } from "../api";
import { useDirty } from "../dirty";

const emptyFile: TrainersFile = { entries: [] };
const emptyPokemonFile: PokemonFile = { entries: [] };
const emptyMoves: MovesFile = { entries: [] };
const emptyItems: ItemsFile = { entries: [] };
const emptyAbilities: AbilitiesFile = { entries: [] };

const NATURE_OPTIONS = [
  "ADAMANT",
  "BASHFUL",
  "BOLD",
  "BRAVE",
  "CALM",
  "CAREFUL",
  "DOCILE",
  "GENTLE",
  "HARDY",
  "HASTY",
  "IMPISH",
  "JOLLY",
  "LAX",
  "LONELY",
  "MILD",
  "MODEST",
  "NAIVE",
  "NAUGHTY",
  "QUIET",
  "QUIRKY",
  "RASH",
  "RELAXED",
  "SASSY",
  "SERIOUS",
  "TIMID",
] as const;

const STAT_LABELS = ["HP", "Attack", "Defense", "Sp. Atk", "Sp. Def", "Speed"] as const;
const STAT_EXPORT_INDEX = [0, 1, 2, 4, 5, 3] as const;

type EntryIssues = {
  entry: TrainerEntry;
  errors: string[];
  warnings: string[];
};

export default function TrainersPage() {
  const [data, setData] = useState<TrainersFile>(emptyFile);
  const [pokemon, setPokemon] = useState<PokemonFile>(emptyPokemonFile);
  const [moves, setMoves] = useState<MovesFile>(emptyMoves);
  const [items, setItems] = useState<ItemsFile>(emptyItems);
  const [abilities, setAbilities] = useState<AbilitiesFile>(emptyAbilities);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [idError, setIdError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const dirty = useDirty();

  useEffect(() => {
    let isMounted = true;
    Promise.all([getTrainers(), getPokemon(), getMoves(), getItems(), getAbilities()])
      .then(([trainerResult, pokemonResult, movesResult, itemsResult, abilitiesResult]) => {
        if (!isMounted) return;
        const normalized = { entries: trainerResult.entries.map(ensureTrainerDefaults) };
        setData(normalized);
        setPokemon(pokemonResult);
        setMoves(movesResult);
        setItems(itemsResult);
        setAbilities(abilitiesResult);
        setActiveKey(normalized.entries[0] ? entryKey(normalized.entries[0]) : null);
        setSnapshot(serializeTrainers(normalized.entries));
        dirty.setDirty("trainers", false);
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
    dirty.setCurrentKey("trainers");
  }, []);

  const activeEntry = useMemo(() => {
    return data.entries.find((entry) => entryKey(entry) === activeKey) ?? null;
  }, [data.entries, activeKey]);

  const filteredEntries = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return data.entries;
    return data.entries.filter(
      (entry) =>
        entry.id.toLowerCase().includes(needle) ||
        entry.name.toLowerCase().includes(needle)
    );
  }, [data.entries, filter]);

  useEffect(() => {
    setIdError(null);
  }, [activeKey]);

  const pokemonOptions = useMemo(() => pokemon.entries.map((entry) => entry.id), [pokemon.entries]);
  const moveOptions = useMemo(() => moves.entries.map((entry) => entry.id), [moves.entries]);
  const itemOptions = useMemo(() => items.entries.map((entry) => entry.id), [items.entries]);

  const ballOptions = useMemo(() => {
    return items.entries
      .filter((entry) => {
        const flags = entry.fields.find((field) => field.key === "Flags")?.value ?? "";
        return flags.includes("PokeBall") || flags.includes("SnagBall");
      })
      .map((entry) => entry.id);
  }, [items.entries]);

  const updateEntry = (updated: TrainerEntry) => {
    setData((prev) => ({
      entries: prev.entries.map((entry) => (entryKey(entry) === entryKey(updated) ? updated : entry)),
    }));
  };

  const validateEntryId = (entry: TrainerEntry, nextIdRaw: string, nextNameRaw: string, versionRaw: string) => {
    const nextId = nextIdRaw.trim().toUpperCase();
    const nextName = nextNameRaw.trim();
    if (!nextId) return "ID is required.";
    if (!/^[A-Z0-9_]+$/.test(nextId)) return "ID must use A-Z, 0-9, or _ only.";
    if (!nextName) return "Name is required.";
    if (!/^\d+$/.test(versionRaw)) return "Version must be an integer of at least 0.";
    const nextVersion = Number(versionRaw);
    if (nextVersion < 0) return "Version must be an integer of at least 0.";
    const exists = data.entries.some(
      (item) =>
        item.id === nextId &&
        item.name === nextName &&
        item.version === nextVersion &&
        entryKey(item) !== entryKey(entry)
    );
    if (exists) return "ID + Name + Version must be unique.";
    return null;
  };

  const updateEntryId = (entry: TrainerEntry, nextId: string, nextName: string, nextVersion: number) => {
    setData((prev) => ({
      entries: prev.entries.map((item) => {
        if (entryKey(item) !== entryKey(entry)) return item;
        return { ...item, id: nextId, name: nextName, version: nextVersion };
      }),
    }));
    setActiveKey(entryKey({ ...entry, id: nextId, name: nextName, version: nextVersion }));
  };

  const validateEntry = (entry: TrainerEntry): EntryIssues => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const idErrorMessage = validateEntryId(entry, entry.id, entry.name, String(entry.version));
    if (idErrorMessage) errors.push(`ID: ${idErrorMessage}`);
    if (!entry.loseText.trim()) errors.push("LoseText: LoseText is required.");

    entry.flags.forEach((flag, idx) => {
      if (!flag) return;
      if (/\s/.test(flag)) errors.push(`Flags: Flag ${idx + 1} must not contain spaces.`);
    });

    entry.items.forEach((item, idx) => {
      if (!item) return;
      if (!itemOptions.includes(item)) errors.push(`Items: Item ${idx + 1} must be a valid Item ID.`);
    });

    entry.pokemon.forEach((mon, index) => {
      const prefix = `Pokemon ${index + 1}`;
      if (!mon.pokemonId.trim()) errors.push(`${prefix}: Pokemon ID is required.`);
      else if (!pokemonOptions.includes(mon.pokemonId.trim())) errors.push(`${prefix}: Pokemon ID is invalid.`);
      if (!/^\d+$/.test(mon.level.trim()) || Number(mon.level) < 1) {
        errors.push(`${prefix}: Level must be >= 1.`);
      }
      if (mon.name && mon.name.length > 10) errors.push(`${prefix}: Name must be 10 characters or less.`);
      if (mon.gender && !["male", "female"].includes(mon.gender.toLowerCase())) {
        errors.push(`${prefix}: Gender must be male or female.`);
      }
      ["shiny", "superShiny", "shadow"].forEach((key) => {
        const value = (mon as TrainerPokemon)[key as keyof TrainerPokemon] as string;
        if (value && !["yes", "no", "true", "false"].includes(value.toLowerCase())) {
          errors.push(`${prefix}: ${key} must be yes, no, true, or false.`);
        }
      });
      mon.moves.forEach((move, idx) => {
        if (!move) return;
        if (!moveOptions.includes(move)) errors.push(`${prefix}: Move ${idx + 1} must be a valid Move ID.`);
      });
      if (mon.ability && !abilities.entries.find((a) => a.id === mon.ability)) {
        errors.push(`${prefix}: Ability must be a valid Ability ID.`);
      }
      if (mon.abilityIndex && mon.abilityIndex !== "none" && (!/^\d+$/.test(mon.abilityIndex) || Number(mon.abilityIndex) < 0)) {
        errors.push(`${prefix}: AbilityIndex must be >= 0.`);
      }
      if (mon.ability.trim() && mon.abilityIndex && mon.abilityIndex !== "none") {
        warnings.push(`${prefix}: AbilityIndex will be ignored because Ability is set.`);
      }
      if (mon.item && !itemOptions.includes(mon.item)) {
        errors.push(`${prefix}: Item must be a valid Item ID.`);
      }
      if (mon.nature && /\s/.test(mon.nature)) {
        errors.push(`${prefix}: Nature must not contain spaces.`);
      }
      if (mon.happiness) {
        const value = Number(mon.happiness);
        if (!Number.isFinite(value) || value < 0 || value > 255) {
          errors.push(`${prefix}: Happiness must be between 0 and 255.`);
        }
      }
      if (mon.ball && !ballOptions.includes(mon.ball)) {
        errors.push(`${prefix}: Ball must be a valid PokeBall/SnagBall ID.`);
      }

      const ivValues = mon.ivs.map((val) => Number(val || 0));
      if (ivValues.some((val) => val < 0 || val > 31)) errors.push(`${prefix}: IV values must be 0-31.`);
      const evValues = mon.evs.map((val) => Number(val || 0));
      if (evValues.some((val) => val < 0 || val > 252)) errors.push(`${prefix}: EV values must be 0-252.`);
      const evSum = evValues.reduce((sum, val) => sum + val, 0);
      if (evSum > 510) warnings.push(`${prefix}: EV total exceeds 510.`);
    });

    return { entry, errors, warnings };
  };

  const validation = useMemo(() => data.entries.map(validateEntry), [data.entries, pokemonOptions, moveOptions, itemOptions, ballOptions]);
  const invalidEntries = validation.filter((entry) => entry.errors.length > 0);
  const warningEntries = validation.filter((entry) => entry.warnings.length > 0);
  const hasInvalidEntries = invalidEntries.length > 0;

  const handleAddEntry = () => {
    const nextId = nextAvailableId("NEWTRAINER", data.entries);
    const entry: TrainerEntry = {
      id: nextId,
      name: "NewTrainer",
      version: 0,
      flags: [],
      items: [],
      loseText: "...",
      pokemon: [],
      order: nextOrder(data.entries),
    };
    setData((prev) => ({ entries: [...prev.entries, entry] }));
    setActiveKey(entryKey(entry));
    setStatus(`Added ${entry.id}.`);
  };

  const handleDuplicateEntry = (entry: TrainerEntry) => {
    const nextVersion = nextAvailableVersion(entry, data.entries);
    const duplicated: TrainerEntry = {
      ...entry,
      version: nextVersion,
      order: nextOrder(data.entries),
      items: [...entry.items],
      pokemon: entry.pokemon.map((mon) => ({ ...mon, moves: [...mon.moves], ivs: [...mon.ivs], evs: [...mon.evs] })),
    };
    setData((prev) => ({ entries: [...prev.entries, duplicated] }));
    setActiveKey(entryKey(duplicated));
    setStatus(`Added version ${nextVersion} for ${entry.id}.`);
  };

  const handleDeleteEntry = (entry: TrainerEntry) => {
    setStatus(null);
    setError(null);
    setIdError(null);
    const confirmDelete = window.confirm(`Delete ${entry.id},${entry.name}${entry.version ? `,${entry.version}` : ""}?`);
    if (!confirmDelete) return;
    setData((prev) => {
      const nextEntries = prev.entries.filter((item) => entryKey(item) !== entryKey(entry));
      const nextActive =
        nextEntries.find((item) => item.order > entry.order) ??
        nextEntries[nextEntries.length - 1] ??
        null;
      setActiveKey(nextActive ? entryKey(nextActive) : null);
      return { entries: nextEntries };
    });
    setStatus(`Deleted ${entry.id}.`);
  };

  const handleExport = async () => {
    if (idError || hasInvalidEntries) return;
    setStatus(null);
    setError(null);
    try {
      await exportTrainers(data);
      setStatus("Exported trainers.txt.");
      setSnapshot(serializeTrainers(data.entries));
      dirty.setDirty("trainers", false);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  };

  useEffect(() => {
    const nextSnap = serializeTrainers(data.entries);
    dirty.setDirty("trainers", nextSnap !== snapshot);
  }, [data.entries, snapshot]);

  if (loading) return <div className="panel">Loading trainers.txt...</div>;
  if (error && data.entries.length === 0) {
    return (
      <div className="panel">
        <h1>Trainers</h1>
        <p className="error">{error}</p>
      </div>
    );
  }

  return (
    <div className="editor-layout">
      <section className="list-panel">
        <div className="panel-header">
          <h1>Trainers</h1>
          <button className="ghost" onClick={handleAddEntry}>
            Add New
          </button>
        </div>
        <div className="list-filter">
          <input
            className="input"
            placeholder="Filter by Trainer..."
            value={filter}
            onChange={(event) => setFilter(event.target.value.toUpperCase())}
          />
        </div>
        <div className="list">
          {filteredEntries.map((entry) => (
            <button
              key={entryKey(entry)}
              className={`list-item ${entryKey(entry) === activeKey ? "active" : ""}`}
              onClick={() => setActiveKey(entryKey(entry))}
            >
              <div className="list-title">
                {entry.version > 0 ? `${entry.id},${entry.name},${entry.version}` : `${entry.id},${entry.name}`}
              </div>
              <div className="list-sub">{entry.loseText || "(no lose text)"}</div>
            </button>
          ))}
        </div>
      </section>
      <section className="detail-panel">
        {activeEntry ? (
          <TrainerDetail
            entry={activeEntry}
            onChange={updateEntry}
            onRename={updateEntryId}
            onValidateId={validateEntryId}
            onDuplicate={handleDuplicateEntry}
            onDelete={handleDeleteEntry}
            idError={idError}
            onSetIdError={setIdError}
            pokemonOptions={pokemonOptions}
            moveOptions={moveOptions}
            itemOptions={itemOptions}
            ballOptions={ballOptions}
            abilities={abilities}
            pokemonEntries={pokemon.entries}
          />
        ) : (
          <div className="panel">Select a trainer to edit.</div>
        )}
        {invalidEntries.length > 0 && (
          <section className="panel">
            <div className="panel-header">
              <h2>Validation Issues</h2>
              <div className="muted">Fix these before exporting.</div>
            </div>
            <div className="field-list">
              {invalidEntries.map(({ entry, errors }) => (
                <div key={entryKey(entry)} className="list-field">
                  <div className="list-field-row">
                    <strong>{entry.id},{entry.name}{entry.version ? `,${entry.version}` : ""}</strong>
                    <button className="ghost" onClick={() => setActiveKey(entryKey(entry))}>
                      Go to entry
                    </button>
                  </div>
                  <div className="muted">{errors.join("\n")}</div>
                </div>
              ))}
            </div>
          </section>
        )}
        {warningEntries.length > 0 && (
          <section className="panel">
            <div className="panel-header">
              <h2>Warnings</h2>
              <div className="muted">These will be exported.</div>
            </div>
            <div className="field-list">
              {warningEntries.map(({ entry, warnings }) => (
                <div key={entryKey(entry)} className="list-field">
                  <div className="list-field-row">
                    <strong>{entry.id},{entry.name}{entry.version ? `,${entry.version}` : ""}</strong>
                    <button className="ghost" onClick={() => setActiveKey(entryKey(entry))}>
                      Go to entry
                    </button>
                  </div>
                  <div className="muted">{warnings.join("\n")}</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </section>
      <section className="export-bar">
        <div className="export-warning">
          Exports never overwrite <strong>PBS/trainers.txt</strong>. Output goes to{" "}
          <strong>PBS_Output/trainers.txt</strong>.
        </div>
        <div className="export-actions">
          {status && <span className="status">{status}</span>}
          {error && <span className="error">{error}</span>}
          <button className="primary" onClick={handleExport} disabled={Boolean(idError) || hasInvalidEntries}>
            Export trainers.txt
          </button>
        </div>
      </section>
    </div>
  );
}
type DetailProps = {
  entry: TrainerEntry;
  onChange: (entry: TrainerEntry) => void;
  onRename: (entry: TrainerEntry, nextId: string, nextName: string, nextVersion: number) => void;
  onValidateId: (entry: TrainerEntry, nextId: string, nextName: string, nextVersion: string) => string | null;
  onDuplicate: (entry: TrainerEntry) => void;
  onDelete: (entry: TrainerEntry) => void;
  idError: string | null;
  onSetIdError: (value: string | null) => void;
  pokemonOptions: string[];
  moveOptions: string[];
  itemOptions: string[];
  ballOptions: string[];
  abilities: AbilitiesFile;
  pokemonEntries: PokemonFile["entries"];
};

function TrainerDetail({
  entry,
  onChange,
  onRename,
  onValidateId,
  onDuplicate,
  onDelete,
  idError,
  onSetIdError,
  pokemonOptions,
  moveOptions,
  itemOptions,
  ballOptions,
  abilities,
  pokemonEntries,
}: DetailProps) {
  const [idDraft, setIdDraft] = useState(entry.id);
  const [nameDraft, setNameDraft] = useState(entry.name);
  const [versionDraft, setVersionDraft] = useState(String(entry.version));

  useEffect(() => {
    setIdDraft(entry.id);
    setNameDraft(entry.name);
    setVersionDraft(String(entry.version));
  }, [entry.id, entry.name, entry.version]);

  const updateItems = (items: string[]) => {
    const cleaned = items.filter((item) => typeof item === "string" && item.trim());
    onChange({ ...entry, items: cleaned });
  };

  const updateFlags = (flags: string[]) => {
    const cleaned = flags.filter((flag) => typeof flag === "string" && flag.trim());
    onChange({ ...entry, flags: cleaned });
  };

  const updatePokemon = (index: number, next: TrainerPokemon) => {
    const nextList = entry.pokemon.map((mon, idx) => (idx === index ? next : mon));
    onChange({ ...entry, pokemon: nextList });
  };

  const removePokemon = (index: number) => {
    const nextList = entry.pokemon.filter((_, idx) => idx !== index);
    onChange({ ...entry, pokemon: nextList });
  };

  const duplicatePokemon = (index: number) => {
    const nextList = [...entry.pokemon];
    const copy = { ...nextList[index], moves: [...nextList[index].moves], ivs: [...nextList[index].ivs], evs: [...nextList[index].evs] };
    nextList.push(copy);
    onChange({ ...entry, pokemon: nextList });
  };

  const addPokemon = () => {
    onChange({ ...entry, pokemon: [...entry.pokemon, emptyPokemon()] });
  };

  const movePokemon = (from: number, to: number) => {
    if (from === to) return;
    const next = [...entry.pokemon];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange({ ...entry, pokemon: next });
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>{entry.version > 0 ? `${entry.id},${entry.name},${entry.version}` : `${entry.id},${entry.name}`}</h2>
        <div className="button-row">
          <button className="ghost" onClick={() => onDuplicate(entry)}>
            Add New Trainer Version
          </button>
          <button className="ghost" onClick={addPokemon}>
            Add New Pokemon
          </button>
          <button className="danger" onClick={() => onDelete(entry)}>
            Delete
          </button>
        </div>
      </div>
      <div className="field-list">
        <div className="field-row single">
          <label className="label">Trainer ID</label>
          <input
            className="input"
            value={idDraft}
            onChange={(event) => {
              const nextDraft = event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "");
              setIdDraft(nextDraft);
              const errorMessage = onValidateId(entry, nextDraft, nameDraft, versionDraft);
              onSetIdError(errorMessage);
              if (!errorMessage) {
                onRename(entry, nextDraft, nameDraft, Number(versionDraft));
              }
            }}
          />
          {idError && <span className="field-error">{idError}</span>}
        </div>
        <div className="field-row single">
          <label className="label">Name</label>
          <input
            className="input"
            value={nameDraft}
            onChange={(event) => {
              const nextDraft = event.target.value;
              setNameDraft(nextDraft);
              const errorMessage = onValidateId(entry, idDraft, nextDraft, versionDraft);
              onSetIdError(errorMessage);
              if (!errorMessage) {
                onRename(entry, idDraft, nextDraft, Number(versionDraft));
              }
            }}
          />
        </div>
        <div className="field-row single">
          <label className="label">Version</label>
          <input
            className="input"
            value={versionDraft}
            onChange={(event) => {
              const nextDraft = event.target.value.replace(/\D+/g, "");
              setVersionDraft(nextDraft);
              const errorMessage = onValidateId(entry, idDraft, nameDraft, nextDraft);
              onSetIdError(errorMessage);
              if (!errorMessage) {
                onRename(entry, idDraft, nameDraft, Number(nextDraft));
              }
            }}
          />
        </div>
        <FreeformListFieldEditor
          label="Flags"
          items={entry.flags}
          onChange={updateFlags}
        />
        <div className="field-row single">
          <label className="label">Items</label>
          <div className="field-list">
            {(entry.items.length ? [...entry.items, ""] : [""]).map((item, idx) => (
              <div key={`${idx}-${item}`} className="field-row encounter-slot-row">
                <input
                  className="input"
                  list="trainer-items"
                  value={item}
                  onChange={(event) => {
                    const next = [...entry.items];
                    next[idx] = event.target.value.trim().toUpperCase();
                    updateItems(next);
                  }}
                />
                {item && (
                  <button className="ghost" onClick={() => updateItems(entry.items.filter((_, i) => i !== idx))}>
                    Remove
                  </button>
                )}
              </div>
            ))}
            <datalist id="trainer-items">
              {itemOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>
        </div>
        <div className="field-row single">
          <label className="label">LoseText</label>
          <input
            className="input"
            value={entry.loseText}
            onChange={(event) => onChange({ ...entry, loseText: event.target.value })}
          />
        </div>
        {entry.pokemon.map((mon, index) => (
          <TrainerPokemonEditor
            key={`${index}`}
            value={mon}
            index={index}
            total={entry.pokemon.length}
            onChange={(next) => updatePokemon(index, next)}
            onDuplicate={() => duplicatePokemon(index)}
            onRemove={() => removePokemon(index)}
            onMove={(nextIndex) => movePokemon(index, nextIndex)}
            pokemonOptions={pokemonOptions}
            moveOptions={moveOptions}
            itemOptions={itemOptions}
            ballOptions={ballOptions}
            abilities={abilities}
            pokemonEntries={pokemonEntries}
          />
        ))}
      </div>
    </div>
  );
}

type PokemonEditorProps = {
  value: TrainerPokemon;
  index: number;
  total: number;
  onChange: (value: TrainerPokemon) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onMove: (index: number) => void;
  pokemonOptions: string[];
  moveOptions: string[];
  itemOptions: string[];
  ballOptions: string[];
  abilities: AbilitiesFile;
  pokemonEntries: PokemonFile["entries"];
};

function TrainerPokemonEditor({
  value,
  index,
  total,
  onChange,
  onDuplicate,
  onRemove,
  onMove,
  pokemonOptions,
  moveOptions,
  itemOptions,
  ballOptions,
  abilities,
  pokemonEntries,
}: PokemonEditorProps) {
  const [collapsed, setCollapsed] = useState(false);

  const moveSlots = normalizeMoves(value.moves);
  const ivs = normalizeStatList(value.ivs);
  const evs = normalizeStatList(value.evs);

  const abilityOptions = useMemo(() => {
    return abilitiesFromPokemon(value.pokemonId, pokemonEntries);
  }, [value.pokemonId, pokemonEntries]);

  const updateMoves = (nextMoves: string[]) => {
    onChange({ ...value, moves: normalizeMoves(nextMoves) });
  };

  const updateStat = (kind: "ivs" | "evs", index: number, next: string) => {
    const target = kind === "ivs" ? ivs : evs;
    const updated = target.map((val, idx) => (idx === index ? next : val));
    onChange({ ...value, [kind]: updated });
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Pokemon {index + 1}</h3>
        <div className="button-row">
          <select className="input input-mini" value={index} onChange={(event) => onMove(Number(event.target.value))}>
            {Array.from({ length: total }).map((_, idx) => (
              <option key={idx} value={idx}>
                Move to {idx + 1}
              </option>
            ))}
          </select>
          <button className="ghost" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? "Show" : "Hide"}
          </button>
          <button className="ghost" onClick={onDuplicate}>
            Duplicate
          </button>
          <button className="danger" onClick={onRemove}>
            Remove
          </button>
        </div>
      </div>
      <div className="field-list">
        <div className="field-row single">
          <label className="label">Pokemon</label>
          <input
            className="input"
            list={`trainer-pokemon-${index}`}
            value={value.pokemonId}
            onChange={(event) => onChange({ ...value, pokemonId: event.target.value.trim().toUpperCase() })}
          />
          <datalist id={`trainer-pokemon-${index}`}>
            {pokemonOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>
        <div className="field-row single">
          <label className="label">Level</label>
          <input
            className="input"
            value={value.level}
            onChange={(event) => onChange({ ...value, level: event.target.value.replace(/\D+/g, "") })}
          />
        </div>
        {!collapsed && (
          <>
            <div className="field-row single">
              <label className="label">Name</label>
              <input
                className="input"
                value={value.name}
                onChange={(event) => onChange({ ...value, name: event.target.value })}
              />
            </div>
            <div className="field-row single">
              <label className="label">Gender</label>
              <input
                className="input"
                value={value.gender}
                onChange={(event) => onChange({ ...value, gender: event.target.value.toLowerCase() })}
              />
            </div>
            <div className="field-row single">
              <label className="label">Shiny</label>
              <input
                className="input"
                value={value.shiny}
                onChange={(event) => onChange({ ...value, shiny: event.target.value.toLowerCase() })}
              />
            </div>
            <div className="field-row single">
              <label className="label">SuperShiny</label>
              <input
                className="input"
                value={value.superShiny}
                onChange={(event) => onChange({ ...value, superShiny: event.target.value.toLowerCase() })}
              />
            </div>
            <div className="field-row single">
              <label className="label">Shadow</label>
              <input
                className="input"
                value={value.shadow}
                onChange={(event) => onChange({ ...value, shadow: event.target.value.toLowerCase() })}
              />
            </div>
            <div className="field-row single">
              <label className="label">Moves</label>
              <div className="field-list">
                {moveSlots.map((move, idx) => {
                  const showField = idx === 0 || moveSlots[idx - 1];
                  if (!showField) return null;
                  return (
                    <div key={`${idx}`} className="field-row encounter-slot-row">
                      <input
                        className="input"
                        list={`trainer-move-${index}-${idx}`}
                        value={move}
                        onChange={(event) => {
                          const next = [...moveSlots];
                          next[idx] = event.target.value.trim().toUpperCase();
                          updateMoves(next);
                        }}
                      />
                      <datalist id={`trainer-move-${index}-${idx}`}>
                        {moveOptions.map((option) => (
                          <option key={option} value={option} />
                        ))}
                      </datalist>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="field-row single">
              <label className="label">Ability</label>
              <input
                className="input"
                list={`trainer-ability-${index}`}
                value={value.ability}
                onChange={(event) => onChange({ ...value, ability: event.target.value.trim().toUpperCase() })}
              />
              <datalist id={`trainer-ability-${index}`}>
                {abilities.entries.map((option) => (
                  <option key={option.id} value={option.id} />
                ))}
              </datalist>
            </div>
            <div className="field-row single">
              <label className="label">AbilityIndex</label>
              <select
                className="input"
                value={value.abilityIndex}
                onChange={(event) => onChange({ ...value, abilityIndex: event.target.value })}
              >
                <option value="none">(none)</option>
                {abilityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-row single">
              <label className="label">Item</label>
              <input
                className="input"
                list={`trainer-item-${index}`}
                value={value.item}
                onChange={(event) => onChange({ ...value, item: event.target.value.trim().toUpperCase() })}
              />
              <datalist id={`trainer-item-${index}`}>
                {itemOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>
            <div className="field-row single">
              <label className="label">Nature</label>
              <input
                className="input"
                list={`trainer-nature-${index}`}
                value={value.nature}
                onChange={(event) => onChange({ ...value, nature: event.target.value.trim().toUpperCase() })}
              />
              <datalist id={`trainer-nature-${index}`}>
                {NATURE_OPTIONS.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>
            <div className="field-row single">
              <label className="label">IV + EV</label>
              <div className="field-list">
                {STAT_LABELS.map((label, idx) => {
                  const exportIndex = STAT_EXPORT_INDEX[idx];
                  return (
                    <div key={label} className="field-row encounter-slot-row">
                      <input className="input" value={label} readOnly />
                      <input
                        className="input input-mini"
                        placeholder="IV"
                        value={ivs[exportIndex]}
                        onChange={(event) => updateStat("ivs", exportIndex, event.target.value.replace(/\D+/g, ""))}
                      />
                      <input
                        className="input input-mini"
                        placeholder="EV"
                        value={evs[exportIndex]}
                        onChange={(event) => updateStat("evs", exportIndex, event.target.value.replace(/\D+/g, ""))}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="field-row single">
              <label className="label">Happiness</label>
              <input
                className="input"
                value={value.happiness}
                onChange={(event) => onChange({ ...value, happiness: event.target.value.replace(/\D+/g, "") })}
              />
            </div>
            <div className="field-row single">
              <label className="label">Ball</label>
              <input
                className="input"
                list={`trainer-ball-${index}`}
                value={value.ball}
                onChange={(event) => onChange({ ...value, ball: event.target.value.trim().toUpperCase() })}
              />
              <datalist id={`trainer-ball-${index}`}>
                {ballOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
function ensureTrainerDefaults(entry: TrainerEntry): TrainerEntry {
  return {
    ...entry,
    name: entry.name ?? "",
    flags: entry.flags ?? [],
    items: entry.items ?? [],
    loseText: entry.loseText ?? "...",
    pokemon: entry.pokemon.map((mon) => ({
      ...emptyPokemon(),
      ...mon,
      moves: normalizeMoves(mon.moves ?? []),
      ivs: normalizeStatList(mon.ivs ?? []),
      evs: normalizeStatList(mon.evs ?? []),
    })),
  };
}

function emptyPokemon(): TrainerPokemon {
  return {
    pokemonId: "",
    level: "",
    name: "",
    gender: "",
    shiny: "no",
    superShiny: "no",
    shadow: "no",
    moves: ["", "", "", ""],
    ability: "",
    abilityIndex: "none",
    item: "",
    nature: "",
    ivs: ["", "", "", "", "", ""],
    evs: ["", "", "", "", "", ""],
    happiness: "70",
    ball: "",
  };
}

function normalizeMoves(moves: string[]) {
  const next = [...moves];
  while (next.length < 4) next.push("");
  return next.slice(0, 4);
}

function normalizeStatList(values: string[]) {
  const next = [...values];
  while (next.length < 6) next.push("");
  return next.slice(0, 6);
}

function abilitiesFromPokemon(pokemonId: string, pokemonEntries: PokemonFile["entries"]) {
  const entry = pokemonEntries.find((item) => item.id === pokemonId);
  if (!entry) return [{ value: "0", label: "0 - Ability1" }];
  const getField = (key: string) => entry.fields.find((field) => field.key === key)?.value ?? "";
  const abilitiesList = getField("Abilities").split(",").map((val) => val.trim()).filter(Boolean);
  const hidden = getField("HiddenAbilities").split(",").map((val) => val.trim()).filter(Boolean);
  const list = [...abilitiesList, ...hidden];
  if (list.length === 0) return [{ value: "0", label: "0 - Ability1" }];
  return list.map((id, idx) => ({ value: String(idx), label: `${idx} - ${id}` }));
}

function entryKey(entry: TrainerEntry) {
  return `${entry.id},${entry.name},${entry.version}`;
}

function nextOrder(entries: TrainerEntry[]) {
  return Math.max(0, ...entries.map((entry) => entry.order + 1));
}

function nextAvailableId(base: string, entries: TrainerEntry[]) {
  const existing = new Set(entries.map((entry) => entry.id.toLowerCase()));
  if (!existing.has(base.toLowerCase())) return base;
  let counter = 2;
  while (existing.has(`${base}${counter}`.toLowerCase())) counter += 1;
  return `${base}${counter}`;
}

function nextAvailableVersion(entry: TrainerEntry, entries: TrainerEntry[]) {
  const versions = new Set(entries.filter((item) => item.id === entry.id && item.name === entry.name).map((item) => item.version));
  let next = entry.version + 1;
  while (versions.has(next)) next += 1;
  return next;
}

function serializeTrainers(entries: TrainerEntry[]) {
  return JSON.stringify(
    entries.map((entry) => ({
      id: entry.id,
      name: entry.name,
      version: entry.version,
      items: entry.items,
      loseText: entry.loseText,
      order: entry.order,
      pokemon: entry.pokemon.map((mon) => ({
        ...mon,
        moves: [...mon.moves],
        ivs: [...mon.ivs],
        evs: [...mon.evs],
      })),
    }))
  );
}

function FreeformListFieldEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (nextItems: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const canCollapse = items.length > 5;
  const [collapsed, setCollapsed] = useState(canCollapse);

  useEffect(() => {
    if (!canCollapse) setCollapsed(false);
  }, [canCollapse]);

  const commitDraft = () => {
    const next = draft.trim();
    if (!next) return;
    onChange([...items, next]);
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
                value={item}
                onChange={(event) => {
                  const nextItems = [...items];
                  const nextValue = event.target.value.trim();
                  if (!nextValue) {
                    nextItems.splice(index, 1);
                  } else {
                    nextItems[index] = nextValue;
                  }
                  onChange(nextItems);
                }}
              />
              <button className="ghost" onClick={() => onChange(items.filter((_, idx) => idx !== index))}>
                Remove
              </button>
            </div>
          ))}
          <div className="list-field-row">
            <input
              className="input"
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
          </div>
        </div>
      )}
    </div>
  );
}
