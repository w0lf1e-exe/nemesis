const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4317";
const KEY_STORAGE = "nemesis.apiKey";

export function getApiKey(): string {
  return localStorage.getItem(KEY_STORAGE) ?? "";
}

export function setApiKey(key: string): void {
  localStorage.setItem(KEY_STORAGE, key);
}

export function clearApiKey(): void {
  localStorage.removeItem(KEY_STORAGE);
}

export interface JobMeta {
  id: string;
  tool: string;
  args: string[];
  status: "running" | "done" | "error" | "killed";
  exitCode: number | null;
  startedAt: number;
  endedAt: number | null;
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
  const res = await fetch(`${BASE_URL}${path}`, {
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

export const api = {
  health: () => fetch(`${BASE_URL}/api/health`).then((r) => r.json()),
  systemStatus: () => request<Record<string, unknown>>("/api/system/status"),
  nmap: (target: string, profile: string) =>
    request<{ job: JobMeta }>("/api/recon/nmap", { method: "POST", body: JSON.stringify({ target, profile }) }),
  whois: (target: string) =>
    request<{ job: JobMeta }>("/api/recon/whois", { method: "POST", body: JSON.stringify({ target }) }),
  dig: (target: string, recordType: string) =>
    request<{ job: JobMeta }>("/api/recon/dig", { method: "POST", body: JSON.stringify({ target, recordType }) }),
  subdomains: (target: string) =>
    request<{ target: string; count: number; subdomains: string[] }>("/api/recon/subdomains", {
      method: "POST",
      body: JSON.stringify({ target }),
    }),
  gitOp: (subcommand: string) =>
    request<{ job: JobMeta; repoPath: string }>("/api/dev/git", {
      method: "POST",
      body: JSON.stringify({ subcommand }),
    }),
};

/** Streams a running job's output; EventSource can't send headers so the key rides as a query param. */
export function streamJobOutput(
  jobId: string,
  onChunk: (text: string) => void,
  onEnd: (status: string, exitCode: number | null) => void,
): () => void {
  const url = `${BASE_URL}/api/jobs/${jobId}/stream?token=${encodeURIComponent(getApiKey())}`;
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
