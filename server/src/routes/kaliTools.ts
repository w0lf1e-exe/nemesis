import { Router } from "express";
import { config } from "../config.js";
import { isScopeActive } from "../lib/engagementScope.js";
import { startJob } from "../lib/jobs.js";
import { KALI_TOOL_REGISTRY, WORDLIST_OPTIONS } from "../lib/kaliTools.js";
import { ValidationError } from "../lib/validate.js";

export const kaliToolsRouter = Router();

kaliToolsRouter.get("/", (_req, res) => {
  res.json({
    enabled: config.kali.enabled,
    wordlists: WORDLIST_OPTIONS,
    tools: Object.values(KALI_TOOL_REGISTRY).map(({ id, label, tier, binary }) => ({ id, label, tier, binary })),
  });
});

kaliToolsRouter.post("/:id/run", (req, res) => {
  const spec = KALI_TOOL_REGISTRY[req.params.id];
  if (!spec) {
    res.status(404).json({ error: "unknown tool" });
    return;
  }
  if (!config.kali.enabled) {
    res.status(400).json({ error: "Kali VM is not configured — set KALI_SSH_HOST in server/.env" });
    return;
  }
  if ((spec.tier === "vuln" || spec.tier === "high-risk") && !isScopeActive()) {
    res.status(403).json({
      error: "Engagement scope not confirmed — confirm scope before running vuln-scan or credential-audit tools.",
    });
    return;
  }

  try {
    const args = spec.build(req.body ?? {});
    const job = startJob(spec.binary, args, { executor: "kali" });
    res.status(202).json({ job });
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "internal_error", message: err instanceof Error ? err.message : String(err) });
  }
});
