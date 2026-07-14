import "dotenv/config";
import { randomBytes } from "node:crypto";

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

const apiKey = process.env.NEMESIS_API_KEY;
if (!apiKey || apiKey === "change-me-to-a-long-random-secret") {
  // eslint-disable-next-line no-console
  console.warn(
    "[nemesis] NEMESIS_API_KEY is not set (or still the example value). " +
      "Generating a throwaway key for this run only — set NEMESIS_API_KEY in .env " +
      "for a stable key across restarts.",
  );
}

export const config = {
  port: Number(process.env.PORT ?? 4317),
  apiKey: apiKey && apiKey !== "change-me-to-a-long-random-secret" ? apiKey : randomBytes(32).toString("hex"),
  webOrigin: required("WEB_ORIGIN", "http://localhost:5173"),
  devRepoPath: process.env.DEV_REPO_PATH?.trim() || process.cwd(),
  jobTimeoutMs: Number(process.env.JOB_TIMEOUT_MS ?? 300_000),
  jobMaxOutputBytes: Number(process.env.JOB_MAX_OUTPUT_BYTES ?? 2_000_000),
};

if (!process.env.NEMESIS_API_KEY || process.env.NEMESIS_API_KEY === "change-me-to-a-long-random-secret") {
  // eslint-disable-next-line no-console
  console.warn(`[nemesis] Generated session API key: ${config.apiKey}`);
}
