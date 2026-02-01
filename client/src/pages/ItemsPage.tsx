import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { ItemsFile, MovesFile, PBSEntry } from "@pbs/shared";
import { exportItems, getItems, getMoves } from "../api";
import { serializeEntries, useDirty } from "../dirty";

const emptyFile: ItemsFile = { entries: [] };
const emptyMoves: MovesFile = { entries: [] };

const FIELD_USE_OPTIONS = ["OnPokemon", "Direct", "TR", "TM", "HM"] as const;
const BATTLE_USE_OPTIONS = ["OnPokemon", "OnMove", "OnBattler", "OnFoe", "Direct"] as const;
const FLAG_OPTIONS = [
  "Mail",
  "IconMail",
  "PokeBall",
  "SnagBall",
  "Berry",
  "KeyItem",
  "EvolutionStone",
  "Fossil",
  "Apricorn",
  "TypeGem",
  "Mulch",
  "MegaStone",
  "MegaRing",
  "Repel",
  "Fling_30",
  "NaturalGift_POISON_80",
] as const;

const splitList = (value: string) =>
  value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

export default function ItemsPage() {
  const [data, setData] = useState<ItemsFile>(emptyFile);
  const [moves, setMoves] = useState<MovesFile>(emptyMoves);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [idError, setIdError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [manualNamePlural, setManualNamePlural] = useState<Set<string>>(new Set());
  const [manualSellPrice, setManualSellPrice] = useState<Set<string>>(new Set());
  const [manualConsumable, setManualConsumable] = useState<Set<string>>(new Set());
  const [manualShowQuantity, setManualShowQuantity] = useState<Set<string>>(new Set());
  const dirty = useDirty();

  const toTitleCase = (value: string) => {
    const lower = value.toLowerCase();
    return lower ? lower[0].toUpperCase() + lower.slice(1) : "";
  };

  const getFieldValue = (entry: PBSEntry, key: string) => {
    return entry.fields.find((field) => field.key === key)?.value ?? "";
  };

  const isMoveRequired = (entry: PBSEntry) => {
    const fieldUse = getFieldValue(entry, "FieldUse").trim();
    return fieldUse === "HM" || fieldUse === "TM" || fieldUse === "TR";
  };

  const ensureItemDefaults = (entry: PBSEntry) => {
    const defaults = buildDefaultItemEntry(entry.id, entry.order);
    const existing = new Map(entry.fields.map((field) => [field.key, field.value]));
    const defaultKeys = new Set(defaults.fields.map((field) => field.key));
    const merged = defaults.fields.map((field) => ({
      key: field.key,
      value: existing.get(field.key) ?? field.value,
    }));
    if (!existing.has("NamePlural")) {
      const idx = merged.findIndex((field) => field.key === "NamePlural");
      if (idx !== -1) merged[idx] = { key: "NamePlural", value: "" };
    }
    for (const field of entry.fields) {
      if (!defaultKeys.has(field.key)) merged.push(field);
    }
    return { ...entry, fields: merged };
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([getItems(), getMoves()])
      .then(([itemsResult, movesResult]) => {
        if (!isMounted) return;
        const normalized = { entries: itemsResult.entries.map(ensureItemDefaults) };
        setData(normalized);
        setMoves(movesResult);
        setActiveId(normalized.entries[0]?.id ?? null);
        const snap = serializeEntries(normalized.entries);
        setSnapshot(snap);
        dirty.setDirty("items", false);
        const namePluralManual = new Set<string>();
        const sellPriceManual = new Set<string>();
        const consumableManual = new Set<string>();
        const showQuantityManual = new Set<string>();
        for (const entry of normalized.entries) {
          const name = getFieldValue(entry, "Name");
          const namePlural = getFieldValue(entry, "NamePlural");
          if (namePlural && namePlural !== `${name}s`) namePluralManual.add(entry.id);
          const sellPrice = getFieldValue(entry, "SellPrice");
          if (sellPrice) sellPriceManual.add(entry.id);
          const consumable = getFieldValue(entry, "Consumable");
          if (consumable) consumableManual.add(entry.id);
          const showQuantity = getFieldValue(entry, "ShowQuantity");
          if (showQuantity) showQuantityManual.add(entry.id);
        }
        setManualNamePlural(namePluralManual);
        setManualSellPrice(sellPriceManual);
        setManualConsumable(consumableManual);
        setManualShowQuantity(showQuantityManual);
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
    dirty.setCurrentKey("items");
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

  const moveOptions = useMemo(() => moves.entries.map((entry) => entry.id), [moves.entries]);

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
    updateSet(manualNamePlural, setManualNamePlural);
    updateSet(manualSellPrice, setManualSellPrice);
    updateSet(manualConsumable, setManualConsumable);
    updateSet(manualShowQuantity, setManualShowQuantity);
    setData((prev) => ({
      ...prev,
      entries: prev.entries.map((item) => {
        if (item.id !== entry.id) return item;
        const nextFields = item.fields.map((field) => {
          if (field.key !== "Name") return field;
          if (field.value.trim().toLowerCase() !== entry.id.toLowerCase()) return field;
          return { ...field, value: toTitleCase(nextId) };
        });
        const namePlural = nextFields.find((field) => field.key === "NamePlural");
        if (namePlural && !manualNamePlural.has(entry.id)) {
          namePlural.value = `${toTitleCase(nextId)}s`;
        }
        return { ...item, id: nextId, fields: nextFields };
      }),
    }));
    setActiveId(nextId);
  };

  const validateEntryFields = (entry: PBSEntry) => {
    const errors: Record<string, string> = {};
    const name = getFieldValue(entry, "Name").trim();
    const namePlural = getFieldValue(entry, "NamePlural").trim();
    if (!name) errors.Name = "Name is required.";
    if (!namePlural) errors.NamePlural = "NamePlural is required.";

    const pocket = getFieldValue(entry, "Pocket").trim();
    if (!pocket) {
      errors.Pocket = "Pocket is required.";
    } else if (!/^\d+$/.test(pocket)) {
      errors.Pocket = "Pocket must be an integer.";
    } else if (Number(pocket) < 1) {
      errors.Pocket = "Pocket must be at least 1.";
    }

    const price = getFieldValue(entry, "Price").trim();
    if (!price) {
      errors.Price = "Price is required.";
    } else if (!/^\d+$/.test(price)) {
      errors.Price = "Price must be an integer.";
    }

    const sellPrice = getFieldValue(entry, "SellPrice").trim();
    if (sellPrice && !/^\d+$/.test(sellPrice)) {
      errors.SellPrice = "SellPrice must be an integer.";
    }

    const bpPrice = getFieldValue(entry, "BPPrice").trim();
    if (bpPrice && !/^\d+$/.test(bpPrice)) {
      errors.BPPrice = "BPPrice must be an integer.";
    }

    const fieldUse = getFieldValue(entry, "FieldUse").trim();
    if (fieldUse) {
      if (!FIELD_USE_OPTIONS.includes(fieldUse as (typeof FIELD_USE_OPTIONS)[number])) {
        errors.FieldUse = "FieldUse must be one of the provided options.";
      }
    }

    const battleUse = getFieldValue(entry, "BattleUse").trim();
    if (battleUse) {
      if (!BATTLE_USE_OPTIONS.includes(battleUse as (typeof BATTLE_USE_OPTIONS)[number])) {
        errors.BattleUse = "BattleUse must be one of the provided options.";
      }
    }

    const flags = getFieldValue(entry, "Flags").trim();
    if (flags) {
      const parts = splitList(flags);
      for (const part of parts) {
        if (/\s/.test(part)) {
          errors.Flags = "Flags must not contain spaces.";
          break;
        }
      }
    }

    const consumable = getFieldValue(entry, "Consumable").trim().toLowerCase();
    if (consumable && consumable !== "true" && consumable !== "false") {
      errors.Consumable = "Consumable must be true or false.";
    }

    const showQuantity = getFieldValue(entry, "ShowQuantity").trim().toLowerCase();
    if (showQuantity && showQuantity !== "true" && showQuantity !== "false") {
      errors.ShowQuantity = "ShowQuantity must be true or false.";
    }

    const description = getFieldValue(entry, "Description").trim();
    if (!description) errors.Description = "Description is required.";

    const move = getFieldValue(entry, "Move").trim();
    if (isMoveRequired(entry)) {
      if (!move) {
        errors.Move = "Move is required.";
      } else if (/\s/.test(move)) {
        errors.Move = "Move must not contain spaces.";
      } else if (!/^[A-Z0-9_]+$/.test(move)) {
        errors.Move = "Move must use A-Z, 0-9, or _ only.";
      } else if (moveOptions.length && !moveOptions.includes(move)) {
        errors.Move = "Move must be a valid Move ID.";
      }
    }

    return errors;
  };

  const fieldErrors = useMemo(() => {
    if (!activeEntry) return {};
    return validateEntryFields(activeEntry);
  }, [activeEntry, moveOptions]);

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
  }, [data.entries, moveOptions]);

  const hasInvalidEntries = useMemo(() => {
    for (const entry of data.entries) {
      if (Object.keys(validateEntryFields(entry)).length > 0) return true;
      const idErrorMessage = validateEntryId(entry, entry.id);
      if (idErrorMessage) return true;
    }
    return false;
  }, [data.entries, moveOptions]);

  useEffect(() => {
    if (!snapshot) return;
    const nextSnap = serializeEntries(data.entries);
    dirty.setDirty("items", nextSnap !== snapshot);
  }, [data.entries, snapshot]);

  const handleExport = async () => {
    setStatus(null);
    setError(null);
    try {
      const exportData = buildExportData(data);
      await exportItems(exportData);
      const nextSnap = serializeEntries(data.entries);
      setSnapshot(nextSnap);
      dirty.setDirty("items", false);
      setStatus("Exported to PBS_Output/items.txt");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  };

  const handleAddEntry = () => {
    setStatus(null);
    setError(null);
    setIdError(null);
    const newId = nextAvailableId("NEWITEM");
    const newEntry: PBSEntry = buildDefaultItemEntry(newId, nextOrder());
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
    if (manualNamePlural.has(entry.id)) {
      setManualNamePlural((prev) => new Set(prev).add(newId));
    }
    if (manualSellPrice.has(entry.id)) {
      setManualSellPrice((prev) => new Set(prev).add(newId));
    }
    if (manualConsumable.has(entry.id)) {
      setManualConsumable((prev) => new Set(prev).add(newId));
    }
    if (manualShowQuantity.has(entry.id)) {
      setManualShowQuantity((prev) => new Set(prev).add(newId));
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
    setManualNamePlural((prev) => {
      const next = new Set(prev);
      next.delete(entry.id);
      return next;
    });
    setManualSellPrice((prev) => {
      const next = new Set(prev);
      next.delete(entry.id);
      return next;
    });
    setManualConsumable((prev) => {
      const next = new Set(prev);
      next.delete(entry.id);
      return next;
    });
    setManualShowQuantity((prev) => {
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

  const buildDefaultItemEntry = (id: string, order: number): PBSEntry => ({
    id,
    order,
    fields: [
      { key: "Name", value: toTitleCase(id) },
      { key: "NamePlural", value: `${toTitleCase(id)}s` },
      { key: "PortionName", value: "" },
      { key: "PortionNamePlural", value: "" },
      { key: "Pocket", value: "1" },
      { key: "Price", value: "0" },
      { key: "SellPrice", value: "" },
      { key: "BPPrice", value: "" },
      { key: "FieldUse", value: "" },
      { key: "BattleUse", value: "" },
      { key: "Flags", value: "" },
      { key: "Consumable", value: "" },
      { key: "ShowQuantity", value: "" },
      { key: "Move", value: "" },
      { key: "Description", value: "???" },
    ],
  });

  const buildExportData = (source: ItemsFile): ItemsFile => {
    const entries = source.entries.map((entry) => {
      const price = Number(getFieldValue(entry, "Price") || 0);
      const autoSell = Math.round(price / 2);
      const sellValue = getFieldValue(entry, "SellPrice");
      const bpValue = getFieldValue(entry, "BPPrice");
      const portion = getFieldValue(entry, "PortionName");
      const fields = entry.fields.filter((field) => {
        if (field.key === "PortionNamePlural" && !portion.trim()) return false;
        if (field.key === "SellPrice") {
          if (!manualSellPrice.has(entry.id)) return false;
          if (!sellValue.trim() || Number(sellValue) === 0) return false;
          if (Number(sellValue) === autoSell) return false;
          return true;
        }
        if (field.key === "BPPrice") {
          if (!bpValue.trim()) return false;
          if (Number(bpValue) === 0 || Number(bpValue) === 1) return false;
          return true;
        }
        if (field.key === "Consumable" && !manualConsumable.has(entry.id)) return false;
        if (field.key === "ShowQuantity" && !manualShowQuantity.has(entry.id)) return false;
        if (field.key === "Move" && !isMoveRequired(entry)) return false;
        return true;
      });
      return { ...entry, fields };
    });
    return { entries };
  };

  if (loading) {
    return <div className="panel">Loading items.txt...</div>;
  }

  if (error && data.entries.length === 0) {
    return (
      <div className="panel">
        <h1>Items Editor</h1>
        <p className="error">{error}</p>
      </div>
    );
  }

  return (
    <div className="editor-layout">
      <section className="list-panel">
        <div className="panel-header">
          <h1>Items</h1>
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
          <ItemDetail
            entry={activeEntry}
            onChange={updateEntry}
            onRename={updateEntryId}
            onValidateId={validateEntryId}
            onDuplicate={handleDuplicateEntry}
            onDelete={handleDeleteEntry}
            idError={idError}
            onSetIdError={setIdError}
            fieldErrors={fieldErrors}
            moveOptions={moveOptions}
            manualNamePlural={manualNamePlural}
            setManualNamePlural={setManualNamePlural}
            manualSellPrice={manualSellPrice}
            setManualSellPrice={setManualSellPrice}
            manualConsumable={manualConsumable}
            setManualConsumable={setManualConsumable}
            manualShowQuantity={manualShowQuantity}
            setManualShowQuantity={setManualShowQuantity}
            isMoveRequired={isMoveRequired}
          />
        ) : (
          <div className="panel">Select an item to edit.</div>
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
          Exports never overwrite <strong>PBS/items.txt</strong>. Output goes to <strong>PBS_Output/items.txt</strong>.
        </div>
        <div className="export-actions">
          {status && <span className="status">{status}</span>}
          {error && <span className="error">{error}</span>}
          <button className="primary" onClick={handleExport} disabled={Boolean(idError) || hasInvalidEntries}>
            Export items.txt
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
  idError: string | null;
  onSetIdError: (value: string | null) => void;
  fieldErrors: Record<string, string>;
  moveOptions: string[];
  manualNamePlural: Set<string>;
  setManualNamePlural: Dispatch<SetStateAction<Set<string>>>;
  manualSellPrice: Set<string>;
  setManualSellPrice: Dispatch<SetStateAction<Set<string>>>;
  manualConsumable: Set<string>;
  setManualConsumable: Dispatch<SetStateAction<Set<string>>>;
  manualShowQuantity: Set<string>;
  setManualShowQuantity: Dispatch<SetStateAction<Set<string>>>;
  isMoveRequired: (entry: PBSEntry) => boolean;
};

function ItemDetail({
  entry,
  onChange,
  onRename,
  onValidateId,
  onDuplicate,
  onDelete,
  idError,
  onSetIdError,
  fieldErrors,
  moveOptions,
  manualNamePlural,
  setManualNamePlural,
  manualSellPrice,
  setManualSellPrice,
  manualConsumable,
  setManualConsumable,
  manualShowQuantity,
  setManualShowQuantity,
  isMoveRequired,
}: DetailProps) {
  const [idDraft, setIdDraft] = useState(entry.id);

  useEffect(() => {
    setIdDraft(entry.id);
  }, [entry.id]);

  const updateField = (index: number, key: string, value: string) => {
    const lowerBoolKeys = ["Consumable", "ShowQuantity"];
    const nextValue = lowerBoolKeys.includes(key) ? value.toLowerCase() : value;
    const nextFields = entry.fields.map((field, idx) =>
      idx === index ? { key, value: nextValue } : field
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

  const currentName = getFieldValue("Name");
  const namePlural = getFieldValue("NamePlural");
  const price = Number(getFieldValue("Price") || 0);
  const autoSell = Math.round(price / 2);
  const sellPrice = getFieldValue("SellPrice");
  const portionName = getFieldValue("PortionName");

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
          <label className="label">Item ID</label>
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
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    updateField(index, field.key, nextValue);
                    if (!manualNamePlural.has(entry.id) && namePlural === `${currentName}s`) {
                      setFieldValue("NamePlural", `${nextValue}s`);
                    }
                  }}
                />
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "NamePlural") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input" value="NamePlural" readOnly />
                <input
                  className="input"
                  value={field.value}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    updateField(index, field.key, nextValue);
                    setManualNamePlural((prev) => new Set(prev).add(entry.id));
                  }}
                />
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "PortionName") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input" value="PortionName" readOnly />
                <input
                  className="input"
                  value={field.value}
                  onChange={(event) => updateField(index, field.key, event.target.value)}
                />
              </div>
            );
          }

          if (field.key === "PortionNamePlural") {
            if (!portionName.trim()) return null;
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input" value="PortionNamePlural" readOnly />
                <input
                  className="input"
                  value={field.value}
                  onChange={(event) => updateField(index, field.key, event.target.value)}
                />
              </div>
            );
          }

          if (field.key === "Pocket" || field.key === "Price") {
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

          if (field.key === "SellPrice") {
            const placeholder = `Auto: ${autoSell}`;
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input" value="SellPrice" readOnly />
                <input
                  className="input"
                  value={sellPrice}
                  placeholder={placeholder}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    updateField(index, field.key, nextValue);
                    if (nextValue.trim() === "") {
                      setManualSellPrice((prev) => {
                        const next = new Set(prev);
                        next.delete(entry.id);
                        return next;
                      });
                    } else {
                      setManualSellPrice((prev) => new Set(prev).add(entry.id));
                    }
                  }}
                />
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "BPPrice") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input" value="BPPrice" readOnly />
                <input
                  className="input"
                  value={field.value}
                  onChange={(event) => updateField(index, field.key, event.target.value)}
                />
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "FieldUse") {
            return (
              <SingleSelectField
                key={`${field.key}-${index}`}
                label="FieldUse"
                value={field.value}
                options={FIELD_USE_OPTIONS}
                onChange={(nextValue) => updateField(index, field.key, nextValue)}
                error={fieldErrors[field.key]}
              />
            );
          }

          if (field.key === "BattleUse") {
            return (
              <SingleSelectField
                key={`${field.key}-${index}`}
                label="BattleUse"
                value={field.value}
                options={BATTLE_USE_OPTIONS}
                onChange={(nextValue) => updateField(index, field.key, nextValue)}
                error={fieldErrors[field.key]}
              />
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

          if (field.key === "Consumable" || field.key === "ShowQuantity") {
            const isConsumable = field.key === "Consumable";
            const setManual = isConsumable ? setManualConsumable : setManualShowQuantity;
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input" value={field.key} readOnly />
                <select
                  className="input"
                  value={field.value}
                  onChange={(event) => {
                    const next = event.target.value;
                    updateField(index, field.key, next);
                    if (next === "") {
                      setManual((prev) => {
                        const nextSet = new Set(prev);
                        nextSet.delete(entry.id);
                        return nextSet;
                      });
                    } else {
                      setManual((prev) => new Set(prev).add(entry.id));
                    }
                  }}
                >
                  <option value="">(auto)</option>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "Move") {
            if (!isMoveRequired(entry)) return null;
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input" value="Move" readOnly />
                <input
                  className="input"
                  list="move-options"
                  value={field.value}
                  onChange={(event) => updateField(index, field.key, event.target.value.toUpperCase())}
                />
                <datalist id="move-options">
                  {moveOptions.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "Description") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input" value="Description" readOnly />
                <input
                  className="input"
                  value={field.value}
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
      </div>
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

type SingleSelectFieldProps = ListFieldEditorProps;

function SingleSelectField({ label, value, options, onChange, error }: SingleSelectFieldProps) {
  return (
    <div className="list-field">
      <div className="list-field-label">{label}</div>
      <div className="list-field-items">
        <div className="list-field-row">
          <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>
            <option value="">(none)</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

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

function normalizeOption(value: string, options: readonly string[]) {
  const match = options.find((option) => option.toLowerCase() === value.toLowerCase());
  return match ?? value;
}
