import { Router } from "express";
import { clearScope, confirmScope, getScope } from "../lib/engagementScope.js";

export const scopeRouter = Router();

const CONFIRM_PHRASE = "I AM AUTHORIZED";

scopeRouter.get("/", (_req, res) => {
  res.json({ scope: getScope() });
});

scopeRouter.post("/confirm", (req, res) => {
  const description = req.body?.description;
  const confirmText = req.body?.confirmText;

  if (typeof description !== "string" || description.trim().length < 10) {
    res.status(400).json({ error: "Describe the engagement/authorization in at least 10 characters." });
    return;
  }
  if (confirmText !== CONFIRM_PHRASE) {
    res.status(400).json({ error: `Type "${CONFIRM_PHRASE}" exactly to confirm.` });
    return;
  }

  const scope = confirmScope(description.trim());
  res.json({ scope });
});

scopeRouter.post("/clear", (_req, res) => {
  clearScope();
  res.json({ ok: true });
});
