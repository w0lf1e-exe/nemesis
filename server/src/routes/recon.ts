import { Router } from "express";
import { startJob } from "../lib/jobs.js";
import { ValidationError, validateTarget } from "../lib/validate.js";

export const reconRouter = Router();

// Fixed, curated flag sets — the client can only pick a profile name, never
// supply raw nmap flags, so there is no way to smuggle arbitrary options in.
const NMAP_PROFILES: Record<string, string[]> = {
  ping: ["-sn"],
  quick: ["-T4", "-F"],
  service: ["-T4", "-sV", "-F"],
  full: ["-T4", "-p-"],
};

reconRouter.post("/nmap", (req, res) => {
  try {
    const target = validateTarget(req.body?.target);
    const profile = typeof req.body?.profile === "string" ? req.body.profile : "quick";
    const flags = NMAP_PROFILES[profile];
    if (!flags) {
      res.status(400).json({ error: `unknown profile "${profile}"`, allowed: Object.keys(NMAP_PROFILES) });
      return;
    }
    const job = startJob("nmap", [...flags, target]);
    res.status(202).json({ job });
  } catch (err) {
    handleError(res, err);
  }
});

reconRouter.post("/whois", (req, res) => {
  try {
    const target = validateTarget(req.body?.target);
    const job = startJob("whois", [target]);
    res.status(202).json({ job });
  } catch (err) {
    handleError(res, err);
  }
});

const DIG_RECORD_TYPES = new Set(["A", "AAAA", "MX", "TXT", "NS", "CNAME", "SOA", "ANY"]);

reconRouter.post("/dig", (req, res) => {
  try {
    const target = validateTarget(req.body?.target);
    const recordType = typeof req.body?.recordType === "string" ? req.body.recordType.toUpperCase() : "A";
    if (!DIG_RECORD_TYPES.has(recordType)) {
      res.status(400).json({ error: `unknown record type "${recordType}"`, allowed: [...DIG_RECORD_TYPES] });
      return;
    }
    const job = startJob("dig", [target, recordType, "+noall", "+answer"]);
    res.status(202).json({ job });
  } catch (err) {
    handleError(res, err);
  }
});

// Passive OSINT: certificate-transparency subdomain enumeration via crt.sh.
// No local tool required, read-only, and touches nothing but public CT logs.
reconRouter.post("/subdomains", async (req, res) => {
  try {
    const target = validateTarget(req.body?.target);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const upstream = await fetch(`https://crt.sh/?q=%25.${encodeURIComponent(target)}&output=json`, {
        signal: controller.signal,
        headers: { "User-Agent": "nemesis-console/0.1 (injexion.io)" },
      });
      if (!upstream.ok) {
        res.status(502).json({ error: `crt.sh returned HTTP ${upstream.status}` });
        return;
      }
      const rows = (await upstream.json()) as Array<{ name_value?: string }>;
      const names = new Set<string>();
      for (const row of rows) {
        for (const name of (row.name_value ?? "").split("\n")) {
          const clean = name.trim().toLowerCase().replace(/^\*\./, "");
          if (clean && clean.endsWith(target.toLowerCase())) names.add(clean);
        }
      }
      res.json({ target, count: names.size, subdomains: [...names].sort() });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    handleError(res, err);
  }
});

function handleError(res: import("express").Response, err: unknown): void {
  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: "internal_error", message: err instanceof Error ? err.message : String(err) });
}
