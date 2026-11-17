import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  addCollaborator,
  createDeployment,
  deleteApp,
  deleteDeployment,
  getCollaborators,
  getDeployments,
  getHistory,
  getMetrics,
  patchRelease,
  promoteRelease,
  removeCollaborator,
  renameApp,
  renameDeployment,
  rollbackRelease,
  type CollaboratorMap,
  type Deployment,
  type DeploymentMetrics,
  type Package,
  type PackagePatch,
} from "../lib/api";
import { ConfirmModal, Empty, fmtDate, fmtSize, Modal, Spinner } from "../components/ui";

export default function AppPage() {
  const { name = "" } = useParams();
  const nav = useNavigate();
  const [deployments, setDeployments] = useState<Deployment[] | null>(null);
  const [collaborators, setCollaborators] = useState<CollaboratorMap | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState("");

  const load = () => {
    getDeployments(name)
      .then((d) => {
        setDeployments(d);
        setActive((cur) => cur ?? d[0]?.name ?? null);
      })
      .catch((e) => setError(e.message));
    getCollaborators(name).then(setCollaborators).catch(() => {});
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  async function onRename(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await renameApp(name, newName.trim());
      nav(`/apps/${encodeURIComponent(newName.trim())}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rename failed");
      setBusy(false);
    }
  }

  async function onDeleteApp() {
    setBusy(true);
    try {
      await deleteApp(name);
      nav("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setBusy(false);
    }
  }

  const deployment = deployments?.find((d) => d.name === active) ?? null;

  return (
    <>
      <div className="muted mb">
        <Link to="/">Apps</Link> / {name}
      </div>
      <div className="row between mb">
        <h1>{name}</h1>
        <div className="row">
          <button className="btn sm" onClick={() => { setNewName(name); setRenaming(true); }}>
            Rename
          </button>
          <button className="btn sm danger" onClick={() => setConfirmDelete(true)}>
            Delete app
          </button>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      {!deployments ? (
        <Spinner />
      ) : (
        <div className="grid2">
          <div>
            <div className="row between mb">
              <div className="tabs" style={{ border: 0, margin: 0 }}>
                {deployments.map((d) => (
                  <button
                    key={d.name}
                    className={`tab ${d.name === active ? "active" : ""}`}
                    onClick={() => setActive(d.name)}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
              <NewDeployment app={name} onDone={load} onError={setError} />
            </div>
            <div style={{ borderBottom: "1px solid var(--border)", marginTop: -20, marginBottom: 20 }} />

            {deployment ? (
              <DeploymentPanel
                app={name}
                dep={deployment}
                all={deployments}
                onChanged={load}
                onError={setError}
              />
            ) : (
              <div className="panel">
                <Empty>No deployments — create one to start releasing.</Empty>
              </div>
            )}
          </div>

          <div className="panel pad">
            <h2>Collaborators</h2>
            {!collaborators ? (
              <Spinner />
            ) : (
              <>
                {Object.entries(collaborators).map(([email, c]) => (
                  <div key={email} className="row between" style={{ padding: "6px 0" }}>
                    <div>
                      <div>{email}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {c.permission}
                        {c.isCurrentAccount ? " · you" : ""}
                      </div>
                    </div>
                    {!c.isCurrentAccount && (
                      <button
                        className="btn sm danger"
                        onClick={() =>
                          removeCollaborator(name, email)
                            .then(load)
                            .catch((e) => setError(e.message))
                        }
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <AddCollaborator app={name} onDone={load} onError={setError} />
              </>
            )}
          </div>
        </div>
      )}

      {renaming && (
        <Modal title="Rename app" onClose={() => setRenaming(false)}>
          <form onSubmit={onRename}>
            <div className="field">
              <label>New name</label>
              <input required value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="actions">
              <button type="button" className="btn" onClick={() => setRenaming(false)}>
                Cancel
              </button>
              <button className="btn primary" disabled={busy}>
                {busy ? "Renaming…" : "Rename"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete app"
          body={
            <>
              Delete <b>{name}</b>? All deployments and release history are removed.
            </>
          }
          confirmLabel="Delete app"
          danger
          busy={busy}
          onConfirm={onDeleteApp}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}

function NewDeployment({ app, onDone, onError }: { app: string; onDone: () => void; onError: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [depName, setDepName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createDeployment(app, depName.trim());
      setOpen(false);
      setDepName("");
      onDone();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="btn sm primary" onClick={() => setOpen(true)}>
        + Deployment
      </button>
      {open && (
        <Modal title="New deployment" onClose={() => setOpen(false)}>
          <form onSubmit={submit}>
            <div className="field">
              <label>Name</label>
              <input required autoFocus value={depName} onChange={(e) => setDepName(e.target.value)} placeholder="Staging" />
            </div>
            <div className="actions">
              <button type="button" className="btn" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="btn primary" disabled={busy}>
                {busy ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function AddCollaborator({ app, onDone, onError }: { app: string; onDone: () => void; onError: (m: string) => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await addCollaborator(app, email.trim());
      setEmail("");
      onDone();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Add failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="row mt">
      <input
        style={{ flex: 1, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 7, padding: "7px 10px", color: "var(--text)" }}
        type="email"
        required
        placeholder="teammate@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button className="btn sm" disabled={busy}>
        Add
      </button>
    </form>
  );
}

function DeploymentPanel({
  app,
  dep,
  all,
  onChanged,
  onError,
}: {
  app: string;
  dep: Deployment;
  all: Deployment[];
  onChanged: () => void;
  onError: (m: string) => void;
}) {
  const [history, setHistory] = useState<Package[] | null>(null);
  const [metrics, setMetrics] = useState<DeploymentMetrics>({});
  const [keyVisible, setKeyVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const [patching, setPatching] = useState<Package | null>(null);
  const [promoting, setPromoting] = useState<Package | null>(null);
  const [rollingBack, setRollingBack] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState("");

  const load = () => {
    getHistory(app, dep.name).then(setHistory).catch((e) => onError(e.message));
    getMetrics(app, dep.name).then(setMetrics).catch(() => setMetrics({}));
  };

  useEffect(() => {
    setHistory(null);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app, dep.name]);

  async function onDelete() {
    setBusy(true);
    try {
      await deleteDeployment(app, dep.name);
      setConfirmDelete(false);
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Delete failed");
      setBusy(false);
    }
  }

  async function onRename(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await renameDeployment(app, dep.name, newName.trim());
      setRenaming(false);
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Rename failed");
      setBusy(false);
    }
  }

  async function onRollback(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await rollbackRelease(app, dep.name, rollbackTarget || undefined);
      setRollingBack(false);
      void load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Rollback failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="panel pad mb">
        <div className="row between">
          <div>
            <div className="muted" style={{ fontSize: 12 }}>Deployment key</div>
            <div className="mono">{keyVisible ? dep.key : "•".repeat(36)}</div>
          </div>
          <div className="row">
            <button className="btn sm" onClick={() => setKeyVisible((v) => !v)}>
              {keyVisible ? "Hide" : "Show"}
            </button>
            {keyVisible && dep.key && (
              <button className="btn sm" onClick={() => navigator.clipboard.writeText(dep.key!)}>
                Copy
              </button>
            )}
            <button className="btn sm" onClick={() => { setNewName(dep.name); setRenaming(true); }}>
              Rename
            </button>
            <button className="btn sm danger" onClick={() => setConfirmDelete(true)}>
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="row between mb">
        <h2 style={{ margin: 0, fontSize: 15 }}>Releases</h2>
        <button className="btn sm warn" style={{ color: "var(--warn)" }} onClick={() => { setRollbackTarget(""); setRollingBack(true); }}>
          Rollback
        </button>
      </div>

      {!history ? (
        <Spinner />
      ) : history.length === 0 ? (
        <div className="panel">
          <Empty>No releases yet — publish one with the CLI or CodePush action.</Empty>
        </div>
      ) : (
        <div className="panel">
          <table>
            <thead>
              <tr>
                <th>Label</th>
                <th>App version</th>
                <th>Rollout</th>
                <th>Metrics</th>
                <th>Uploaded</th>
                <th style={{ width: 150 }} />
              </tr>
            </thead>
            <tbody>
              {history.map((p) => (
                <ReleaseRow
                  key={p.label}
                  pkg={p}
                  metric={p.label ? metrics[p.label] : undefined}
                  onPatch={() => setPatching(p)}
                  onPromote={() => setPromoting(p)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {patching && (
        <PatchModal app={app} dep={dep.name} pkg={patching} onClose={() => setPatching(null)} onDone={() => { setPatching(null); void load(); }} onError={onError} />
      )}
      {promoting && (
        <PromoteModal app={app} dep={dep.name} pkg={promoting} all={all} onClose={() => setPromoting(null)} onDone={() => { setPromoting(null); void load(); }} onError={onError} />
      )}
      {rollingBack && (
        <Modal title={`Rollback ${dep.name}`} onClose={() => setRollingBack(false)}>
          <form onSubmit={onRollback}>
            <div className="field">
              <label>Target release (optional)</label>
              <select value={rollbackTarget} onChange={(e) => setRollbackTarget(e.target.value)}>
                <option value="">Previous release</option>
                {(history ?? []).map((p) => (
                  <option key={p.label} value={p.label}>
                    {p.label} — {p.appVersion}
                  </option>
                ))}
              </select>
              <span className="hint">Rolls the deployment back to this (or the previous) release.</span>
            </div>
            <div className="actions">
              <button type="button" className="btn" onClick={() => setRollingBack(false)}>
                Cancel
              </button>
              <button className="btn danger" disabled={busy}>
                {busy ? "Rolling back…" : "Rollback"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {renaming && (
        <Modal title="Rename deployment" onClose={() => setRenaming(false)}>
          <form onSubmit={onRename}>
            <div className="field">
              <label>New name</label>
              <input required value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="actions">
              <button type="button" className="btn" onClick={() => setRenaming(false)}>
                Cancel
              </button>
              <button className="btn primary" disabled={busy}>
                {busy ? "Renaming…" : "Rename"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete deployment"
          body={
            <>
              Delete deployment <b>{dep.name}</b>? Its history is removed and devices on its key stop receiving
              updates.
            </>
          }
          confirmLabel="Delete deployment"
          danger
          busy={busy}
          onConfirm={onDelete}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}

function ReleaseRow({
  pkg,
  metric,
  onPatch,
  onPromote,
}: {
  pkg: Package;
  metric?: { active: number; downloaded?: number; installed?: number; failed?: number };
  onPatch: () => void;
  onPromote: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="clickable" onClick={() => setOpen((o) => !o)}>
        <td>
          <span className="mono">{pkg.label ?? "—"}</span>{" "}
          {pkg.isDisabled && <span className="badge bad">disabled</span>}
          {pkg.isMandatory && <span className="badge warn">mandatory</span>}
          {pkg.releaseMethod && pkg.releaseMethod !== "Upload" && (
            <span className="badge accent">{pkg.releaseMethod.toLowerCase()}</span>
          )}
        </td>
        <td>{pkg.appVersion ?? "—"}</td>
        <td>{pkg.rollout ?? 100}%</td>
        <td className="muted">
          {metric ? `${metric.active} active · ${metric.installed ?? 0} installed · ${metric.failed ?? 0} failed` : "—"}
        </td>
        <td className="muted">{fmtDate(pkg.uploadTime)}</td>
        <td onClick={(e) => e.stopPropagation()}>
          <button className="btn sm" onClick={onPatch}>
            Edit
          </button>{" "}
          <button className="btn sm" onClick={onPromote}>
            Promote
          </button>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} style={{ background: "var(--panel-2)", fontSize: 13 }}>
            <div className="grid2" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div>
                <div className="muted">Description</div>
                <div>{pkg.description || "—"}</div>
              </div>
              <div>
                <div className="muted">Released by</div>
                <div>{pkg.releasedBy ?? "—"}</div>
                <div className="muted mt">Size</div>
                <div>{fmtSize(pkg.size)}</div>
              </div>
            </div>
            {pkg.packageHash && <div className="mono muted mt">hash {pkg.packageHash}</div>}
          </td>
        </tr>
      )}
    </>
  );
}

function PatchModal({
  app,
  dep,
  pkg,
  onClose,
  onDone,
  onError,
}: {
  app: string;
  dep: string;
  pkg: Package;
  onClose: () => void;
  onDone: () => void;
  onError: (m: string) => void;
}) {
  const [rollout, setRollout] = useState(String(pkg.rollout ?? 100));
  const [description, setDescription] = useState(pkg.description ?? "");
  const [isDisabled, setIsDisabled] = useState(!!pkg.isDisabled);
  const [isMandatory, setIsMandatory] = useState(!!pkg.isMandatory);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const info: PackagePatch = {
        label: pkg.label,
        rollout: parseInt(rollout, 10),
        description: description || undefined,
        isDisabled,
        isMandatory,
      };
      await patchRelease(app, dep, info);
      onDone();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Update failed");
      setBusy(false);
    }
  }

  return (
    <Modal title={`Edit release ${pkg.label ?? ""}`} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field">
          <label>Rollout %</label>
          <input type="number" min="1" max="100" required value={rollout} onChange={(e) => setRollout(e.target.value)} />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="field">
          <label className="row" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input type="checkbox" style={{ width: "auto" }} checked={isMandatory} onChange={(e) => setIsMandatory(e.target.checked)} />
            Mandatory update
          </label>
          <label className="row" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input type="checkbox" style={{ width: "auto" }} checked={isDisabled} onChange={(e) => setIsDisabled(e.target.checked)} />
            Disabled (stops distribution)
          </label>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PromoteModal({
  app,
  dep,
  pkg,
  all,
  onClose,
  onDone,
  onError,
}: {
  app: string;
  dep: string;
  pkg: Package;
  all: Deployment[];
  onClose: () => void;
  onDone: () => void;
  onError: (m: string) => void;
}) {
  const others = useMemo(() => all.filter((d) => d.name !== dep), [all, dep]);
  const [dest, setDest] = useState(others[0]?.name ?? "");
  const [rollout, setRollout] = useState("100");
  const [description, setDescription] = useState(pkg.description ?? "");
  const [isMandatory, setIsMandatory] = useState(!!pkg.isMandatory);
  const [isDisabled, setIsDisabled] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const info: PackagePatch = {
        rollout: parseInt(rollout, 10),
        description: description || undefined,
        isMandatory,
        isDisabled,
      };
      await promoteRelease(app, dep, dest, info);
      onDone();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Promote failed");
      setBusy(false);
    }
  }

  return (
    <Modal title={`Promote ${pkg.label ?? "release"} from ${dep}`} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="field">
          <label>To deployment</label>
          <select required value={dest} onChange={(e) => setDest(e.target.value)}>
            {others.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Rollout %</label>
          <input type="number" min="1" max="100" required value={rollout} onChange={(e) => setRollout(e.target.value)} />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="field">
          <label className="row" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input type="checkbox" style={{ width: "auto" }} checked={isMandatory} onChange={(e) => setIsMandatory(e.target.checked)} />
            Mandatory update
          </label>
          <label className="row" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input type="checkbox" style={{ width: "auto" }} checked={isDisabled} onChange={(e) => setIsDisabled(e.target.checked)} />
            Disabled on arrival
          </label>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={busy || !dest}>
            {busy ? "Promoting…" : "Promote"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
