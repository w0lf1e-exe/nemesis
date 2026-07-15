import { config } from "../config.js";

export class ScopeRequiredError extends Error {}

export interface EngagementScope {
  description: string;
  confirmedAt: number;
  expiresAt: number;
}

// Deliberately in-memory and per-process, not persisted: a restart of the
// server re-locks the higher-risk tools, and the scope can't be widened
// remotely without going through the confirm flow each time.
let active: EngagementScope | null = null;

export function confirmScope(description: string): EngagementScope {
  active = {
    description,
    confirmedAt: Date.now(),
    expiresAt: Date.now() + config.scopeDurationMs,
  };
  return active;
}

export function getScope(): EngagementScope | null {
  if (active && active.expiresAt < Date.now()) active = null;
  return active;
}

export function isScopeActive(): boolean {
  return getScope() !== null;
}

export function clearScope(): void {
  active = null;
}

/** Throws (→ 403, see lib/httpErrors.ts) unless an Engagement Scope is currently confirmed. */
export function assertScope(action = "this tool"): void {
  if (!isScopeActive()) {
    throw new ScopeRequiredError(`Engagement scope not confirmed — confirm scope before running ${action}.`);
  }
}
