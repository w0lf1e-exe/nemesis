import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { requireAuth } from "./middleware/auth.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { devRouter } from "./routes/dev.js";
import { jobsRouter } from "./routes/jobs.js";
import { reconRouter } from "./routes/recon.js";
import { systemRouter } from "./routes/system.js";

const app = express();

app.use(express.json({ limit: "64kb" }));
app.use(
  cors({
    origin: config.webOrigin,
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

app.use((_req, res) => res.status(404).json({ error: "not_found" }));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[nemesis] unhandled error:", err);
  res.status(500).json({ error: "internal_error" });
});

app.listen(config.port, () => {
  console.log(`\n  N.E.M.E.S.I.S server online — listening on :${config.port}`);
  console.log(`  Dev module bound to: ${config.devRepoPath}`);
  console.log(`  Allowed web origin:  ${config.webOrigin}\n`);
});
