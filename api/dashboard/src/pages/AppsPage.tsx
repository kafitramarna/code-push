import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createApp, deleteApp, getApps, type App } from "../lib/api";
import { ConfirmModal, Empty, Modal, Spinner } from "../components/ui";

export default function AppsPage() {
  const nav = useNavigate();
  const [apps, setApps] = useState<App[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<App | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");

  const load = () => getApps().then(setApps).catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const app = await createApp(name.trim());
      setCreating(false);
      nav(`/apps/${encodeURIComponent(app.name)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteApp(deleting.name);
      setDeleting(null);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="row between mb">
        <div>
          <h1>Apps</h1>
          <div className="sub">Every app you own or collaborate on.</div>
        </div>
        <button className="btn primary" onClick={() => setCreating(true)}>
          + New app
        </button>
      </div>

      {error && <div className="alert">{error}</div>}

      {!apps ? (
        <Spinner />
      ) : apps.length === 0 ? (
        <div className="panel">
          <Empty>No apps yet — create your first one.</Empty>
        </div>
      ) : (
        <div className="panel">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Deployments</th>
                <th style={{ width: 90 }} />
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a.name} className="clickable" onClick={() => nav(`/apps/${encodeURIComponent(a.name)}`)}>
                  <td>{a.name}</td>
                  <td>
                    {(a.deployments ?? []).length === 0 ? (
                      <span className="muted">—</span>
                    ) : (
                      a.deployments!.map((d) => (
                        <span key={d} className="badge">
                          {d}
                        </span>
                      ))
                    )}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button className="btn sm danger" onClick={() => setDeleting(a)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <Modal title="New app" onClose={() => setCreating(false)}>
          <form onSubmit={onCreate}>
            <div className="field">
              <label>Name</label>
              <input required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="my-mobile-app" />
              <span className="hint">Staging and Production deployments are provisioned automatically.</span>
            </div>
            <div className="actions">
              <button type="button" className="btn" onClick={() => setCreating(false)}>
                Cancel
              </button>
              <button type="submit" className="btn primary" disabled={busy}>
                {busy ? "Creating…" : "Create app"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmModal
          title="Delete app"
          body={
            <>
              Delete <b>{deleting.name}</b>? All deployments and release history are removed. Devices on the deleted
              deployment keys stop receiving updates.
            </>
          }
          confirmLabel="Delete app"
          danger
          busy={busy}
          onConfirm={onDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}
