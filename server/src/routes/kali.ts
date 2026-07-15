import { Router } from "express";
import { config } from "../config.js";
import { ALLOWED_KALI_TOOLS, startJob } from "../lib/jobs.js";

export const kaliRouter = Router();

kaliRouter.get("/status", (_req, res) => {
  res.json({
    enabled: config.kali.enabled,
    host: config.kali.enabled ? config.kali.host : null,
    port: config.kali.port,
    user: config.kali.user,
    workDir: config.kali.workDir,
  });
});

// Runs a benign, entirely developer-authored inventory script over SSH —
// nothing here is built from request input, so there's no injection surface
// even though it's assembled as a single remote command string.
kaliRouter.post("/check", (_req, res) => {
  if (!config.kali.enabled) {
    res.status(400).json({ error: "Kali VM is not configured — set KALI_SSH_HOST in server/.env" });
    return;
  }
  const binaries = [...ALLOWED_KALI_TOOLS].filter((b) => b !== "bash").sort();
  const script = [
    "echo NEMESIS_UPLINK_OK",
    `uname -a`,
    ...binaries.map((b) => `printf '%-14s ' '${b}'; command -v ${b} >/dev/null 2>&1 && echo installed || echo missing`),
  ].join(" && ");
  try {
    const job = startJob("bash", ["-c", script], { executor: "kali" });
    res.status(202).json({ job });
  } catch (err) {
    res.status(500).json({ error: "internal_error", message: err instanceof Error ? err.message : String(err) });
  }
});
