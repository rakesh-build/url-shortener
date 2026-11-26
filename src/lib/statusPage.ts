/**
 * Tiny self-contained HTML pages for the redirect route handler, which can't
 * render React. Styled to match the app (zinc palette, light/dark).
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type StatusPageOptions = {
  status: number;
  badge: string;
  title: string;
  message: string;
  detail?: string;
};

export function statusPage({ status, badge, title, message, detail }: StatusPageOptions): Response {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>${escapeHtml(title)} · URL Shortener</title>
<style>
  :root { --bg:#fafafa; --fg:#18181b; --muted:#71717a; --card:#fff; --border:#e4e4e7; --btn:#18181b; --btnfg:#fff; --badgebg:#fef2f2; --badgefg:#b91c1c; --badgeborder:#fecaca; }
  @media (prefers-color-scheme: dark) { :root { --bg:#09090b; --fg:#f4f4f5; --muted:#a1a1aa; --card:#09090b; --border:#27272a; --btn:#f4f4f5; --btnfg:#18181b; --badgebg:#450a0a; --badgefg:#fca5a5; --badgeborder:#7f1d1d; } }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; background:var(--bg); color:var(--fg); font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; -webkit-font-smoothing:antialiased; }
  .card { width:100%; max-width:420px; background:var(--card); border:1px solid var(--border); border-radius:14px; padding:32px; text-align:center; box-shadow:0 1px 2px rgba(0,0,0,.04); }
  .badge { display:inline-block; font-size:12px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; padding:4px 10px; border-radius:999px; background:var(--badgebg); color:var(--badgefg); border:1px solid var(--badgeborder); }
  h1 { margin:16px 0 8px; font-size:24px; letter-spacing:-.02em; }
  p { margin:0; color:var(--muted); font-size:14px; line-height:1.5; }
  .detail { margin-top:8px; font-size:13px; }
  .actions { margin-top:24px; display:flex; gap:8px; justify-content:center; flex-wrap:wrap; }
  a.btn { display:inline-block; text-decoration:none; font-size:14px; font-weight:500; padding:10px 16px; border-radius:8px; background:var(--btn); color:var(--btnfg); }
  a.ghost { background:transparent; color:var(--fg); border:1px solid var(--border); }
</style>
</head>
<body>
  <main class="card">
    <span class="badge">${escapeHtml(badge)}</span>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(message)}</p>
    ${detail ? `<p class="detail">${escapeHtml(detail)}</p>` : ""}
    <div class="actions">
      <a class="btn" href="/">Create a new short link</a>
      <a class="btn ghost" href="/stats">View stats</a>
    </div>
  </main>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
