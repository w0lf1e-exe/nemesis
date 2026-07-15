import { config } from "../config.js";
import { enumValue, modeNumber, searchQuery, shortText, validateTarget, validateUrl, ValidationError } from "./validate.js";

export type RiskTier = "recon" | "web" | "vuln" | "high-risk";

export interface KaliToolSpec {
  id: string;
  label: string;
  binary: string;
  tier: RiskTier;
  build: (body: Record<string, unknown>) => string[];
}

// Curated, fixed set of wordlist paths shipped with Kali — never an
// arbitrary client-supplied path, exactly like the nmap scan profiles.
const WORDLISTS: Record<string, string> = {
  "dirb-common": "/usr/share/wordlists/dirb/common.txt",
  "dirb-big": "/usr/share/wordlists/dirb/big.txt",
  "seclists-common": "/usr/share/seclists/Discovery/Web-Content/common.txt",
  rockyou: "/usr/share/wordlists/rockyou.txt",
};

function wordlistPath(key: unknown): string {
  if (typeof key !== "string" || !(key in WORDLISTS)) {
    throw new ValidationError(`wordlist must be one of: ${Object.keys(WORDLISTS).join(", ")}`);
  }
  return WORDLISTS[key];
}

// Files the credential-audit tools read (hash dumps, etc.) must already be
// sitting in the configured KALI_WORK_DIR — referenced by filename only, so
// there's no path traversal outside that one directory.
function workspaceFile(name: unknown): string {
  if (typeof name !== "string" || !/^[a-zA-Z0-9._-]{1,128}$/.test(name)) {
    throw new ValidationError("filename must contain only letters, numbers, '.', '_', '-' (no path separators)");
  }
  return `${config.kali.workDir}/${name}`;
}

export const WORDLIST_OPTIONS = Object.keys(WORDLISTS);

export const KALI_TOOL_REGISTRY: Record<string, KaliToolSpec> = {
  theharvester: {
    id: "theharvester",
    label: "theHarvester",
    binary: "theHarvester",
    tier: "recon",
    build: (b) => ["-d", validateTarget(b.target), "-b", "all"],
  },
  amass: {
    id: "amass",
    label: "amass (passive)",
    binary: "amass",
    tier: "recon",
    build: (b) => ["enum", "-passive", "-d", validateTarget(b.target)],
  },
  dnsrecon: {
    id: "dnsrecon",
    label: "dnsrecon",
    binary: "dnsrecon",
    tier: "recon",
    build: (b) => ["-d", validateTarget(b.target)],
  },
  sublist3r: {
    id: "sublist3r",
    label: "Sublist3r",
    binary: "sublist3r",
    tier: "recon",
    build: (b) => ["-d", validateTarget(b.target)],
  },
  searchsploit: {
    id: "searchsploit",
    label: "searchsploit",
    binary: "searchsploit",
    tier: "recon",
    build: (b) => [searchQuery(b.query)],
  },
  msfsearch: {
    id: "msfsearch",
    label: "Metasploit module search",
    binary: "msfconsole",
    tier: "recon",
    build: (b) => ["-q", "-x", `search ${searchQuery(b.query)}; exit`],
  },
  nikto: {
    id: "nikto",
    label: "Nikto",
    binary: "nikto",
    tier: "web",
    build: (b) => ["-h", validateUrl(b.url)],
  },
  gobuster: {
    id: "gobuster",
    label: "gobuster dir",
    binary: "gobuster",
    tier: "web",
    build: (b) => ["dir", "-u", validateUrl(b.url), "-w", wordlistPath(b.wordlist), "-q"],
  },
  whatweb: {
    id: "whatweb",
    label: "WhatWeb",
    binary: "whatweb",
    tier: "web",
    build: (b) => [validateUrl(b.url)],
  },
  wpscan: {
    id: "wpscan",
    label: "WPScan",
    binary: "wpscan",
    tier: "web",
    build: (b) => ["--url", validateUrl(b.url), "--enumerate", "vp", "--no-banner"],
  },
  sqlmap: {
    id: "sqlmap",
    label: "sqlmap (detect only)",
    binary: "sqlmap",
    tier: "vuln",
    // level/risk are hardcoded at the lowest values and --dump/--os-shell/etc.
    // are never included — this can confirm a target looks injectable, not
    // extract data or gain a shell.
    build: (b) => ["-u", validateUrl(b.url), "--batch", "--level=1", "--risk=1", "--banner"],
  },
  hydra: {
    id: "hydra",
    label: "Hydra (single credential test)",
    binary: "hydra",
    tier: "high-risk",
    // One username/password pair only — this verifies a specific suspected
    // or reset credential, not a wordlist spray.
    build: (b) => {
      const service = enumValue(b.service, ["ssh", "ftp", "http-get", "smb", "rdp"], "service");
      const target = validateTarget(b.target);
      const user = shortText(b.username, "username");
      const pass = shortText(b.password, "password");
      return ["-t", "4", "-f", "-l", user, "-p", pass, target, service];
    },
  },
  john: {
    id: "john",
    label: "John the Ripper",
    binary: "john",
    tier: "high-risk",
    build: (b) => [`--wordlist=${wordlistPath(b.wordlist)}`, workspaceFile(b.hashFile)],
  },
  hashcat: {
    id: "hashcat",
    label: "hashcat",
    binary: "hashcat",
    tier: "high-risk",
    build: (b) => ["-m", modeNumber(b.mode), "-a", "0", workspaceFile(b.hashFile), wordlistPath(b.wordlist)],
  },
};
