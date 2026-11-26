import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { listLinks } from "@/lib/store";

export const metadata: Metadata = { title: "Stats · URL Shortener" };

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: process.env.DISPLAY_TIMEZONE || "Asia/Kolkata",
  });
}

async function LinksTable() {
  // Click data changes on every redirect, so always read it at request time.
  await connection();
  const links = await listLinks();
  const totalClicks = links.reduce((sum, l) => sum + l.clicks, 0);
  const expiredCount = links.filter((l) => l.expired).length;

  if (links.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
        No links yet. Create one on the home page.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Links</p>
          <p className="mt-1 text-2xl font-semibold">{links.length}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Total clicks</p>
          <p className="mt-1 text-2xl font-semibold">{totalClicks}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Active / expired</p>
          <p className="mt-1 text-2xl font-semibold">
            {links.length - expiredCount}
            <span className="text-zinc-400"> / {expiredCount}</span>
          </p>
        </div>
      </div>

      <ul className="space-y-4">
        {links.map((link) => {
          const recent = link.clickLog.slice(-5).reverse();
          const expired = link.expired;
          return (
            <li
              key={link.code}
              className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`/${link.code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-sm font-semibold hover:underline"
                  >
                    /{link.code}
                  </a>
                  {expired ? (
                    <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                      Expired
                    </span>
                  ) : (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                      Active
                    </span>
                  )}
                  </div>
                  <p className="mt-1 truncate text-sm text-zinc-500" title={link.url}>
                    {link.url}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Created {formatDate(link.createdAt)}
                    {" · "}
                    {link.expiresAt
                      ? `${expired ? "Expired" : "Expires"} ${formatDate(link.expiresAt)}`
                      : "Never expires"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-2xl font-semibold">{link.clicks}</p>
                  <p className="text-xs text-zinc-500">
                    {link.clicks === 1 ? "click" : "clicks"}
                  </p>
                </div>
              </div>

              {recent.length > 0 && (
                <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-900">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Recent clicks
                  </p>
                  <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                    {recent.map((c, i) => (
                      <li key={`${c.at}-${i}`} className="flex justify-between gap-4">
                        <span>{formatDate(c.at)}</span>
                        <span className="truncate text-zinc-400" title={c.referrer ?? ""}>
                          {c.referrer || "direct"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function StatsPage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Stats</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Click counts and the latest visits for every short link.
      </p>
      <div className="mt-8">
        <Suspense
          fallback={<p className="text-sm text-zinc-500">Loading stats...</p>}
        >
          <LinksTable />
        </Suspense>
      </div>
    </div>
  );
}
