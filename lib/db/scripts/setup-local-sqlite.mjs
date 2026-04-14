import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const dbPackageDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const rootDir = path.resolve(dbPackageDir, "../..");
const dbPath = process.env.DATABASE_URL?.replace(/^file:/, "") || path.join(rootDir, "db.sqlite");
const resolvedDbPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(rootDir, dbPath);

function hashPassword(password) {
  return createHash("sha256").update(`${password}salt_tasktracker`).digest("hex");
}

const db = new Database(resolvedDbPath);
db.pragma("foreign_keys = ON");

db.exec(`
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

const now = Math.floor(Date.now() / 1000);
const insertUser = db.prepare(`
  INSERT INTO users (email, name, password_hash, role, created_at)
  VALUES (@email, @name, @passwordHash, @role, @createdAt)
  ON CONFLICT(email) DO UPDATE SET
    name = excluded.name,
    password_hash = excluded.password_hash,
    role = excluded.role,
    created_at = excluded.created_at
`);

for (const user of [
  { email: "manager@example.com", name: "Manager", role: "manager" },
  { email: "alice@example.com", name: "Alice", role: "employee" },
  { email: "bob@example.com", name: "Bob", role: "employee" },
]) {
  insertUser.run({
    ...user,
    passwordHash: hashPassword("password123"),
    createdAt: now,
  });
}

console.log(`SQLite database ready at ${resolvedDbPath}`);
