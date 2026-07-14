import type { NextFunction, Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { config } from "../config.js";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.header("authorization") ?? "";
  const [scheme, headerToken] = header.split(" ");
  const bearerToken = scheme === "Bearer" ? headerToken : undefined;

  // EventSource (used for SSE job streams) can't set custom headers, so the
  // stream route alone also accepts the key as a query param.
  const queryToken =
    req.path.endsWith("/stream") && typeof req.query.token === "string" ? req.query.token : undefined;

  const token = bearerToken ?? queryToken;
  if (!token || !safeCompare(token, config.apiKey)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}
