import type { Response } from "express";
import { ScopeRequiredError } from "./engagementScope.js";
import { ValidationError } from "./validate.js";

/** Shared error → HTTP response mapping for route handlers: 400 for bad input, 403 for scope-gating, 500 otherwise. */
export function sendError(res: Response, err: unknown): void {
  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err instanceof ScopeRequiredError) {
    res.status(403).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: "internal_error", message: err instanceof Error ? err.message : String(err) });
}
