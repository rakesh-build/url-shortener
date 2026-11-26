import { NextResponse, type NextRequest } from "next/server";
import { recordClick } from "@/lib/store";
import { statusPage } from "@/lib/statusPage";

function formatExpiry(iso: string) {
  const timeZone = process.env.DISPLAY_TIMEZONE || "Asia/Kolkata";
  // dateStyle/timeStyle can't be combined with timeZoneName, so label it manually.
  const text = new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  });
  return `${text} (${timeZone === "Asia/Kolkata" ? "IST" : timeZone})`;
}

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/[code]">,
) {
  const { code } = await ctx.params;

  const result = await recordClick(code, {
    referrer: request.headers.get("referer"),
    userAgent: request.headers.get("user-agent"),
  });

  if (result.status === "missing") {
    return statusPage({
      status: 404,
      badge: "Not found",
      title: "Short link not found",
      message: `There is no link for /${code}. It may have been mistyped.`,
    });
  }

  if (result.status === "expired") {
    return statusPage({
      status: 410,
      badge: "Expired",
      title: "Link expired",
      message: `The short link /${code} has expired and no longer redirects.`,
      detail: result.record.expiresAt
        ? `Expired on ${formatExpiry(result.record.expiresAt)}`
        : undefined,
    });
  }

  const res = NextResponse.redirect(result.record.url, 301);
  // A 301 is cached by browsers, which would skip future click counts.
  // no-store keeps analytics accurate while still being a permanent redirect.
  res.headers.set("cache-control", "no-store");
  return res;
}
