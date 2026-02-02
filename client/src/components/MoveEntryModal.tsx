import { useEffect, useRef, useState } from "react";

type MoveEntryModalProps = {
  open: boolean;
  total: number;
  title: string;
  onClose: () => void;
  onMove: (targetIndex: number) => void;
};

export default function MoveEntryModal({ open, total, title, onClose, onMove }: MoveEntryModalProps) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setDraft("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  if (!open) return null;

  const handleMove = () => {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) return;
    if (parsed < 0 || parsed > total) {
      onMove(total);
    } else if (parsed <= 1) {
      onMove(0);
    } else {
      onMove(parsed - 1);
    }
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Move Entry</h2>
        <p>{title}</p>
        <div className="muted">Total entries: {total}</div>
        <div className="muted">Insert position number:</div>
        <div className="muted">• 0 or 1: move to top.</div>
        <div className="muted">• -1 or {total} or higher: move to bottom.</div>
        <div className="muted">(Note: IDs with multiple versions move as a group)</div>
        <div className="field-list">
          <div className="field-row single">
            <label className="label">Position</label>
            <input
              className="input"
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleMove();
                }
              }}
            />
          </div>
        </div>
        <div className="button-row">
          <button className="ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" onClick={handleMove}>
            Move
          </button>
        </div>
      </div>
    </div>
  );
}
