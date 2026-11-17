import { FormEvent, useEffect, useState } from "react";
import { createAccessKey, deleteAccessKey, getAccessKeys, type AccessKey } from "../lib/api";
import { ConfirmModal, Empty, fmtDate, Modal, Spinner } from "../components/ui";

export default function KeysPage() {
  const [keys, setKeys] = useState<AccessKey[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<AccessKey | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<AccessKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [friendlyName, setFriendlyName] = useState("");
  const [days, setDays] = useState("60");

  const load = () => getAccessKeys().then(setKeys).catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const key = await createAccessKey(friendlyName.trim(), parseInt(days, 10) * 86400000);
      setCreated(key);
      setCreating(false);
      setFriendlyName("");
      void load();
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
      // GET /accessKeys masks `name`; friendlyName is the usable identifier.
      await deleteAccessKey(deleting.friendlyName ?? deleting.name);
      setDeleting(null);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  const named = keys?.filter((k) => !k.isSession) ?? [];
  const sessions = keys?.filter((k) => k.isSession) ?? [];

  const row = (k: AccessKey) => (
    <tr key={k.friendlyName ?? k.name}>
      <td>
        {k.friendlyName ?? "(unnamed)"}
        {k.isSession && <span className="badge accent">session</span>}
      </td>
      <td className="muted">{fmtDate(k.createdTime)}</td>
      <td className="muted">{fmtDate(k.expires)}</td>
      <td className="muted">{k.createdBy ?? "—"}</td>
      <td>
        <button className="btn sm danger" onClick={() => setDeleting(k)}>
          Delete
        </button>
      </td>
    </tr>
  );

  return (
    <>
      <div className="row between mb">
        <div>
          <h1>Access keys</h1>
          <div className="sub">Long-lived tokens for CI and CLI — handle them like passwords.</div>
        </div>
        <button className="btn primary" onClick={() => setCreating(true)}>
          + New key
        </button>
      </div>

      {error && <div className="alert">{error}</div>}
      {created && (
        <div className="alert ok">
          Key <b>{created.friendlyName}</b> created — copy it now, it is not shown in full again:
          <div className="mono mt">{created.name}</div>
        </div>
      )}

      {!keys ? (
        <Spinner />
      ) : keys.length === 0 ? (
        <div className="panel">
          <Empty>No access keys.</Empty>
        </div>
      ) : (
        <>
          <div className="panel mb">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Created</th>
                  <th>Expires</th>
                  <th>By</th>
                  <th style={{ width: 90 }} />
                </tr>
              </thead>
              <tbody>
                {named.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted">
                      No named keys — sessions only.
                    </td>
                  </tr>
                ) : (
                  named.map(row)
                )}
              </tbody>
            </table>
          </div>

          <h2 style={{ fontSize: 15, margin: "24px 0 8px" }}>Login sessions</h2>
          <div className="muted mb" style={{ fontSize: 12.5 }}>
            Keys minted by CLI and dashboard sign-ins — deleting one signs that session out.
          </div>
          <div className="panel">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Created</th>
                  <th>Expires</th>
                  <th>By</th>
                  <th style={{ width: 90 }} />
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted">
                      No sessions.
                    </td>
                  </tr>
                ) : (
                  sessions.map(row)
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {creating && (
        <Modal title="New access key" onClose={() => setCreating(false)}>
          <form onSubmit={onCreate}>
            <div className="field">
              <label>Friendly name</label>
              <input required autoFocus value={friendlyName} onChange={(e) => setFriendlyName(e.target.value)} placeholder="ci-release" />
            </div>
            <div className="field">
              <label>Expires in (days)</label>
              <input type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)} />
            </div>
            <div className="actions">
              <button type="button" className="btn" onClick={() => setCreating(false)}>
                Cancel
              </button>
              <button type="submit" className="btn primary" disabled={busy}>
                {busy ? "Creating…" : "Create key"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmModal
          title="Delete access key"
          body={
            <>
              Delete <b>{deleting.friendlyName ?? deleting.name}</b>? Anything authenticating with it loses access
              immediately.
            </>
          }
          confirmLabel="Delete key"
          danger
          busy={busy}
          onConfirm={onDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}
