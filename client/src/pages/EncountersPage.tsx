import { useEffect, useMemo, useState } from "react";
import type { EncounterEntry, EncounterSlot, EncounterType, EncountersFile, PokemonFile } from "@pbs/shared";
import { exportEncounters, getEncounters, getPokemon } from "../api";
import { useDirty } from "../dirty";

const emptyEncounters: EncountersFile = { entries: [] };
const emptyPokemon: PokemonFile = { entries: [] };

const ENCOUNTER_TYPE_OPTIONS = [
  "Land",
  "LandDay",
  "LandNight",
  "LandMorning",
  "LandAfternoon",
  "LandEvening",
  "Cave",
  "CaveDay",
  "CaveNight",
  "CaveMorning",
  "CaveAfternoon",
  "CaveEvening",
  "Water",
  "WaterDay",
  "WaterNight",
  "WaterMorning",
  "WaterEvening",
  "BugContest",
  "OldRod",
  "GoodRod",
  "SuperRod",
  "RockSmash",
  "HeadbuttLow",
  "HeadbuttHigh",
  "PokeRadar",
] as const;

const PROBABILITY_TYPES = new Set([
  "Land",
  "LandDay",
  "LandNight",
  "LandMorning",
  "LandAfternoon",
  "LandEvening",
  "Cave",
  "CaveDay",
  "CaveNight",
  "CaveMorning",
  "CaveAfternoon",
  "CaveEvening",
  "Water",
  "WaterDay",
  "WaterNight",
  "WaterMorning",
  "WaterEvening",
  "BugContest",
  "RockSmash",
  "PokeRadar",
]);

type EntryIssues = {
  entry: EncounterEntry;
  errors: string[];
};

type EntryWarnings = {
  entry: EncounterEntry;
  warnings: string[];
};

const EMPTY_SLOT: EncounterSlot = { chance: "", pokemon: "", formNumber: "", levelMin: "", levelMax: "" };

