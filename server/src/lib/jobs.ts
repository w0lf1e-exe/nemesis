import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import type { Response } from "express";
import { config } from "../config.js";

export type JobStatus = "running" | "done" | "error" | "killed";

export interface JobMeta {
  id: string;
  tool: string;
  args: string[];
  status: JobStatus;
  exitCode: number | null;
  startedAt: number;
  endedAt: number | null;
}

interface Job extends JobMeta {
  emitter: EventEmitter;
  output: string;
  truncated: boolean;
}

const jobs = new Map<string, Job>();

// Only these binaries may ever be spawned. Callers pass fixed strings from
// this whitelist — never a user-supplied binary name.
const ALLOWED_TOOLS = new Set(["nmap", "whois", "dig", "git"]);

export function startJob(tool: string, args: string[], opts: { cwd?: string } = {}): JobMeta {
  if (!ALLOWED_TOOLS.has(tool)) {
    throw new Error(`tool "${tool}" is not in the execution whitelist`);
  }

  const id = randomUUID();
  const emitter = new EventEmitter();
  const job: Job = {
    id,
    tool,
    args,
    status: "running",
    exitCode: null,
    startedAt: Date.now(),
    endedAt: null,
    emitter,
    output: "",
    truncated: false,
  };
  jobs.set(id, job);

  // spawn() with an argument array never invokes a shell, so nothing in
  // `args` (including validated targets) can be interpreted as shell syntax.
  const child = spawn(tool, args, {
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    cwd: opts.cwd,
  });

  const timeout = setTimeout(() => {
    if (job.status === "running") {
      child.kill("SIGKILL");
      job.status = "killed";
      appendLine(job, `\n[nemesis] job killed after exceeding ${config.jobTimeoutMs}ms timeout\n`);
    }
  }, config.jobTimeoutMs);

  const onChunk = (chunk: Buffer) => appendLine(job, chunk.toString("utf8"));
  child.stdout?.on("data", onChunk);
  child.stderr?.on("data", onChunk);

  child.on("error", (err: NodeJS.ErrnoException) => {
    clearTimeout(timeout);
    job.status = "error";
    job.endedAt = Date.now();
    const message =
      err.code === "ENOENT"
        ? `[nemesis] "${tool}" is not installed on this host — install it and try again.\n`
        : `[nemesis] failed to launch "${tool}": ${err.message}\n`;
    appendLine(job, message);
    job.emitter.emit("end");
  });

  child.on("close", (code) => {
    clearTimeout(timeout);
    if (job.status === "running") job.status = "done";
    job.exitCode = code;
    job.endedAt = Date.now();
    job.emitter.emit("end");
  });

  return toMeta(job);
}

function appendLine(job: Job, text: string): void {
  if (job.truncated) return;
  if (job.output.length + text.length > config.jobMaxOutputBytes) {
    text = text.slice(0, Math.max(0, config.jobMaxOutputBytes - job.output.length));
    job.truncated = true;
    text += "\n[nemesis] output truncated — max buffer size reached\n";
  }
  job.output += text;
  job.emitter.emit("data", text);
}

function toMeta(job: Job): JobMeta {
  const { id, tool, args, status, exitCode, startedAt, endedAt } = job;
  return { id, tool, args, status, exitCode, startedAt, endedAt };
}

export function getJobMeta(id: string): JobMeta | undefined {
  const job = jobs.get(id);
  return job ? toMeta(job) : undefined;
}

/** Streams a job's output over Server-Sent Events, replaying any backlog first. */
export function streamJob(id: string, res: Response): void {
  const job = jobs.get(id);
  if (!job) {
    res.status(404).end();
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  if (job.output) send("data", job.output);
  if (job.status !== "running") {
    send("end", { status: job.status, exitCode: job.exitCode });
    res.end();
    return;
  }

  const onData = (chunk: string) => send("data", chunk);
  const onEnd = () => {
    send("end", { status: job.status, exitCode: job.exitCode });
    cleanup();
    res.end();
  };
  const cleanup = () => {
    job.emitter.off("data", onData);
    job.emitter.off("end", onEnd);
  };

  job.emitter.on("data", onData);
  job.emitter.on("end", onEnd);
  res.on("close", cleanup);
}

// Periodically forget jobs that finished long ago to bound memory.
const JOB_TTL_MS = 30 * 60_000;
setInterval(() => {
  const cutoff = Date.now() - JOB_TTL_MS;
  for (const [id, job] of jobs) {
    if (job.endedAt && job.endedAt < cutoff) jobs.delete(id);
  }
}, 5 * 60_000).unref();
