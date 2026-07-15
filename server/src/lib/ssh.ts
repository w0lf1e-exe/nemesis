import { config } from "../config.js";
import { ValidationError } from "./validate.js";

/**
 * POSIX single-quote wrapping. Unlike local spawn() (argv array, no shell
 * ever involved), SSH always hands the remote command line to the remote
 * user's shell — so every argument has to be quoted defensively here, even
 * though callers also validate their inputs before this point.
 */
export function shellQuote(arg: string): string {
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}

export interface SshInvocation {
  command: string;
  args: string[];
}

/** Builds a local `ssh ...` invocation (spawned via execFile-style argv, never a shell) that runs one remote command. */
export function buildSshInvocation(remoteBin: string, remoteArgs: string[]): SshInvocation {
  if (!config.kali.enabled) {
    throw new ValidationError("Kali VM is not configured — set KALI_SSH_HOST in server/.env");
  }
  if (!config.kali.keyPath) {
    throw new ValidationError("Kali VM has no KALI_SSH_KEY_PATH configured — password auth is not supported");
  }

  const remoteCommand = [remoteBin, ...remoteArgs].map(shellQuote).join(" ");

  return {
    command: "ssh",
    args: [
      "-o",
      "BatchMode=yes",
      "-o",
      "StrictHostKeyChecking=accept-new",
      "-o",
      "ConnectTimeout=8",
      "-p",
      String(config.kali.port),
      "-i",
      config.kali.keyPath,
      `${config.kali.user}@${config.kali.host}`,
      remoteCommand,
    ],
  };
}
