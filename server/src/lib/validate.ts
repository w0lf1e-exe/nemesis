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
