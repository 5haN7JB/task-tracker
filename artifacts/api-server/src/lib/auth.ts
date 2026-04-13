import { createHash } from "crypto";
import { type Request, type Response, type NextFunction } from "express";

export function hashPassword(password: string): string {
  return createHash("sha256").update(password + "salt_tasktracker").digest("hex");
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

export function requireManager(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  if (req.session.role !== "manager") {
    res.status(403).json({ error: "Manager access required" });
    return;
  }
  next();
}
