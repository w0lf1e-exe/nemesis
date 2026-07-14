export interface ParsedCommand {
  kind: "nmap" | "whois" | "dig" | "subdomains" | "git" | "setTarget" | "systemStatus" | "unknown";
  target?: string;
  profile?: string;
  recordType?: string;
  subcommand?: string;
}

const GIT_WORDS: Record<string, string> = {
  status: "status",
  log: "log",
  diff: "diff",
  branch: "branch",
  branches: "branch",
  remote: "remote",
  remotes: "remote",
  ref: "show-ref",
  refs: "show-ref",
};

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/[.?!]+$/, "").replace(/\s+/g, " ");
}

/** Small closed-vocabulary grammar for push-to-talk voice commands — order matters, most specific first. */
export function parseCommand(text: string): ParsedCommand {
  const t = normalize(text);
  let m: RegExpMatchArray | null;

  m = t.match(/^(?:set\s+)?target(?:\s+to)?\s+(.+)$/);
  if (m) return { kind: "setTarget", target: m[1].trim() };

  if (/^(system\s+status|status\s+report)$/.test(t)) return { kind: "systemStatus" };

  m = t.match(/^ping\s+sweep\s+(.+)$/);
  if (m) return { kind: "nmap", profile: "ping", target: m[1].trim() };

  m = t.match(/^ping\s+(.+)$/);
  if (m) return { kind: "nmap", profile: "ping", target: m[1].trim() };

  m = t.match(/^(?:run\s+(?:a\s+)?)?(quick|service|full)?\s*scan\s+(?:on\s+|of\s+|against\s+)?(.+)$/);
  if (m) return { kind: "nmap", profile: m[1] ?? "quick", target: m[2].trim() };

  m = t.match(/^(a|aaaa|mx|txt|ns|cname|soa|any)\s+records?\s+(?:for|on)\s+(.+)$/);
  if (m) return { kind: "dig", recordType: m[1].toUpperCase(), target: m[2].trim() };

  m = t.match(/^(?:dig|lookup|resolve|dns\s+lookup)\s+(.+)$/);
  if (m) return { kind: "dig", recordType: "A", target: m[1].trim() };

  m = t.match(/^whois\s+(.+)$/);
  if (m) return { kind: "whois", target: m[1].trim() };

  m = t.match(/^(?:find|enumerate|list)\s+subdomains?\s+(?:for|on|of)?\s*(.+)$/);
  if (m) return { kind: "subdomains", target: m[1].trim() };

  m = t.match(/^(?:git\s+)?(status|log|diff|branches?|remotes?|refs?)$/);
  if (m) return { kind: "git", subcommand: GIT_WORDS[m[1]] ?? "status" };

  return { kind: "unknown" };
}
