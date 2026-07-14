import type { NextFunction, Request, Response } from "express";

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();
const MAX_TOKENS = 20;
const REFILL_PER_MS = MAX_TOKENS / 60_000; // full bucket refills every 60s

export function rateLimit(req: Request, res: Response, next: NextFunction): void {
  const key = req.ip ?? "unknown";
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: MAX_TOKENS, lastRefill: now };
    buckets.set(key, bucket);
  }
  const elapsed = now - bucket.lastRefill;
  bucket.tokens = Math.min(MAX_TOKENS, bucket.tokens + elapsed * REFILL_PER_MS);
  bucket.lastRefill = now;

  if (bucket.tokens < 1) {
    res.status(429).json({ error: "rate_limited", message: "Too many requests — slow down." });
    return;
  }
  bucket.tokens -= 1;
  next();
}
