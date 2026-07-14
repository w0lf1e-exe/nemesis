#!/usr/bin/env node
// One-command bootstrap: installs both workspaces and generates local env
// files (with a real random API key) so `npm run dev` works immediately
// after cloning.
import { execSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function run(cmd, cwd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd, stdio: "inherit" });
}

console.log("N.E.M.E.S.I.S setup\n====================");

run("npm install", path.join(root, "server"));
run("npm install", path.join(root, "web"));

const serverEnvPath = path.join(root, "server", ".env");
const serverEnvExample = path.join(root, "server", ".env.example");
let apiKey;

if (!existsSync(serverEnvPath)) {
  apiKey = randomBytes(32).toString("hex");
  const contents = readFileSync(serverEnvExample, "utf8").replace(
    /^NEMESIS_API_KEY=.*/m,
    `NEMESIS_API_KEY=${apiKey}`,
  );
  writeFileSync(serverEnvPath, contents);
  console.log("\nCreated server/.env with a freshly generated NEMESIS_API_KEY.");
} else {
  const existing = readFileSync(serverEnvPath, "utf8");
  apiKey = existing.match(/^NEMESIS_API_KEY=(.*)$/m)?.[1];
  console.log("\nserver/.env already exists — leaving it untouched.");
}

const webEnvPath = path.join(root, "web", ".env.local");
const webEnvExample = path.join(root, "web", ".env.example");

if (!existsSync(webEnvPath)) {
  copyFileSync(webEnvExample, webEnvPath);
  console.log("Created web/.env.local (points the console at http://localhost:4317).");
} else {
  console.log("web/.env.local already exists — leaving it untouched.");
}

console.log("\nSetup complete. Next steps:\n");
console.log("  1. npm run dev        # starts the API on :4317 and the console on :5173");
console.log("  2. open http://localhost:5173 in your browser");
if (apiKey) {
  console.log(`  3. paste this API key into the access-control gate:\n\n     ${apiKey}\n`);
} else {
  console.log("  3. paste the NEMESIS_API_KEY from server/.env into the access-control gate\n");
}
console.log("For full Recon functionality, also install: nmap, whois, dnsutils (or your OS equivalents).");
