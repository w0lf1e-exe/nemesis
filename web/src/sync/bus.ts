// One-way telemetry mirror for the external display window/monitor.
// BroadcastChannel is same-origin/same-browser only — nothing here is
// reachable over the network, so the external display can safely be a
// receive-only surface with no auth of its own.

export interface JobSyncState {
  label: string;
  output: string;
  status?: string;
  target?: string;
}

export interface SystemSyncState {
  hostname: string;
  platform: string;
  cpuCount: number;
  hostUptimeSeconds: number;
  memory: { totalBytes: number; freeBytes: number };
}

export interface VoiceSyncState {
  transcript: string;
  speaking: boolean;
  listening: boolean;
}

export interface SyncSnapshot {
  recon: JobSyncState;
  dev: JobSyncState;
  system: SystemSyncState;
  voice: VoiceSyncState;
  online: boolean;
}

export type SyncKey = keyof SyncSnapshot;

const CHANNEL_NAME = "nemesis-sync";
const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL_NAME) : null;

export function broadcastPartial<K extends SyncKey>(key: K, value: SyncSnapshot[K]): void {
  channel?.postMessage({ key, value });
}

export function subscribeSync<K extends SyncKey>(cb: (key: K, value: SyncSnapshot[K]) => void): () => void {
  if (!channel) return () => {};
  const listener = (e: MessageEvent) => cb(e.data.key, e.data.value);
  channel.addEventListener("message", listener);
  return () => channel.removeEventListener("message", listener);
}
