import { Router } from "express";
import { config } from "../config.js";
import { sendError } from "../lib/httpErrors.js";
import { startJob } from "../lib/jobs.js";
import { validateGitSubcommand } from "../lib/validate.js";

export const devRouter = Router();

// Fixed arg sets per subcommand — the client selects a subcommand name only,
// never raw git args, so there's no room to smuggle in destructive flags.
const GIT_ARGS: Record<string, string[]> = {
  status: ["status", "--short", "--branch"],
  log: ["log", "--oneline", "--graph", "-n", "30"],
  diff: ["diff", "--stat"],
  branch: ["branch", "-vv", "--all"],
  remote: ["remote", "-v"],
  "show-ref": ["show-ref"],
};

devRouter.post("/git", (req, res) => {
  try {
    const subcommand = validateGitSubcommand(req.body?.subcommand);
    const job = startJob("git", GIT_ARGS[subcommand], { cwd: config.devRepoPath });
    res.status(202).json({ job, repoPath: config.devRepoPath });
  } catch (err) {
    sendError(res, err);
  }
});
