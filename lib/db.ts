/**
 * Neon Postgres access.
 *
 * The app talks to Neon over its serverless HTTP driver, which needs no
 * connection pool and works in both the Node and edge runtimes. `sql` is a
 * tagged template that parameterizes every interpolation, so values are never
 * concatenated into the statement.
 */
import { neon } from "@neondatabase/serverless";
import { optionalEnv } from "@/lib/env";

/**
 * One result row. The driver cannot know a statement's shape, so columns are
 * `any` and callers narrow at the point of use.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type QueryRow = Record<string, any>;

/**
 * The driver's own signature is a union covering its `arrayMode` and
 * `fullResults` options. We never set those, so the return is always a row
 * array; this alias pins that down for callers.
 */
type SqlTag = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<QueryRow[]>;

/** False in local setups that have no DATABASE_URL, so callers can degrade instead of throwing. */
export function databaseConfigured(): boolean {
  return Boolean(optionalEnv("DATABASE_URL"));
}

let client: SqlTag | null = null;

export function db(): SqlTag {
  if (!client) {
    const url = optionalEnv("DATABASE_URL");
    if (!url) {
      throw new Error("DATABASE_URL is not set");
    }
    client = neon(url) as unknown as SqlTag;
  }
  return client;
}
