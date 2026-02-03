import { memo, useDeferredValue, useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { ItemsFile, ItemsMultiFile, MovesFile, PBSEntry } from "@pbs/shared";
import { exportItems, getItems, getMoves } from "../api";
import { serializeEntries, useDirty } from "../dirty";
import MoveEntryModal from "../components/MoveEntryModal";
import { useScrollTopButton } from "../hooks/useScrollTopButton";
import { formatKeyLabel, formatKeyLabelIfKnown } from "../utils/labelUtils";
import { useSettings } from "../settings";

const emptyFile: ItemsFile = { entries: [] };
const emptyMoves: MovesFile = { entries: [] };
const emptyFiles: string[] = ["items.txt"];

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
  const [sourceFiles, setSourceFiles] = useState<string[]>(emptyFiles);
  const [activeSource, setActiveSource] = useState<string>("ALL");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [idError, setIdError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [baselineEntries, setBaselineEntries] = useState<PBSEntry[]>([]);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [manualNamePlural, setManualNamePlural] = useState<Set<string>>(new Set());
  const [manualSellPrice, setManualSellPrice] = useState<Set<string>>(new Set());
  const [manualConsumable, setManualConsumable] = useState<Set<string>>(new Set());
  const [manualShowQuantity, setManualShowQuantity] = useState<Set<string>>(new Set());
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);
  const [addSourceDraft, setAddSourceDraft] = useState<string>("");
  const dirty = useDirty();
  const showTop = useScrollTopButton();
  const { openSettings, settings } = useSettings();

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

  const ensureItemDefaults = (entry: PBSEntry, sourceFile: string) => {
    const defaults = buildDefaultItemEntry(entry.id, entry.order, sourceFile);
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
    return { ...entry, fields: merged, sourceFile: entry.sourceFile ?? sourceFile };
  };

  const normalizeItemsMulti = (payload: ItemsMultiFile): ItemsFile => {
    const files = payload.files?.length ? payload.files : ["items.txt"];
    const normalized = payload.entries.map((entry) => {
      const source = entry.sourceFile ?? files[0] ?? "items.txt";
      return ensureItemDefaults(entry, source);
    });
    return { entries: normalized };
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([getItems(), getMoves()])
      .then(([itemsResult, movesResult]) => {
        if (!isMounted) return;
        const normalized = normalizeItemsMulti(itemsResult);
        setData(normalized);
        setBaselineEntries(normalized.entries);
        setMoves({ entries: movesResult.entries });
        const files = itemsResult.files?.length ? itemsResult.files : ["items.txt"];
        setSourceFiles(files);
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
    dirty.setCurrentKey("items");
  }, []);

  const activeEntry = useMemo(() => {
    return data.entries.find((entry) => entry.id === activeId) ?? null;
  }, [data.entries, activeId]);

  const filteredEntries = useMemo(() => {
    const needle = filter.trim().toUpperCase();
    const sourceFiltered =
      activeSource === "ALL"
        ? data.entries
        : data.entries.filter((entry) => (entry.sourceFile ?? "items.txt") === activeSource);
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

  const deferredEntries = useDeferredValue(data.entries);
  const invalidEntries = useMemo(() => {
    return deferredEntries
      .map((entry) => ({ entry, errors: collectEntryErrors(entry) }))
      .filter((item) => item.errors.length > 0);
  }, [deferredEntries, moveOptions]);

  const hasInvalidEntries = useMemo(() => {
    for (const entry of data.entries) {
      if (Object.keys(validateEntryFields(entry)).length > 0) return true;
      const idErrorMessage = validateEntryId(entry, entry.id);
      if (idErrorMessage) return true;
    }
    return false;
  }, [data.entries, moveOptions]);

  const isActiveEntryDirty = useMemo(() => {
    if (!activeEntry) return false;
    const source = activeEntry.sourceFile ?? "items.txt";
    const baseline = baselineEntries.find(
      (entry) => entry.id === activeEntry.id && (entry.sourceFile ?? "items.txt") === source
    );
    if (!baseline) return true;
    return serializeEntries([activeEntry]) !== serializeEntries([baseline]);
  }, [activeEntry, baselineEntries]);

  const handleResetEntry = () => {
    if (!activeEntry) return;
    const source = activeEntry.sourceFile ?? "items.txt";
    const baseline = baselineEntries.find(
      (entry) => entry.id === activeEntry.id && (entry.sourceFile ?? "items.txt") === source
    );
    if (!baseline) {
      setManualNamePlural((prev) => {
        const next = new Set(prev);
        next.delete(activeEntry.id);
        return next;
      });
      setManualSellPrice((prev) => {
        const next = new Set(prev);
        next.delete(activeEntry.id);
        return next;
      });
      setManualConsumable((prev) => {
        const next = new Set(prev);
        next.delete(activeEntry.id);
        return next;
      });
      setManualShowQuantity((prev) => {
        const next = new Set(prev);
        next.delete(activeEntry.id);
        return next;
      });
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
    const name = getFieldValue(cloned, "Name");
    const namePlural = getFieldValue(cloned, "NamePlural");
    setManualNamePlural((prev) => {
      const next = new Set(prev);
      if (namePlural && namePlural !== `${name}s`) {
        next.add(cloned.id);
      } else {
        next.delete(cloned.id);
      }
      return next;
    });
    setManualSellPrice((prev) => {
      const next = new Set(prev);
      if (getFieldValue(cloned, "SellPrice")) {
        next.add(cloned.id);
      } else {
        next.delete(cloned.id);
      }
      return next;
    });
    setManualConsumable((prev) => {
      const next = new Set(prev);
      if (getFieldValue(cloned, "Consumable")) {
        next.add(cloned.id);
      } else {
        next.delete(cloned.id);
      }
      return next;
    });
    setManualShowQuantity((prev) => {
      const next = new Set(prev);
      if (getFieldValue(cloned, "ShowQuantity")) {
        next.add(cloned.id);
      } else {
        next.delete(cloned.id);
      }
      return next;
    });
    setStatus(`Reset ${activeEntry.id}.`);
  };

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
      await exportItems(exportData, settings);
      const nextSnap = serializeEntries(data.entries);
      setSnapshot(nextSnap);
      setBaselineEntries(data.entries);
      dirty.setDirty("items", false);
      const target = settings.exportMode === "PBS" ? "PBS/" : "PBS_Output/";

      setStatus(`Exported item files to ${target}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  };

  const handleAddEntry = (targetFile?: string) => {
    setStatus(null);
    setError(null);
    setIdError(null);
    const availableFiles = sourceFiles.length ? sourceFiles : ["items.txt"];
    const resolvedTarget = targetFile ?? (activeSource === "ALL" ? availableFiles[0] : activeSource);
    const newId = nextAvailableId("NEWITEM");
    const newEntry: PBSEntry = buildDefaultItemEntry(
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
  };

  const requestSourceChange = (nextSource: string) => {
    if (nextSource === activeSource) return;
    setActiveSource(nextSource);
  };

  const openAddSourceModal = () => {
    const files = sourceFiles.length ? sourceFiles : ["items.txt"];
    setAddSourceDraft(files[0] ?? "items.txt");
    setShowAddSourceModal(true);
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
      order: nextOrderForSource(entry.sourceFile ?? "items.txt"),
      sourceFile: entry.sourceFile,
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

  const nextOrderForSource = (sourceFile: string) => {
    const orders = data.entries
      .filter((entry) => (entry.sourceFile ?? "items.txt") === sourceFile)
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

  const buildDefaultItemEntry = (id: string, order: number, sourceFile: string): PBSEntry => ({
    id,
    order,
    sourceFile,
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
          <button
            className="ghost"
            onClick={() => {
              const availableFiles = sourceFiles.length ? sourceFiles : ["items.txt"];
              if (activeSource === "ALL" && availableFiles.length > 1) {
                openAddSourceModal();
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
            onChange={(event) => requestSourceChange(event.target.value)}
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
              className={`list-item ${entry.id === activeId ? "active" : ""}`}
              onClick={() => setActiveId(entry.id)}
            >
              <div className="list-title">{entry.id}</div>
              <div className="list-sub">
                {getFieldValue(entry, "Name") || "(no name)"}{" "}
                {activeSource === "ALL" && entry.sourceFile ? `• ${entry.sourceFile}` : ""}
              </div>
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
            onMoveEntry={() => setShowMoveModal(true)}
            canMoveEntry={activeSource !== "ALL"}
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
        {activeEntry && (
          <MoveEntryModal
            open={showMoveModal}
            total={
              activeEntry
                ? data.entries.filter(
                    (entry) => (entry.sourceFile ?? "items.txt") === (activeEntry.sourceFile ?? "items.txt")
                  ).length
                : data.entries.length
            }
            title={activeEntry.id}
            onClose={() => setShowMoveModal(false)}
            onMove={(targetIndex) => {
              const nextEntries = moveEntryByIdWithinSource(
                data.entries,
                activeEntry.id,
                activeEntry.sourceFile ?? "items.txt",
                targetIndex
              );
              setData({ entries: nextEntries });
            }}
          />
        )}
        {showAddSourceModal && (
          <div className="modal-backdrop">
            <div className="modal">
              <h2>Add Item</h2>
              <p>Select which file this entry should be added to.</p>
              <div className="field-list">
                <div className="field-row single">
                  <label className="label">Target file</label>
                  <select
                    className="input"
                    value={addSourceDraft}
                    onChange={(event) => setAddSourceDraft(event.target.value)}
                  >
                    {(sourceFiles.length ? sourceFiles : ["items.txt"]).map((file) => (
                      <option key={file} value={file}>
                        {file}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="button-row">
                <button
                  className="ghost"
                  onClick={() => {
                    setShowAddSourceModal(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="primary"
                  onClick={() => {
                    handleAddEntry(addSourceDraft || "items.txt");
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
                    <button className="ghost" onClick={() => setActiveId(entry.id)}>
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
        <div className="export-actions">
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
  onMoveEntry: () => void;
  canMoveEntry: boolean;
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
  onMoveEntry,
  canMoveEntry,
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
  const [fieldDrafts, setFieldDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setIdDraft(entry.id);
    setFieldDrafts({});
  }, [entry.id]);

  const updateField = (index: number, key: string, value: string) => {
    const lowerBoolKeys = ["Consumable", "ShowQuantity"];
    const nextValue = lowerBoolKeys.includes(key) ? value.toLowerCase() : value;
    const nextFields = entry.fields.map((field, idx) =>
      idx === index ? { key, value: nextValue } : field
    );
    onChange({ ...entry, fields: nextFields });
  };

  const getDraft = (key: string, fallback: string) => fieldDrafts[key] ?? fallback;
  const setDraft = (key: string, value: string) => {
    setFieldDrafts((prev) => ({ ...prev, [key]: value }));
  };
  const clearDraft = (key: string) => {
    setFieldDrafts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };
  const commitDraft = (index: number, key: string, value: string) => {
    updateField(index, key, value);
    clearDraft(key);
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
      <div className="pokemon-sprite pokemon-sprite-left item-sprite">
        <img
          src={`/assets/graphics/Items/${entry.id}.png`}
          key={entry.id}
          alt=""
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
            img.src = "/assets/graphics/Items/000.png";
          }}
        />
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
                <input className="input key-label" value={formatKeyLabel("Name")} readOnly tabIndex={-1} />
                <input
                  className={`input${getDraft(field.key, field.value) !== field.value ? " draft" : ""}`}
                  value={getDraft(field.key, field.value)}
                  onChange={(event) => setDraft(field.key, event.target.value)}
                  onBlur={() => {
                    const nextValue = getDraft(field.key, field.value);
                    commitDraft(index, field.key, nextValue);
                    if (!manualNamePlural.has(entry.id) && namePlural === `${currentName}s`) {
                      setFieldValue("NamePlural", `${nextValue}s`);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
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
                <input className="input key-label" value={formatKeyLabel("NamePlural")} readOnly tabIndex={-1} />
                <input
                  className={`input${getDraft(field.key, field.value) !== field.value ? " draft" : ""}`}
                  value={getDraft(field.key, field.value)}
                  onChange={(event) => setDraft(field.key, event.target.value)}
                  onBlur={() => {
                    const nextValue = getDraft(field.key, field.value);
                    commitDraft(index, field.key, nextValue);
                    setManualNamePlural((prev) => new Set(prev).add(entry.id));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                  }}
                />
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "PortionName") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input key-label" value={formatKeyLabel("PortionName")} readOnly tabIndex={-1} />
                <input
                  className={`input${getDraft(field.key, field.value) !== field.value ? " draft" : ""}`}
                  value={getDraft(field.key, field.value)}
                  onChange={(event) => setDraft(field.key, event.target.value)}
                  onBlur={() => commitDraft(index, field.key, getDraft(field.key, field.value))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                  }}
                />
              </div>
            );
          }

          if (field.key === "PortionNamePlural") {
            if (!portionName.trim()) return null;
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input key-label" value={formatKeyLabel("PortionNamePlural")} readOnly tabIndex={-1} />
                <input
                  className={`input${getDraft(field.key, field.value) !== field.value ? " draft" : ""}`}
                  value={getDraft(field.key, field.value)}
                  onChange={(event) => setDraft(field.key, event.target.value)}
                  onBlur={() => commitDraft(index, field.key, getDraft(field.key, field.value))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                  }}
                />
              </div>
            );
          }

          if (field.key === "Pocket" || field.key === "Price") {
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input key-label" value={formatKeyLabelIfKnown(field.key)} readOnly tabIndex={-1} />
                <input
                  className={`input${getDraft(field.key, field.value) !== field.value ? " draft" : ""}`}
                  value={getDraft(field.key, field.value)}
                  onChange={(event) => setDraft(field.key, event.target.value)}
                  onBlur={() => commitDraft(index, field.key, getDraft(field.key, field.value))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                  }}
                />
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "SellPrice") {
            const placeholder = `Auto: ${autoSell}`;
            return (
              <div key={`${field.key}-${index}`} className="field-row">
                <input className="input key-label" value={formatKeyLabel("SellPrice")} readOnly tabIndex={-1} />
                <input
                  className={`input${getDraft(field.key, sellPrice) !== sellPrice ? " draft" : ""}`}
                  value={getDraft(field.key, sellPrice)}
                  placeholder={placeholder}
                  onChange={(event) => setDraft(field.key, event.target.value)}
                  onBlur={() => {
                    const nextValue = getDraft(field.key, sellPrice);
                    commitDraft(index, field.key, nextValue);
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
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
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
                <input className="input key-label" value="BP Price" readOnly tabIndex={-1} />
                <input
                  className={`input${getDraft(field.key, field.value) !== field.value ? " draft" : ""}`}
                  value={getDraft(field.key, field.value)}
                  onChange={(event) => setDraft(field.key, event.target.value)}
                  onBlur={() => commitDraft(index, field.key, getDraft(field.key, field.value))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                  }}
                />
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          if (field.key === "FieldUse") {
            return (
              <SingleSelectField
                key={`${field.key}-${index}`}
                label="Field Use"
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
                label="Battle Use"
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
                <input className="input key-label" value={formatKeyLabelIfKnown(field.key)} readOnly tabIndex={-1} />
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
                <input className="input key-label" value={formatKeyLabel("Move")} readOnly tabIndex={-1} />
                <input
                  className={`input${getDraft(field.key, field.value) !== field.value ? " draft" : ""}`}
                  list="move-options"
                  value={getDraft(field.key, field.value)}
                  onChange={(event) => setDraft(field.key, event.target.value)}
                  onBlur={() =>
                    commitDraft(index, field.key, getDraft(field.key, field.value).toUpperCase())
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                  }}
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
                <input className="input key-label" value={formatKeyLabel("Description")} readOnly tabIndex={-1} />
                <input
                  className={`input${getDraft(field.key, field.value) !== field.value ? " draft" : ""}`}
                  value={getDraft(field.key, field.value)}
                  onChange={(event) => setDraft(field.key, event.target.value)}
                  onBlur={() => commitDraft(index, field.key, getDraft(field.key, field.value))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                  }}
                />
                {fieldErrors[field.key] && <span className="field-error">{fieldErrors[field.key]}</span>}
              </div>
            );
          }

          return (
            <div key={`${field.key}-${index}`} className="field-row">
              <input className="input key-label" value={formatKeyLabelIfKnown(field.key)} readOnly tabIndex={-1} />
              <input
                className={`input${getDraft(field.key, field.value) !== field.value ? " draft" : ""}`}
                value={getDraft(field.key, field.value)}
                onChange={(event) => setDraft(field.key, event.target.value)}
                onBlur={() => commitDraft(index, field.key, getDraft(field.key, field.value))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
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
              className={`input${(drafts[index] ?? item) !== item ? " draft" : ""}`}
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
            className={`input${draft !== "" ? " draft" : ""}`}
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

function normalizeOption(value: string, options: readonly string[]) {
  const match = options.find((option) => option.toLowerCase() === value.toLowerCase());
  return match ?? value;
}

function moveEntryByIdWithinSource(entries: PBSEntry[], id: string, sourceFile: string, targetIndex: number) {
  const scoped = entries.filter((entry) => (entry.sourceFile ?? "items.txt") === sourceFile);
  const fromIndex = scoped.findIndex((entry) => entry.id === id);
  if (fromIndex === -1) return entries;
  const scopedNext = [...scoped];
  const [moved] = scopedNext.splice(fromIndex, 1);
  const clamped = Math.max(0, Math.min(scopedNext.length, targetIndex));
  scopedNext.splice(clamped, 0, moved);
  const reordered = scopedNext.map((entry, index) => ({ ...entry, order: index }));
  let nextIndex = 0;
  return entries.map((entry) => {
    if ((entry.sourceFile ?? "items.txt") !== sourceFile) return entry;
    const nextEntry = reordered[nextIndex];
    nextIndex += 1;
    return nextEntry ?? entry;
  });
}
