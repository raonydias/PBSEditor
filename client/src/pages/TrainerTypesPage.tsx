import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { PBSEntry, TrainerTypesFile } from "@pbs/shared";
import { exportTrainerTypes, getBgmFiles, getTrainerTypes } from "../api";
import { serializeEntries, useDirty } from "../dirty";
import MoveEntryModal from "../components/MoveEntryModal";

const emptyFile: TrainerTypesFile = { entries: [] };
const emptyBgm: string[] = [];

const GENDER_OPTIONS = ["Male", "Female", "Unknown"] as const;

export default function TrainerTypesPage() {
  const [data, setData] = useState<TrainerTypesFile>(emptyFile);
  const [bgmFiles, setBgmFiles] = useState<string[]>(emptyBgm);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [idError, setIdError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [manualSkillLevel, setManualSkillLevel] = useState<Set<string>>(new Set());
  const dirty = useDirty();
  const bgmOptions = useMemo(() => {
    const seen = new Set<string>();
    return bgmFiles.reduce<{ value: string; label: string }[]>((acc, file) => {
      const value = file.replace(/\.[^/.]+$/, "");
      if (seen.has(value)) return acc;
      seen.add(value);
      acc.push({ value, label: file });
      return acc;
    }, []);
  }, [bgmFiles]);

  const ensureTrainerTypeDefaults = (entry: PBSEntry) => {
    const defaults = buildDefaultTrainerTypeEntry(entry.id, entry.order);
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
    Promise.all([getTrainerTypes(), getBgmFiles()])
      .then(([trainerResult, bgmResult]) => {
        if (!isMounted) return;
        const normalized = { entries: trainerResult.entries.map(ensureTrainerTypeDefaults) };
        setData(normalized);
        setBgmFiles(bgmResult);
        setActiveId(normalized.entries[0]?.id ?? null);
        const snap = serializeEntries(normalized.entries);
        setSnapshot(snap);
        dirty.setDirty("trainer_types", false);
        const manual = new Set<string>();
        for (const entry of normalized.entries) {
          const baseMoney = getFieldValue(entry, "BaseMoney");
          const skillLevel = getFieldValue(entry, "SkillLevel");
          if (skillLevel && skillLevel !== baseMoney) manual.add(entry.id);
        }
        setManualSkillLevel(manual);
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
    dirty.setCurrentKey("trainer_types");
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
    const updateSet = (set: Set<string>, setter: Dispatch<SetStateAction<Set<string>>>) => {
      if (!set.has(entry.id)) return;
      setter((prev) => {
        const next = new Set(prev);
        next.delete(entry.id);
        next.add(nextId);
        return next;
      });
    };
    updateSet(manualSkillLevel, setManualSkillLevel);
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
    const name = getFieldValue(entry, "Name").trim();
    if (!name) errors.Name = "Name is required.";

    const gender = getFieldValue(entry, "Gender").trim();
    if (!gender) {
      errors.Gender = "Gender is required.";
    } else if (!GENDER_OPTIONS.includes(gender as (typeof GENDER_OPTIONS)[number])) {
      errors.Gender = "Gender must be Male, Female, or Unknown.";
    }

    const baseMoney = getFieldValue(entry, "BaseMoney").trim();
    if (!baseMoney) {
      errors.BaseMoney = "BaseMoney is required.";
    } else if (!/^\d+$/.test(baseMoney)) {
      errors.BaseMoney = "BaseMoney must be an integer.";
    } else if (Number(baseMoney) < 1) {
      errors.BaseMoney = "BaseMoney must be at least 1.";
    }

    const skillLevel = getFieldValue(entry, "SkillLevel").trim();
    if (!skillLevel) {
      errors.SkillLevel = "SkillLevel is required.";
    } else if (!/^\d+$/.test(skillLevel)) {
      errors.SkillLevel = "SkillLevel must be an integer.";
    } else if (Number(skillLevel) < 1) {
      errors.SkillLevel = "SkillLevel must be at least 1.";
    }

    const flags = getFieldValue(entry, "Flags").trim();
    if (flags) {
      const parts = flags.split(",").map((part) => part.trim()).filter(Boolean);
      for (const part of parts) {
        if (/\s/.test(part)) {
          errors.Flags = "Flags must not contain spaces.";
          break;
        }
      }
    }

    const bgmKeys = ["IntroBGM", "BattleBGM", "VictoryBGM"];
    for (const key of bgmKeys) {
      const value = getFieldValue(entry, key).trim();
      if (!value) continue;
      if (!bgmOptions.some((option) => option.value === value)) {
        errors[key] = `${key} must be a valid BGM file.`;
      }
    }

    return errors;
  };

  const fieldErrors = useMemo(() => {
    if (!activeEntry) return {};
    return validateEntryFields(activeEntry);
  }, [activeEntry, bgmOptions]);

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
  }, [data.entries, bgmOptions]);

  const hasInvalidEntries = useMemo(() => {
    for (const entry of data.entries) {
      if (Object.keys(validateEntryFields(entry)).length > 0) return true;
      const idErrorMessage = validateEntryId(entry, entry.id);
      if (idErrorMessage) return true;
    }
    return false;
  }, [data.entries, bgmOptions]);

  useEffect(() => {
    if (!snapshot) return;
    const nextSnap = serializeEntries(data.entries);
    dirty.setDirty("trainer_types", nextSnap !== snapshot);
  }, [data.entries, snapshot]);

  const handleExport = async () => {
    setStatus(null);
    setError(null);
    try {
      await exportTrainerTypes(data);
      const nextSnap = serializeEntries(data.entries);
      setSnapshot(nextSnap);
      dirty.setDirty("trainer_types", false);
      setStatus("Exported to PBS_Output/trainer_types.txt");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  };

  const handleAddEntry = () => {
    setStatus(null);
    setError(null);
    setIdError(null);
    const newId = nextAvailableId("NEWTRAINERTYPE");
    const newEntry: PBSEntry = buildDefaultTrainerTypeEntry(newId, nextOrder());
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
    if (manualSkillLevel.has(entry.id)) {
      setManualSkillLevel((prev) => new Set(prev).add(newId));
    }
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
    setManualSkillLevel((prev) => {
      const next = new Set(prev);
      next.delete(entry.id);
      return next;
    });
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

  const buildDefaultTrainerTypeEntry = (id: string, order: number): PBSEntry => ({
    id,
    order,
    fields: [
      { key: "Name", value: toTitleCase(id) },
      { key: "Gender", value: "Unknown" },
      { key: "BaseMoney", value: "30" },
      { key: "SkillLevel", value: "30" },
      { key: "Flags", value: "" },
      { key: "IntroBGM", value: "" },
      { key: "BattleBGM", value: "" },
      { key: "VictoryBGM", value: "" },
    ],
  });

  const toTitleCase = (value: string) => {
    const lower = value.toLowerCase();
    return lower ? lower[0].toUpperCase() + lower.slice(1) : "";
  };

  if (loading) {
    return <div className="panel">Loading trainer_types.txt...</div>;
  }

  if (error && data.entries.length === 0) {
    return (
      <div className="panel">
        <h1>Trainer Types Editor</h1>
        <p className="error">{error}</p>
      </div>
    );
  }

  return (
    <div className="editor-layout">
      <section className="list-panel">
        <div className="panel-header">
          <h1>Trainer Types</h1>
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
          <TrainerTypeDetail
            entry={activeEntry}
            onChange={updateEntry}
            onRename={updateEntryId}
            onValidateId={validateEntryId}
            onDuplicate={handleDuplicateEntry}
            onDelete={handleDeleteEntry}
            onMoveEntry={() => setShowMoveModal(true)}
            idError={idError}
            onSetIdError={setIdError}
            fieldErrors={fieldErrors}
            bgmOptions={bgmOptions}
            manualSkillLevel={manualSkillLevel}
            setManualSkillLevel={setManualSkillLevel}
          />
        ) : (
          <div className="panel">Select a trainer type to edit.</div>
        )}
        {activeEntry && (
          <MoveEntryModal
            open={showMoveModal}
            total={data.entries.length}
            title={activeEntry.id}
            onClose={() => setShowMoveModal(false)}
            onMove={(targetIndex) => {
              const nextEntries = moveEntryById(data.entries, activeEntry.id, targetIndex);
              setData({ entries: nextEntries });
            }}
          />
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
          Exports never overwrite <strong>PBS/trainer_types.txt</strong>. Output goes to{" "}
          <strong>PBS_Output/trainer_types.txt</strong>.
        </div>
        <div className="export-actions">
          {status && <span className="status">{status}</span>}
          {error && <span className="error">{error}</span>}
          <button className="primary" onClick={handleExport} disabled={Boolean(idError) || hasInvalidEntries}>
            Export trainer_types.txt
          </button>
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
  onMoveEntry: () => void;
  idError: string | null;
  onSetIdError: (value: string | null) => void;
  fieldErrors: Record<string, string>;
  bgmOptions: { value: string; label: string }[];
  manualSkillLevel: Set<string>;
  setManualSkillLevel: Dispatch<SetStateAction<Set<string>>>;
};

function TrainerTypeDetail({
  entry,
  onChange,
  onRename,
  onValidateId,
  onDuplicate,
  onDelete,
  onMoveEntry,
  idError,
  onSetIdError,
  fieldErrors,
  bgmOptions,
  manualSkillLevel,
  setManualSkillLevel,
}: DetailProps) {
  const [idDraft, setIdDraft] = useState(entry.id);
  const [baseMoneyDraft, setBaseMoneyDraft] = useState("");

  useEffect(() => {
    setIdDraft(entry.id);
  }, [entry.id]);

  useEffect(() => {
    const currentBase = getFieldValue("BaseMoney");
    setBaseMoneyDraft(currentBase);
  }, [entry.id, entry.fields]);

  const updateField = (index: number, key: string, value: string) => {
    const nextFields = entry.fields.map((field, idx) =>
      idx === index ? { key, value } : field
    );
    onChange({ ...entry, fields: nextFields });
  };

  const commitBaseMoney = (index: number, nextValue: string) => {
    const currentSkill = getFieldValue("SkillLevel");
    const currentBase = getFieldValue("BaseMoney");
    const shouldSync = !manualSkillLevel.has(entry.id) && currentSkill === currentBase;
    const nextFields = entry.fields.map((field, idx) => {
      if (idx === index) return { key: field.key, value: nextValue };
      if (shouldSync && field.key === "SkillLevel") return { key: field.key, value: nextValue };
      return field;
    });
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

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>{entry.id}</h2>
        <div className="button-row">
          <button className="ghost" onClick={onMoveEntry}>
            Move Entry
          </button>
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
      <div className="pokemon-sprite pokemon-sprite-left trainer-sprite">
        <img
          src={`/assets/graphics/Trainers/${entry.id}.png`}
          key={entry.id}
          alt=""
          onLoad={(event) => {
            event.currentTarget.style.visibility = "visible";
          }}
          onError={(event) => {
            event.currentTarget.style.visibility = "hidden";
          }}
        />
      </div>
      <div className="field-list">
        <div className="field-row single">
          <label className="label">Trainer Type ID</label>
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
          if (field.key === "Gender") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input" value="Gender" readOnly />
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

          if (field.key === "BaseMoney") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input" value="BaseMoney" readOnly />
                <input
                  className="input"
                  value={baseMoneyDraft}
                  onChange={(event) => {
                    setBaseMoneyDraft(event.target.value);
                  }}
                  onBlur={() => {
                    const nextValue = baseMoneyDraft;
                    commitBaseMoney(index, nextValue);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      const nextValue = baseMoneyDraft;
                      commitBaseMoney(index, nextValue);
                    }
                  }}
                />
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "SkillLevel") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input" value="SkillLevel" readOnly />
                <input
                  className="input"
                  value={field.value}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    updateField(index, field.key, nextValue);
                    const currentBase = getFieldValue("BaseMoney");
                    if (nextValue.trim() === "" || nextValue === currentBase) {
                      setManualSkillLevel((prev) => {
                        const next = new Set(prev);
                        next.delete(entry.id);
                        return next;
                      });
                    } else {
                      setManualSkillLevel((prev) => new Set(prev).add(entry.id));
                    }
                  }}
                />
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "Flags") {
            return (
              <FreeformListFieldEditor
                key={`${field.key}-${index}`}
                label="Flags"
                value={field.value}
                onChange={(nextValue) => updateField(index, field.key, nextValue)}
                error={fieldErrors[field.key]}
              />
            );
          }

          if (field.key === "IntroBGM" || field.key === "BattleBGM" || field.key === "VictoryBGM") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input" value={field.key} readOnly />
                <select
                  className="input"
                  value={field.value}
                  onChange={(event) => updateField(index, field.key, event.target.value)}
                >
                  <option value="">(none)</option>
                  {bgmOptions.map((bgm) => (
                    <option key={bgm.label} value={bgm.value}>
                      {bgm.label}
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

type FreeformListFieldEditorProps = {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  error?: string;
};

function FreeformListFieldEditor({ label, value, onChange, error }: FreeformListFieldEditorProps) {
  const items = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const [draft, setDraft] = useState("");
  const canCollapse = items.length > 5;
  const [collapsed, setCollapsed] = useState(canCollapse);

  useEffect(() => {
    if (!canCollapse) setCollapsed(false);
  }, [canCollapse]);

  const handleChange = (index: number, next: string) => {
    const nextItems = [...items];
    if (!next) {
      nextItems.splice(index, 1);
    } else if (index === items.length) {
      nextItems.push(next);
    } else {
      nextItems[index] = next;
    }
    const deduped = nextItems.filter((item, idx) => nextItems.indexOf(item) === idx);
    onChange(deduped.join(","));
  };

  const commitDraft = () => {
    const next = draft.trim();
    if (!next) return;
    handleChange(items.length, next);
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
              onChange={(event) => handleChange(index, event.target.value)}
            />
            <button className="ghost" onClick={() => handleChange(index, "")}>
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
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

function getFieldValue(entry: PBSEntry, key: string) {
  return entry.fields.find((field) => field.key === key)?.value ?? "";
}

function moveEntryById(entries: PBSEntry[], id: string, targetIndex: number) {
  const fromIndex = entries.findIndex((entry) => entry.id === id);
  if (fromIndex === -1) return entries;
  const next = [...entries];
  const [moved] = next.splice(fromIndex, 1);
  const clamped = Math.max(0, Math.min(next.length, targetIndex));
  next.splice(clamped, 0, moved);
  return next.map((entry, index) => ({ ...entry, order: index }));
}
