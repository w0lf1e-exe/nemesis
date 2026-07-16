// Drop-in client for the NEMESIS backend (server/). Talks to the Express API
// over fetch + Server-Sent Events. No dependencies beyond the browser APIs.
//
// Copy this file into your Lovable project as e.g. src/lib/nemesisApi.ts.

const BASE_URL_KEY = "nemesis.baseUrl";
const API_KEY_KEY = "nemesis.apiKey";

export function getBaseUrl(): string {
  return localStorage.getItem(BASE_URL_KEY) ?? "http://localhost:4317";
}
export function setBaseUrl(url: string): void {
  localStorage.setItem(BASE_URL_KEY, url.replace(/\/+$/, ""));
}

export function getApiKey(): string {
  return localStorage.getItem(API_KEY_KEY) ?? "";
}
export function setApiKey(key: string): void {
  localStorage.setItem(API_KEY_KEY, key);
}

export type Executor = "local" | "kali";

export interface JobMeta {
  id: string;
  tool: string;
  args: string[];
  executor: Executor;
  status: "running" | "done" | "error" | "killed";
  exitCode: number | null;
  startedAt: number;
  endedAt: number | null;
}

export interface EngagementScope {
  description: string;
  confirmedAt: number;
  expiresAt: number;
}

export interface KaliStatus {
  enabled: boolean;
  host: string | null;
  port: number;
  user: string;
  workDir: string;
}

export interface KaliToolInfo {
  id: string;
  label: string;
  tier: "recon" | "web" | "vuln" | "high-risk";
  binary: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
      ...init.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? body.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const nemesisApi = {
  health: () => fetch(`${getBaseUrl()}/api/health`).then((r) => r.json()),
  systemStatus: () => request<Record<string, unknown>>("/api/system/status"),

  kaliStatus: () => request<KaliStatus>("/api/kali/status"),
  kaliCheck: () => request<{ job: JobMeta }>("/api/kali/check", { method: "POST" }),
  kaliTools: () => request<{ enabled: boolean; wordlists: string[]; tools: KaliToolInfo[] }>("/api/kali-tools"),
  runKaliTool: (id: string, body: Record<string, string>) =>
    request<{ job: JobMeta }>(`/api/kali-tools/${id}/run`, { method: "POST", body: JSON.stringify(body) }),

  nmap: (target: string, profile: string, executor: Executor = "kali") =>
    request<{ job: JobMeta }>("/api/recon/nmap", {
      method: "POST",
      body: JSON.stringify({ target, profile, executor }),
    }),
  whois: (target: string, executor: Executor = "kali") =>
    request<{ job: JobMeta }>("/api/recon/whois", { method: "POST", body: JSON.stringify({ target, executor }) }),
  dig: (target: string, recordType: string, executor: Executor = "kali") =>
    request<{ job: JobMeta }>("/api/recon/dig", {
      method: "POST",
      body: JSON.stringify({ target, recordType, executor }),
    }),

  getScope: () => request<{ scope: EngagementScope | null }>("/api/scope"),
  confirmScope: (description: string, confirmText: string) =>
    request<{ scope: EngagementScope }>("/api/scope/confirm", {
      method: "POST",
      body: JSON.stringify({ description, confirmText }),
    }),
  clearScope: () => request<{ ok: true }>("/api/scope/clear", { method: "POST" }),
};

/** Streams a running job's output. EventSource can't send headers, so the key rides as a query param. */
export function streamNemesisJob(
  jobId: string,
  onChunk: (text: string) => void,
  onEnd: (status: string, exitCode: number | null) => void,
): () => void {
  const url = `${getBaseUrl()}/api/jobs/${jobId}/stream?token=${encodeURIComponent(getApiKey())}`;
  const source = new EventSource(url);
  source.addEventListener("data", (e: MessageEvent) => onChunk(JSON.parse(e.data)));
  source.addEventListener("end", (e: MessageEvent) => {
    const payload = JSON.parse(e.data);
    onEnd(payload.status, payload.exitCode);
    source.close();
  });
  source.onerror = () => {
    source.close();
  };
  return () => source.close();
}
