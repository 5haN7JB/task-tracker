import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/users", requireAuth, async (_req, res): Promise<void> => {
  const users = await db.select({
    id: usersTable.id,
    email: usersTable.email,
    name: usersTable.name,
    role: usersTable.role,
    createdAt: usersTable.createdAt,
  }).from(usersTable);

  res.json(users.map(u => ({ ...u, createdAt: u.createdAt.toISOString() })));
});

export default router;