export default function EncountersPage() {
  const [data, setData] = useState<EncountersFile>(emptyEncounters);
  const [pokemon, setPokemon] = useState<PokemonFile>(emptyPokemon);
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
    Promise.all([getEncounters(), getPokemon()])
      .then(([encountersResult, pokemonResult]) => {
        if (!isMounted) return;
        const normalized = { entries: encountersResult.entries.map(ensureEncounterDefaults) };
        setData(normalized);
        setPokemon(pokemonResult);
        setActiveKey(normalized.entries[0] ? entryKey(normalized.entries[0]) : null);
        const snap = serializeEncounters(normalized.entries);
        setSnapshot(snap);
        dirty.setDirty("encounters", false);
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
    dirty.setCurrentKey("encounters");
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
        (entry.name ?? "").toLowerCase().includes(needle)
    );
  }, [data.entries, filter]);

  useEffect(() => {
    setIdError(null);
  }, [activeKey]);

  const pokemonOptions = useMemo(() => pokemon.entries.map((entry) => entry.id), [pokemon.entries]);

  const updateEntry = (updated: EncounterEntry) => {
    setData((prev) => ({
      ...prev,
      entries: prev.entries.map((entry) =>
        entryKey(entry) === entryKey(updated) ? updated : entry
      ),
    }));
  };

  const updateEntryId = (entry: EncounterEntry, nextId: string, nextVersion: number) => {
    setData((prev) => ({
      ...prev,
      entries: prev.entries.map((item) => {
        if (entryKey(item) !== entryKey(entry)) return item;
        return { ...item, id: nextId, version: nextVersion };
      }),
    }));
    setActiveKey(entryKey({ ...entry, id: nextId, version: nextVersion }));
  };

  const validateEntryId = (entry: EncounterEntry, idRaw: string, versionRaw: string) => {
    const nextId = idRaw.trim();
    if (!nextId) return "Map ID is required.";
    if (!/^\d+$/.test(nextId)) return "Map ID must be 0-9 only.";
    if (!/^\d+$/.test(versionRaw)) return "Version must be an integer of at least 0.";
    const nextVersion = Number(versionRaw);
    if (nextVersion < 0) return "Version must be an integer of at least 0.";
    const exists = data.entries.some(
      (item) =>
        item.id === nextId &&
        item.version === nextVersion &&
        entryKey(item) !== entryKey(entry)
    );
    if (exists) return "Map ID + Version must be unique.";
    return null;
  };

  const validateEntry = (entry: EncounterEntry) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const typeSet = new Set<string>();

    entry.encounterTypes.forEach((encounter) => {
      const type = encounter.type.trim();
      if (!type) return;
      const typeKey = type.toLowerCase();
      if (typeSet.has(typeKey)) {
        errors.push(`EncounterType: ${type} appears more than once.`);
      } else {
        typeSet.add(typeKey);
      }

      const probability = encounter.probability.trim();
      if (PROBABILITY_TYPES.has(type)) {
        if (!probability) {
          errors.push(`EncounterType ${type}: Probability is required.`);
        } else if (!/^\d+$/.test(probability) || Number(probability) < 1) {
          errors.push(`EncounterType ${type}: Probability must be >= 1.`);
        }
      } else if (probability) {
        warnings.push(`EncounterType ${type}: Probability is not required and will still be exported.`);
      }

      encounter.slots.forEach((slot, index) => {
        const hasAny =
          slot.chance.trim() ||
          slot.pokemon.trim() ||
          slot.formNumber.trim() ||
          slot.levelMin.trim() ||
          slot.levelMax.trim();
        if (!hasAny) return;
        const prefix = `EncounterType ${type} Slot ${index + 1}`;
        if (!/^\d+$/.test(slot.chance.trim()) || Number(slot.chance) < 1) {
          errors.push(`${prefix}: Chance must be >= 1.`);
        }
        if (!slot.pokemon.trim()) {
          errors.push(`${prefix}: Pokemon is required.`);
        } else if (!pokemonOptions.includes(slot.pokemon.trim())) {
          errors.push(`${prefix}: Pokemon must be a valid ID.`);
        }
        if (slot.formNumber.trim()) {
          if (!/^\d+$/.test(slot.formNumber.trim())) {
            errors.push(`${prefix}: FormNumber must be an integer.`);
          } else if (Number(slot.formNumber) < 0) {
            errors.push(`${prefix}: FormNumber must be 0 or greater.`);
          }
        }
        if (!/^\d+$/.test(slot.levelMin.trim()) || Number(slot.levelMin) < 1) {
          errors.push(`${prefix}: LevelMin must be >= 1.`);
        }
        if (slot.levelMax.trim()) {
          if (!/^\d+$/.test(slot.levelMax.trim())) {
            errors.push(`${prefix}: LevelMax must be an integer.`);
          } else if (Number(slot.levelMax) < Number(slot.levelMin)) {
            errors.push(`${prefix}: LevelMax must be >= LevelMin.`);
          }
        }
      });
    });

    return { errors, warnings };
  };

  const invalidEntries = useMemo(() => {
    return data.entries
      .map((entry) => ({ entry, issues: validateEntry(entry) }))
      .filter(({ issues }) => issues.errors.length > 0)
      .map(({ entry, issues }) => ({ entry, errors: issues.errors }));
  }, [data.entries, pokemonOptions]);

  const warningEntries = useMemo(() => {
    return data.entries
      .map((entry) => ({ entry, issues: validateEntry(entry) }))
      .filter(({ issues }) => issues.warnings.length > 0)
      .map(({ entry, issues }) => ({ entry, warnings: issues.warnings }));
  }, [data.entries, pokemonOptions]);

  const hasInvalidEntries = invalidEntries.length > 0;

  const handleAddEntry = () => {
    const nextId = nextAvailableMapId(data.entries);
    const entry: EncounterEntry = {
      id: nextId,
      version: 0,
      name: "",
      order: nextOrder(data.entries),
      encounterTypes: [],
    };
    setData((prev) => ({ entries: [...prev.entries, entry] }));
    setActiveKey(entryKey(entry));
    setStatus(`Added ${entry.id}.`);
  };

  const handleDuplicateEntry = (entry: EncounterEntry) => {
    const nextVersion = nextAvailableVersion(entry.id, data.entries, entry.version);
    const duplicated: EncounterEntry = {
      ...entry,
      version: nextVersion,
      order: nextOrder(data.entries),
      encounterTypes: entry.encounterTypes.map((type) => ({
        ...type,
        slots: type.slots.map((slot) => ({ ...slot })),
      })),
    };
    setData((prev) => ({ entries: [...prev.entries, duplicated] }));
    setActiveKey(entryKey(duplicated));
    setStatus(`Added version ${nextVersion} for ${entry.id}.`);
  };

  const handleDeleteEntry = (entry: EncounterEntry) => {
    setStatus(null);
    setError(null);
    setIdError(null);
    const confirmDelete = window.confirm(`Delete ${entry.id}${entry.version ? `,${entry.version}` : ""}?`);
    if (!confirmDelete) return;
    setData((prev) => {
      const nextEntries = prev.entries.filter((item) => item !== entry);
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
      await exportEncounters(data);
      setStatus("Exported encounters.txt.");
      const snap = serializeEncounters(data.entries);
      setSnapshot(snap);
      dirty.setDirty("encounters", false);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  };

  useEffect(() => {
    const nextSnap = serializeEncounters(data.entries);
    dirty.setDirty("encounters", nextSnap !== snapshot);
  }, [data.entries, snapshot]);

  if (loading) return <div className="panel">Loading encounters.txt...</div>;
  if (error && data.entries.length === 0) {
    return (
      <div className="panel">
        <h1>Encounters</h1>
        <p className="error">{error}</p>
      </div>
    );
  }

  return (
    <div className="editor-layout">
      <section className="list-panel">
        <div className="panel-header">
          <h1>Encounters</h1>
          <button className="ghost" onClick={handleAddEntry}>
            Add New
          </button>
        </div>
        <div className="list-filter">
          <input
            className="input"
            placeholder="Filter by Map..."
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        </div>
        <div className="list">
          {filteredEntries.map((entry) => (
            <button
              key={`${entry.id}-${entry.version}`}
              className={`list-item ${entryKey(entry) === activeKey ? "active" : ""}`}
              onClick={() => setActiveKey(entryKey(entry))}
            >
              <div className="list-title">
                {entry.version > 0 ? `${entry.id},${entry.version}` : entry.id}
              </div>
              <div className="list-sub">
                {entry.name ? entry.name : `Version ${entry.version}`}
              </div>
            </button>
          ))}
        </div>
      </section>
      <section className="detail-panel">
        {activeEntry ? (
          <EncounterDetail
            entry={activeEntry}
            onChange={updateEntry}
            onRename={updateEntryId}
            onValidateId={validateEntryId}
            onAddType={(entry) => {
              const nextType: EncounterType = { type: "", probability: "", slots: [emptySlot()] };
              updateEntry({
                ...entry,
                encounterTypes: [...entry.encounterTypes, nextType],
              });
            }}
            onDuplicate={handleDuplicateEntry}
            onDelete={handleDeleteEntry}
            idError={idError}
            onSetIdError={setIdError}
            pokemonOptions={pokemonOptions}
          />
        ) : (
          <div className="panel">Select an encounter to edit.</div>
        )}
        {invalidEntries.length > 0 && (
          <section className="panel">
            <div className="panel-header">
              <h2>Validation Issues</h2>
              <div className="muted">Fix these before exporting.</div>
            </div>
            <div className="field-list">
              {invalidEntries.map(({ entry, errors }) => (
                <div key={`${entry.id}-${entry.version}`} className="list-field">
                  <div className="list-field-row">
                    <strong>{entry.id}{entry.version ? `,${entry.version}` : ""}</strong>
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
                <div key={`${entry.id}-${entry.version}`} className="list-field">
                  <div className="list-field-row">
                    <strong>{entry.id}{entry.version ? `,${entry.version}` : ""}</strong>
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
          Exports never overwrite <strong>PBS/encounters.txt</strong>. Output goes to{" "}
          <strong>PBS_Output/encounters.txt</strong>.
        </div>
        <div className="export-actions">
          {status && <span className="status">{status}</span>}
          {error && <span className="error">{error}</span>}
          <button className="primary" onClick={handleExport} disabled={Boolean(idError) || hasInvalidEntries}>
            Export encounters.txt
          </button>
        </div>
      </section>
    </div>
  );
}

type DetailProps = {
  entry: EncounterEntry;
  onChange: (entry: EncounterEntry) => void;
  onRename: (entry: EncounterEntry, nextId: string, nextVersion: number) => void;
  onValidateId: (entry: EncounterEntry, nextId: string, nextVersion: string) => string | null;
  onAddType: (entry: EncounterEntry) => void;
  onDuplicate: (entry: EncounterEntry) => void;
  onDelete: (entry: EncounterEntry) => void;
  idError: string | null;
  onSetIdError: (value: string | null) => void;
  pokemonOptions: string[];
};

function EncounterDetail({
  entry,
  onChange,
  onRename,
  onValidateId,
  onAddType,
  onDuplicate,
  onDelete,
  idError,
  onSetIdError,
  pokemonOptions,
}: DetailProps) {
  const [idDraft, setIdDraft] = useState(entry.id);
  const [versionDraft, setVersionDraft] = useState(String(entry.version));

  useEffect(() => {
    setIdDraft(entry.id);
    setVersionDraft(String(entry.version));
  }, [entry.id, entry.version]);

  const updateEncounterType = (index: number, next: EncounterType) => {
    const nextTypes = entry.encounterTypes.map((type, idx) => (idx === index ? next : type));
    onChange({ ...entry, encounterTypes: nextTypes });
  };

  const removeEncounterType = (index: number) => {
    const nextTypes = entry.encounterTypes.filter((_, idx) => idx !== index);
    onChange({ ...entry, encounterTypes: nextTypes });
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>{entry.id}{entry.version ? `,${entry.version}` : ""}</h2>
        <div className="button-row">
          <button className="ghost" onClick={() => onDuplicate(entry)}>
            Add New Encounter Version
          </button>
          <button className="ghost" onClick={() => onAddType(entry)}>
            Add New Encounter Type
          </button>
          <button className="danger" onClick={() => onDelete(entry)}>
            Delete
          </button>
        </div>
      </div>
      <div className="field-list">
        <div className="field-row single">
          <label className="label">Map ID</label>
          <div className="stack">
            <input
              className="input"
              value={idDraft}
              onChange={(event) => {
                const nextDraft = event.target.value.replace(/\D+/g, "");
                setIdDraft(nextDraft);
                const errorMessage = onValidateId(entry, nextDraft, versionDraft);
                onSetIdError(errorMessage);
                if (!errorMessage && (nextDraft !== entry.id || Number(versionDraft) !== entry.version)) {
                  onRename(entry, nextDraft, Number(versionDraft));
                }
              }}
            />
            {idError && <span className="field-error">{idError}</span>}
          </div>
        </div>
        <div className="field-row single">
          <label className="label">Version</label>
          <input
            className="input"
            value={versionDraft}
            onChange={(event) => {
              const nextDraft = event.target.value.replace(/\D+/g, "");
              setVersionDraft(nextDraft);
              const errorMessage = onValidateId(entry, idDraft, nextDraft);
              onSetIdError(errorMessage);
              if (!errorMessage && (idDraft !== entry.id || Number(nextDraft) !== entry.version)) {
                onRename(entry, idDraft, Number(nextDraft));
              }
            }}
          />
        </div>
        <div className="field-row single">
          <label className="label">Name</label>
          <input
            className="input"
            value={entry.name}
            onChange={(event) => onChange({ ...entry, name: event.target.value })}
          />
        </div>

        {entry.encounterTypes.map((encounterType, index) => (
          <EncounterTypeEditor
            key={`${entry.id}-${entry.version}-${index}`}
            value={encounterType}
            onChange={(next) => updateEncounterType(index, next)}
            onRemove={() => removeEncounterType(index)}
            onMove={(nextIndex) => {
              if (nextIndex === index) return;
              const nextTypes = [...entry.encounterTypes];
              const [moved] = nextTypes.splice(index, 1);
              nextTypes.splice(nextIndex, 0, moved);
              onChange({ ...entry, encounterTypes: nextTypes });
            }}
            index={index}
            total={entry.encounterTypes.length}
            pokemonOptions={pokemonOptions}
          />
        ))}
      </div>
    </div>
  );
}

function EncounterTypeEditor({
  value,
  onChange,
  onRemove,
  onMove,
  index,
  total,
  pokemonOptions,
}: {
  value: EncounterType;
  onChange: (value: EncounterType) => void;
  onRemove: () => void;
  onMove: (nextIndex: number) => void;
  index: number;
  total: number;
  pokemonOptions: string[];
}) {
  const [collapsed, setCollapsed] = useState(false);

  const slots = value.slots;

  const updateSlot = (index: number, nextSlot: EncounterSlot) => {
    const nextSlots = slots.map((slot, idx) => (idx === index ? nextSlot : slot));
    onChange({ ...value, slots: nextSlots });
  };

  const removeSlot = (index: number) => {
    const nextSlots = slots.filter((_, idx) => idx !== index);
    onChange({ ...value, slots: nextSlots });
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Encounter Type</h3>
        <div className="button-row">
          <select
            className="input input-mini"
            value={index}
            onChange={(event) => onMove(Number(event.target.value))}
          >
            {Array.from({ length: total }).map((_, idx) => (
              <option key={idx} value={idx}>
                Move to {idx + 1}
              </option>
            ))}
          </select>
          <button className="ghost" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? "Show" : "Hide"}
          </button>
          <button className="danger" onClick={onRemove}>
            Remove
          </button>
        </div>
      </div>
      <div className="field-list">
        <div className="field-row encounter-type-row">
          <div className="stack">
            <label className="label">Type</label>
            <input
              className="input"
              list="encounter-types"
              value={value.type}
              onChange={(event) => onChange({ ...value, type: event.target.value.trim() })}
            />
            <datalist id="encounter-types">
              {ENCOUNTER_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>
          <div className="stack">
            <label className="label">Probability</label>
            <input
              className="input input-mini"
              value={value.probability}
              onChange={(event) => onChange({ ...value, probability: event.target.value.replace(/\D+/g, "") })}
            />
          </div>
        </div>
        {!collapsed && (
          <div className="field-list">
            {slots.map((slot, index) => {
              return (
                <div key={`${index}`} className="field-row encounter-slot-row">
                  <input
                    className="input input-mini"
                    placeholder="Chance"
                    value={slot.chance}
                    onChange={(event) =>
                      updateSlot(index, { ...slot, chance: event.target.value.replace(/\D+/g, "") })
                    }
                  />
                  <input
                    className="input"
                    list={`encounter-pokemon-${index}`}
                    placeholder="Select Pokemon"
                    value={slot.pokemon}
                    onChange={(event) => updateSlot(index, { ...slot, pokemon: event.target.value.trim().toUpperCase() })}
                  />
                  <datalist id={`encounter-pokemon-${index}`}>
                    {pokemonOptions.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                  <input
                    className="input input-mini"
                    placeholder="Form"
                    value={slot.formNumber}
                    onChange={(event) =>
                      updateSlot(index, { ...slot, formNumber: event.target.value.replace(/\D+/g, "") })
                    }
                  />
                  <input
                    className="input input-mini"
                    placeholder="Min"
                    value={slot.levelMin}
                    onChange={(event) =>
                      updateSlot(index, { ...slot, levelMin: event.target.value.replace(/\D+/g, "") })
                    }
                  />
                  <input
                    className="input input-mini"
                    placeholder="Max"
                    value={slot.levelMax}
                    onChange={(event) =>
                      updateSlot(index, { ...slot, levelMax: event.target.value.replace(/\D+/g, "") })
                    }
                  />
                  <button className="ghost" onClick={() => removeSlot(index)}>
                    Remove
                  </button>
                </div>
              );
            })}
            <div className="field-row encounter-slot-row">
              <button
                className="ghost success"
                onClick={() => onChange({ ...value, slots: [...value.slots, emptySlot()] })}
              >
                Add New Pokemon
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ensureEncounterDefaults(entry: EncounterEntry): EncounterEntry {
  return {
    ...entry,
    name: entry.name ?? "",
    encounterTypes: entry.encounterTypes.map((type) => ({
      type: type.type ?? "",
      probability: type.probability ?? "",
      slots: (type.slots ?? []).map((slot) => ({
        chance: slot.chance ?? "",
        pokemon: slot.pokemon ?? "",
        formNumber: slot.formNumber ?? "",
        levelMin: slot.levelMin ?? "",
        levelMax: slot.levelMax ?? "",
      })),
    })),
  };
}

function isEmptySlot(slot: EncounterSlot) {
  return (
    !slot.chance.trim() &&
    !slot.pokemon.trim() &&
    !slot.formNumber.trim() &&
    !slot.levelMin.trim() &&
    !slot.levelMax.trim()
  );
}

function emptySlot() {
  return { ...EMPTY_SLOT };
}

function nextOrder(entries: EncounterEntry[]) {
  return Math.max(0, ...entries.map((entry) => entry.order + 1));
}

function nextAvailableMapId(entries: EncounterEntry[]) {
  const ids = entries
    .map((entry) => Number(entry.id))
    .filter((value) => Number.isFinite(value));
  const next = ids.length ? Math.max(...ids) + 1 : 1;
  return String(next).padStart(3, "0");
}

function nextAvailableVersion(id: string, entries: EncounterEntry[], currentVersion: number) {
  const versions = new Set(entries.filter((entry) => entry.id === id).map((entry) => entry.version));
  let next = currentVersion + 1;
  while (versions.has(next)) next += 1;
  return next;
}

function entryKey(entry: EncounterEntry) {
  return `${entry.id},${entry.version}`;
}

function serializeEncounters(entries: EncounterEntry[]) {
  return JSON.stringify(
    entries.map((entry) => ({
      id: entry.id,
      version: entry.version,
      name: entry.name,
      order: entry.order,
      encounterTypes: entry.encounterTypes.map((type) => ({
        type: type.type,
        probability: type.probability,
        slots: type.slots.map((slot) => ({ ...slot })),
      })),
    }))
  );
}
