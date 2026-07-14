import { Router } from "express";
import { getJobMeta, streamJob } from "../lib/jobs.js";

export const jobsRouter = Router();

jobsRouter.get("/:id", (req, res) => {
  const job = getJobMeta(req.params.id);
  if (!job) {
    res.status(404).json({ error: "job not found" });
    return;
  }
  res.json({ job });
});

jobsRouter.get("/:id/stream", (req, res) => {
  streamJob(req.params.id, res);
});
