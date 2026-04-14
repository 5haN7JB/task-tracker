import { createHash } from "node:crypto";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. For local SQLite use DATABASE_URL=file:./db.sqlite.",
  );
}

const sqlitePath = process.env.DATABASE_URL.replace(/^file:/, "");
const sqlite = new Database(sqlitePath);
sqlite.pragma("foreign_keys = ON");

// Run schema bootstrap inline — idempotent, safe to run on every startup.
// This ensures tables exist even on a freshly-mounted persistent volume.
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'todo',
    deadline TEXT,
    completion_percent INTEGER,
    expected_completion_time TEXT,
    feedback TEXT,
    created_by_id INTEGER NOT NULL REFERENCES users(id),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS task_assignees (
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS task_employee_progress (
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    completion_percent INTEGER NOT NULL DEFAULT 0,
    expected_completion_date TEXT,
    updated_at INTEGER NOT NULL
  );
`);

// Seed default users (ON CONFLICT DO UPDATE keeps existing passwords intact)
const now = Math.floor(Date.now() / 1000);
const seedUser = sqlite.prepare(`
  INSERT INTO users (email, name, password_hash, role, created_at)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(email) DO NOTHING
`);
const hashPw = (pw: string) =>
  createHash("sha256").update(`${pw}salt_tasktracker`).digest("hex");

for (const u of [
  { email: "manager@example.com", name: "Manager", role: "manager" },
  { email: "alice@example.com",   name: "Alice",   role: "employee" },
  { email: "bob@example.com",     name: "Bob",     role: "employee" },
]) {
  seedUser.run(u.email, u.name, hashPw("password123"), u.role, now);
}

export const db = drizzle(sqlite, { schema });

export * from "./schema";
