import axios, { AxiosError } from "axios";

/**
 * Same-origin client — /dashboard is served by the CodePush API itself, so
 * the management REST endpoints (/apps, /accessKeys, /account) are siblings.
 * The bearer is the session access key issued by /auth/dashboard and handed
 * back via the URL fragment; it lives in localStorage and memory.
 */
export const api = axios.create({ baseURL: "/" });

const TOKEN_KEY = "cp_dashboard_key";

export const tokenStore = {
  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  set token(v: string | null) {
    if (v) localStorage.setItem(TOKEN_KEY, v);
    else localStorage.removeItem(TOKEN_KEY);
  },
};

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

export function login() {
  window.location.href = "/auth/dashboard";
}

/**
 * Signs out of the dashboard: revokes the session access key server-side so
 * the leaked/discarded token can't be reused, then returns to the landing
 * page. The VenusVerse SSO session itself stays alive — the next sign-in is
 * one click, matching how every other app in the ecosystem behaves.
 */
export async function logout() {
  const t = tokenStore.token;
  tokenStore.token = null;
  if (t) {
    // Plain fetch — must not trip the 401 interceptor into a re-login.
    await fetch(`/accessKeys/${encodeURIComponent(t)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${t}` },
    }).catch(() => {});
  }
  window.location.href = "/dashboard/";
}

/** Reads #key= from the URL fragment once, stores it, and cleans the URL. */
export function captureKeyFromFragment(): void {
  const m = window.location.hash.match(/#key=([^&]+)/);
  if (!m) return;
  tokenStore.token = decodeURIComponent(m[1]);
  history.replaceState(null, "", window.location.pathname + window.location.search);
}

api.interceptors.request.use((cfg) => {
  const t = tokenStore.token;
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      tokenStore.token = null;
      login();
      return new Promise(() => {});
    }
    const msg =
      (err.response?.data as { message?: string } | undefined)?.message ??
      err.message ??
      "Request failed.";
    return Promise.reject(new ApiError(msg, err.response?.status));
  }
);

// ---- REST types (mirror api/script/types/rest-definitions.ts) ----

export interface Account {
  name: string;
  email: string;
}

export interface App {
  name: string;
  deployments?: string[];
  collaborators?: CollaboratorMap;
}

export interface CollaboratorMap {
  [email: string]: { permission: string; isCurrentAccount?: boolean };
}

export interface Deployment {
  name: string;
  key?: string;
  package?: Package;
}

export interface Package {
  label?: string;
  appVersion?: string;
  description?: string;
  isDisabled?: boolean;
  isMandatory?: boolean;
  rollout?: number;
  size?: number;
  uploadTime?: number;
  releaseMethod?: string;
  releasedBy?: string;
  originalLabel?: string;
  originalDeployment?: string;
  packageHash?: string;
}

export interface UpdateMetrics {
  active: number;
  downloaded?: number;
  installed?: number;
  failed?: number;
}

export type DeploymentMetrics = Record<string, UpdateMetrics>;

export interface AccessKey {
  name: string;
  friendlyName?: string;
  createdTime: number;
  expires: number;
  createdBy?: string;
  description?: string;
  isSession?: boolean;
}

// ---- endpoints ----

export const getAccount = () => api.get<{ account: Account }>("/account").then((r) => r.data.account);
export const getApps = () => api.get<{ apps: App[] }>("/apps").then((r) => r.data.apps);
export const createApp = (name: string, manuallyProvisionDeployments = false) =>
  api.post("/apps", { name, manuallyProvisionDeployments }).then((r) => r.data.app as App);
export const renameApp = (name: string, newName: string) => api.patch(`/apps/${name}`, { name: newName });
export const deleteApp = (name: string) => api.delete(`/apps/${name}`);

export const getDeployments = (app: string) =>
  api.get<{ deployments: Deployment[] }>(`/apps/${app}/deployments`).then((r) => r.data.deployments);
export const createDeployment = (app: string, name: string) =>
  api.post<{ deployment: Deployment }>(`/apps/${app}/deployments`, { name }).then((r) => r.data.deployment);
export const deleteDeployment = (app: string, dep: string) => api.delete(`/apps/${app}/deployments/${dep}`);
export const renameDeployment = (app: string, dep: string, name: string) =>
  api.patch(`/apps/${app}/deployments/${dep}`, { name });

export const getHistory = (app: string, dep: string) =>
  api.get<{ history: Package[] }>(`/apps/${app}/deployments/${dep}/history`).then((r) => r.data.history);
export const getMetrics = (app: string, dep: string) =>
  api.get<{ metrics: DeploymentMetrics }>(`/apps/${app}/deployments/${dep}/metrics`).then((r) => r.data.metrics);

export interface PackagePatch {
  label?: string;
  appVersion?: string;
  description?: string;
  isDisabled?: boolean;
  isMandatory?: boolean;
  rollout?: number;
}

export const patchRelease = (app: string, dep: string, packageInfo: PackagePatch) =>
  api.patch(`/apps/${app}/deployments/${dep}/release`, { packageInfo });
export const promoteRelease = (app: string, src: string, dest: string, packageInfo: PackagePatch) =>
  api.post(`/apps/${app}/deployments/${src}/promote/${dest}`, { packageInfo });
export const rollbackRelease = (app: string, dep: string, targetRelease?: string) =>
  api.post(`/apps/${app}/deployments/${dep}/rollback${targetRelease ? `/${targetRelease}` : ""}`);

export const getCollaborators = (app: string) =>
  api.get<{ collaborators: CollaboratorMap }>(`/apps/${app}/collaborators`).then((r) => r.data.collaborators);
export const addCollaborator = (app: string, email: string) => api.post(`/apps/${app}/collaborators/${email}`);
export const removeCollaborator = (app: string, email: string) => api.delete(`/apps/${app}/collaborators/${email}`);

export const getAccessKeys = () =>
  api.get<{ accessKeys: AccessKey[] }>("/accessKeys").then((r) => r.data.accessKeys);
export const createAccessKey = (friendlyName: string, ttl?: number, description?: string) =>
  api.post("/accessKeys", { friendlyName, ttl, description }).then((r) => r.data.accessKey as AccessKey);
export const deleteAccessKey = (name: string) => api.delete(`/accessKeys/${name}`);
