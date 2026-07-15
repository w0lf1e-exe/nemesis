import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { requireAuth } from "./middleware/auth.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { devRouter } from "./routes/dev.js";
import { jobsRouter } from "./routes/jobs.js";
import { kaliRouter } from "./routes/kali.js";
import { kaliToolsRouter } from "./routes/kaliTools.js";
import { reconRouter } from "./routes/recon.js";
import { scopeRouter } from "./routes/scope.js";
import { systemRouter } from "./routes/system.js";

const app = express();

app.use(express.json({ limit: "64kb" }));

// Chrome's Private Network Access spec requires this on top of normal CORS
// before a page loaded from a public origin (e.g. a deployed Lovable site)
// is allowed to fetch a private/loopback target like this server running on
// http://localhost. Must run *before* the cors() middleware below: cors()
// ends OPTIONS preflight requests itself, so a middleware placed after it
// never runs for preflights.
app.use((req, res, next) => {
  if (req.headers["access-control-request-private-network"] === "true") {
    res.setHeader("Access-Control-Allow-Private-Network", "true");
  }
  next();
});

app.use(
  cors({
    origin: config.webOrigins,
    methods: ["GET", "POST"],
  }),
);

// Unauthenticated health check only — everything else requires the bearer key.
app.get("/api/health", (_req, res) => res.json({ ok: true, service: "nemesis-server" }));

app.use("/api", requireAuth, rateLimit);
app.use("/api/recon", reconRouter);
app.use("/api/dev", devRouter);
app.use("/api/system", systemRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/kali", kaliRouter);
app.use("/api/kali-tools", kaliToolsRouter);
app.use("/api/scope", scopeRouter);

app.use((_req, res) => res.status(404).json({ error: "not_found" }));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[nemesis] unhandled error:", err);
  res.status(500).json({ error: "internal_error" });
});

app.listen(config.port, () => {
  console.log(`\n  N.E.M.E.S.I.S server online — listening on :${config.port}`);
  console.log(`  Dev module bound to: ${config.devRepoPath}`);
  console.log(`  Allowed web origins: ${config.webOrigins.join(", ")}`);
  console.log(
    config.kali.enabled
      ? `  Kali VM uplink:      ${config.kali.user}@${config.kali.host}:${config.kali.port}\n`
      : `  Kali VM uplink:      not configured (set KALI_SSH_HOST to enable)\n`,
  );
});
