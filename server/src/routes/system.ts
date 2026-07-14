import { Router } from "express";
import os from "node:os";
import { config } from "../config.js";

export const systemRouter = Router();

systemRouter.get("/status", (_req, res) => {
  res.json({
    codename: "N.E.M.E.S.I.S",
    org: "injexion.io",
    hostname: os.hostname(),
    platform: `${os.platform()} ${os.release()}`,
    arch: os.arch(),
    nodeVersion: process.version,
    uptimeSeconds: Math.round(process.uptime()),
    hostUptimeSeconds: Math.round(os.uptime()),
    loadavg: os.loadavg(),
    memory: {
      totalBytes: os.totalmem(),
      freeBytes: os.freemem(),
    },
    cpuCount: os.cpus().length,
    devRepoPath: config.devRepoPath,
  });
});
