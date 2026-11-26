"use client";

import { useState, type FormEvent } from "react";

type Result = {
  code: string;
  url: string;
  shortUrl: string;
  expiresAt: string | null;
};

const PRESETS = [
  { label: "1 hour", ms: 60 * 60 * 1000 },
  { label: "1 day", ms: 24 * 60 * 60 * 1000 },
  { label: "7 days", ms: 7 * 24 * 60 * 60 * 1000 },
  { label: "30 days", ms: 30 * 24 * 60 * 60 * 1000 },
];

/** Formats a Date as the value a datetime-local input expects (local time). */
function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10";

export default function ShortenForm() {
  const [url, setUrl] = useState("");
  const [alias, setAlias] = useState("");
  const [expiry, setExpiry] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setCopied(false);

    // datetime-local has no timezone; the browser interprets it as local time.
    let expiresAt: string | undefined;
    if (expiry) {
      const date = new Date(expiry);
      if (Number.isNaN(date.getTime())) {
        setError("Expiry date is not a valid date.");
        return;
      }
      if (date.getTime() <= Date.now()) {
        setError("Expiry date must be in the future.");
        return;
      }
      expiresAt = date.toISOString();
    }

    setLoading(true);
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, alias: alias || undefined, expiresAt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setResult(data as Result);
      setUrl("");
      setAlias("");
      setExpiry("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard not available */
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="url" className="mb-1.5 block text-sm font-medium">
            Long URL
          </label>
          <input
            id="url"
            type="url"
            required
            inputMode="url"
            placeholder="https://example.com/a/very/long/link"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <label htmlFor="alias" className="text-sm font-medium">
              Custom alias <span className="font-normal text-zinc-500">(optional)</span>
            </label>
            <span className="group relative inline-flex">
              <button
                type="button"
                aria-label="What is a custom alias?"
                aria-describedby="alias-tooltip"
                className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-zinc-400 font-serif text-[10px] font-semibold italic leading-none text-zinc-500 transition hover:border-zinc-900 hover:text-zinc-900 focus:border-zinc-900 focus:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-100 dark:hover:text-zinc-100 dark:focus:border-zinc-100 dark:focus:text-zinc-100"
              >
                i
              </button>
              <span
                id="alias-tooltip"
                role="tooltip"
                className="pointer-events-none invisible absolute bottom-full left-1/2 z-10 mb-2 w-64 -translate-x-1/2 rounded-lg bg-zinc-900 px-3 py-2 text-xs leading-relaxed text-white opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100 dark:bg-zinc-100 dark:text-zinc-900"
              >
                Pick a memorable ending like <span className="font-mono">/my-link</span>{" "}
                (3–32 letters, numbers, hyphens, or underscores). Leave blank for an
                auto-generated code.
              </span>
            </span>
          </div>
          <div className="flex items-stretch overflow-hidden rounded-lg border border-zinc-300 bg-white transition focus-within:border-zinc-900 focus-within:ring-2 focus-within:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:focus-within:border-zinc-100 dark:focus-within:ring-zinc-100/10">
            <span className="flex select-none items-center border-r border-zinc-200 bg-zinc-50 px-3 font-mono text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
              /
            </span>
            <input
              id="alias"
              type="text"
              placeholder="e.g. my-portfolio"
              pattern="[A-Za-z0-9_\-]{3,32}"
              title="3-32 characters: letters, numbers, - or _"
              autoComplete="off"
              spellCheck={false}
              aria-describedby="alias-help"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              className="w-full min-w-0 bg-transparent px-3 py-2.5 text-sm outline-none"
            />
          </div>
          <p id="alias-help" className="mt-1.5 text-xs text-zinc-500">
            Create your own custom short link instead of a random code — leave blank
            to auto-generate.
          </p>
        </div>
        <div>
          <label htmlFor="expiry" className="mb-1.5 block text-sm font-medium">
            Expires <span className="font-normal text-zinc-500">(optional)</span>
          </label>
          <input
            id="expiry"
            type="datetime-local"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className={inputClass}
          />
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setExpiry(toLocalInputValue(new Date(Date.now() + p.ms)))}
                className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
              >
                {p.label}
              </button>
            ))}
            {expiry && (
              <button
                type="button"
                onClick={() => setExpiry("")}
                className="px-1.5 py-1 text-xs text-zinc-500 underline-offset-2 hover:underline"
              >
                Never expire
              </button>
            )}
          </div>
          <p className="mt-1.5 text-xs text-zinc-500">
            After this time the link stops redirecting and shows an expired page.
          </p>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {loading ? "Shortening..." : "Shorten URL"}
        </button>
      </form>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {result && (
        <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            Your short link
          </p>
          <div className="mt-2 flex items-center gap-2">
            <a
              href={result.shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 truncate font-mono text-sm font-medium text-emerald-900 underline-offset-2 hover:underline dark:text-emerald-100"
            >
              {result.shortUrl}
            </a>
            <button
              type="button"
              onClick={copy}
              className="shrink-0 rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900 dark:text-emerald-100"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="mt-2 truncate text-xs text-emerald-800/70 dark:text-emerald-200/70">
            → {result.url}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-emerald-300 bg-white px-2 py-0.5 font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
              Active
            </span>
            <span className="text-emerald-800/80 dark:text-emerald-200/80">
              {result.expiresAt
                ? `Expires ${formatDateTime(result.expiresAt)}`
                : "Never expires"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
