import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type Click = {
  at: string;
  referrer: string | null;
  userAgent: string | null;
};

export type LinkRecord = {
  url: string;
  createdAt: string;
  clicks: number;
  clickLog: Click[];
  /** ISO timestamp after which the link stops redirecting. Missing/null = never expires. */
  expiresAt?: string | null;
};

export type LinkStore = Record<string, LinkRecord>;

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "links.json");

/** Keep at most this many click entries per link so the JSON file stays small. */
const MAX_CLICK_LOG = 100;

const CODE_ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const CODE_LENGTH = 7;

/** Paths used by the app itself; these can never be short codes. */
const RESERVED = new Set([
  "api",
  "stats",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);

export const ALIAS_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;

// Simple in-process mutex: every read-modify-write runs one after another,
// so concurrent requests can't clobber each other's changes.
let queue: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

async function readStore(): Promise<LinkStore> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as LinkStore;
    }
    return {};
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw err;
  }
}

async function writeStore(store: LinkStore): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  // Write to a temp file and rename it, so a crash never leaves half a file.
  const tmp = `${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(store, null, 2) + "\n", "utf8");
  await rename(tmp, DATA_FILE);
}

export function generateCode(length = CODE_LENGTH): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

export function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 2048) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function isReserved(code: string): boolean {
  return RESERVED.has(code.toLowerCase());
}

/** Furthest allowed expiry, to catch typos like year 20260. */
const MAX_EXPIRY_MS = 10 * 365 * 24 * 60 * 60 * 1000;

/**
 * Validates an optional expiry value from the API.
 * Returns the normalized ISO string, null for "no expiry", or throws StoreError.
 */
export function parseExpiresAt(input: unknown, now = Date.now()): string | null {
  if (input === undefined || input === null || input === "") return null;
  if (typeof input !== "string") {
    throw new StoreError("Expiry must be an ISO date string.", 400);
  }
  const ms = Date.parse(input);
  if (Number.isNaN(ms)) {
    throw new StoreError("Expiry date is not a valid date.", 400);
  }
  if (ms <= now) {
    throw new StoreError("Expiry date must be in the future.", 400);
  }
  if (ms - now > MAX_EXPIRY_MS) {
    throw new StoreError("Expiry date can be at most 10 years from now.", 400);
  }
  return new Date(ms).toISOString();
}

export function isExpired(
  record: Pick<LinkRecord, "expiresAt">,
  now = Date.now(),
): boolean {
  if (!record.expiresAt) return false;
  const ms = Date.parse(record.expiresAt);
  return !Number.isNaN(ms) && ms <= now;
}

export class StoreError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function createLink(
  url: string,
  alias?: string,
  expiresAt: string | null = null,
): Promise<{ code: string; record: LinkRecord }> {
  return withLock(async () => {
    const store = await readStore();
    let code: string;

    if (alias) {
      if (!ALIAS_PATTERN.test(alias)) {
        throw new StoreError(
          "Alias must be 3-32 characters: letters, numbers, - or _.",
          400,
        );
      }
      if (isReserved(alias)) {
        throw new StoreError("That alias is reserved. Try another one.", 400);
      }
      if (Object.prototype.hasOwnProperty.call(store, alias)) {
        throw new StoreError("That alias is already taken.", 409);
      }
      code = alias;
    } else {
      let attempts = 0;
      do {
        // After a few collisions, grow the code length to escape a crowded space.
        code = generateCode(CODE_LENGTH + Math.floor(attempts / 5));
        attempts++;
        if (attempts > 50) {
          throw new StoreError("Could not generate a unique code.", 500);
        }
      } while (store[code] || isReserved(code));
    }

    const record: LinkRecord = {
      url,
      createdAt: new Date().toISOString(),
      clicks: 0,
      clickLog: [],
      expiresAt,
    };
    store[code] = record;
    await writeStore(store);
    return { code, record };
  });
}

export type ResolveResult =
  | { status: "ok"; record: LinkRecord }
  | { status: "expired"; record: LinkRecord }
  | { status: "missing" };

/**
 * Looks up a code for a visit. Active links get the click recorded;
 * expired links are returned untouched (no click is counted, no redirect).
 */
export async function recordClick(
  code: string,
  click: Omit<Click, "at">,
): Promise<ResolveResult> {
  return withLock(async () => {
    const store = await readStore();
    if (!Object.prototype.hasOwnProperty.call(store, code)) {
      return { status: "missing" } as const;
    }
    const record = store[code];
    if (isExpired(record)) return { status: "expired", record } as const;
    record.clicks = (record.clicks ?? 0) + 1;
    record.clickLog ??= [];
    record.clickLog.push({ at: new Date().toISOString(), ...click });
    if (record.clickLog.length > MAX_CLICK_LOG) {
      record.clickLog = record.clickLog.slice(-MAX_CLICK_LOG);
    }
    await writeStore(store);
    return { status: "ok", record } as const;
  });
}

export async function listLinks(): Promise<
  Array<{ code: string; expired: boolean } & LinkRecord>
> {
  const store = await readStore();
  const now = Date.now();
  return Object.entries(store)
    .map(([code, record]) => ({
      code,
      ...record,
      clicks: record.clicks ?? 0,
      clickLog: record.clickLog ?? [],
      expiresAt: record.expiresAt ?? null,
      expired: isExpired(record, now),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
