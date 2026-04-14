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

export const db = drizzle(sqlite, { schema });

export * from "./schema";
