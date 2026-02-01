import { NavLink, Outlet, useBlocker } from "react-router-dom";
import { useEffect, useState } from "react";
import { ProjectStatus } from "@pbs/shared";
import { getProjectStatus } from "./api";
import { useDirty } from "./dirty";

export default function App() {
  const dirty = useDirty();
  const [status, setStatus] = useState<ProjectStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const blocker = useBlocker(dirty.anyDirty);

  useEffect(() => {
    getProjectStatus()
      .then(setStatus)
      .catch((err: Error) => setStatusError(err.message));
  }, []);

  useEffect(() => {
    if (blocker.state === "blocked") {
      setShowPrompt(true);
    }
  }, [blocker.state]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty.anyDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty.anyDirty]);

  const missing = new Set(status?.missingFiles ?? []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-title">PBS Editor</div>
          <div className="brand-sub">Local Essentials Project</div>
        </div>
        <nav className="nav">
          <NavLink to="/types" className="nav-link">
            Types
            {missing.has("types.txt") && <span className="badge">Missing</span>}
          </NavLink>
          <NavLink to="/abilities" className="nav-link">
            Abilities
            {missing.has("abilities.txt") && <span className="badge">Missing</span>}
          </NavLink>
          <NavLink to="/berry-plants" className="nav-link">
            Berry Plants
            {missing.has("berry_plants.txt") && <span className="badge">Missing</span>}
          </NavLink>
          <NavLink to="/ribbons" className="nav-link">
            Ribbons
            {missing.has("ribbons.txt") && <span className="badge">Missing</span>}
          </NavLink>
          <NavLink to="/moves" className="nav-link">
            Moves
            {missing.has("moves.txt") && <span className="badge">Missing</span>}
          </NavLink>
          <NavLink to="/items" className="nav-link">
            Items
            {missing.has("items.txt") && <span className="badge">Missing</span>}
          </NavLink>
          <NavLink to="/trainer-types" className="nav-link">
            Trainer Types
            {missing.has("trainer_types.txt") && <span className="badge">Missing</span>}
          </NavLink>
          <NavLink to="/pokemon" className="nav-link">
            Pokemon
            {missing.has("pokemon.txt") && <span className="badge">Missing</span>}
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          {statusError ? (
            <span className="error">Status unavailable</span>
          ) : (
            <>
              Output is written to <strong>PBS_Output</strong>
            </>
          )}
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
      {showPrompt && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Unsaved Changes</h2>
            <p>You have unexported changes in the current editor. Leave anyway?</p>
            <div className="button-row">
              <button
                className="ghost"
                onClick={() => {
                  blocker.reset?.();
                  setShowPrompt(false);
                }}
              >
                Stay
              </button>
              <button
                className="danger"
                onClick={() => {
                  if (dirty.currentKey) dirty.setDirty(dirty.currentKey, false);
                  blocker.proceed?.();
                  setShowPrompt(false);
                }}
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
