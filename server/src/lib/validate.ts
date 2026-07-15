const HOSTNAME_RE =
  /^(?=.{1,253}$)(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(\.(?!-)[a-zA-Z0-9-]{1,63}(?<!-))*$/;

const IPV4_RE =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

// Deliberately conservative: full IPv6 grammar is huge, this covers the
// common colon-hex forms without accepting anything shell/flag-shaped.
const IPV6_RE = /^[0-9a-fA-F:]{2,45}$/;

export class ValidationError extends Error {}

/**
 * Validates a scan/lookup target is a plain hostname or IP literal — never a
 * flag, path, or shell metacharacter. Callers must still pass args to
 * spawn() as an array (never through a shell) so this is defense in depth,
 * not the only guard.
 */
export function validateTarget(raw: unknown): string {
  if (typeof raw !== "string") throw new ValidationError("target must be a string");
  const target = raw.trim();
  if (!target) throw new ValidationError("target is required");
  if (target.length > 253) throw new ValidationError("target is too long");
  if (target.startsWith("-")) throw new ValidationError("target cannot look like a flag");
  if (HOSTNAME_RE.test(target) || IPV4_RE.test(target) || (target.includes(":") && IPV6_RE.test(target))) {
    return target;
  }
  throw new ValidationError("target must be a valid hostname or IP address");
}

const GIT_SUBCOMMANDS = new Set(["status", "log", "diff", "branch", "remote", "show-ref"]);

export function validateGitSubcommand(raw: unknown): string {
  if (typeof raw !== "string" || !GIT_SUBCOMMANDS.has(raw)) {
    throw new ValidationError(`git subcommand must be one of: ${[...GIT_SUBCOMMANDS].join(", ")}`);
  }
  return raw;
}

/** A plain http(s) URL with no embedded credentials and a validated hostname. */
export function validateUrl(raw: unknown): string {
  if (typeof raw !== "string") throw new ValidationError("url must be a string");
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new ValidationError("url is not a valid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ValidationError("url must be http or https");
  }
  if (url.username || url.password) {
    throw new ValidationError("url must not include embedded credentials");
  }
  validateTarget(url.hostname);
  return url.toString();
}

/** Short single-line free text (usernames, passwords, search queries) — bounded length, no control characters. */
export function shortText(raw: unknown, label: string, maxLen = 128): string {
  if (typeof raw !== "string" || !raw.trim()) throw new ValidationError(`${label} is required`);
  const value = raw.trim();
  if (value.length > maxLen) throw new ValidationError(`${label} is too long (max ${maxLen} characters)`);
  if (/[\r\n\0]/.test(value)) throw new ValidationError(`${label} contains invalid characters`);
  return value;
}

export function enumValue(raw: unknown, allowed: readonly string[], label = "value"): string {
  if (typeof raw !== "string" || !allowed.includes(raw)) {
    throw new ValidationError(`${label} must be one of: ${allowed.join(", ")}`);
  }
  return raw;
}

/**
 * A search-engine-style query (searchsploit titles, Metasploit module
 * search). Strips shell/console metacharacters as defense in depth — for
 * the Metasploit case specifically this also blocks ";" from breaking out
 * of the fixed `search <query>; exit` resource script into arbitrary
 * console commands.
 */
export function searchQuery(raw: unknown): string {
  return shortText(raw, "query", 200).replace(/[;&|`$()<>]/g, "");
}

/** A numeric hashcat mode id (e.g. 0 = MD5, 1000 = NTLM) — digits only. */
export function modeNumber(raw: unknown): string {
  if (typeof raw !== "string" || !/^\d{1,5}$/.test(raw.trim())) {
    throw new ValidationError("mode must be a numeric hashcat mode id");
  }
  return raw.trim();
}
