import { NextResponse, type NextRequest } from "next/server";
import {
  StoreError,
  createLink,
  normalizeUrl,
  parseExpiresAt,
} from "@/lib/store";

function baseUrl(request: NextRequest): string {
  const fromEnv = process.env.BASE_URL?.replace(/\/+$/, "");
  return fromEnv || request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }

  const { url, alias, expiresAt } = (body ?? {}) as {
    url?: unknown;
    alias?: unknown;
    expiresAt?: unknown;
  };

  if (typeof url !== "string") {
    return NextResponse.json({ error: "A URL is required." }, { status: 400 });
  }
  const normalized = normalizeUrl(url);
  if (!normalized) {
    return NextResponse.json(
      { error: "Enter a valid http:// or https:// URL." },
      { status: 400 },
    );
  }

  const cleanAlias =
    typeof alias === "string" && alias.trim() ? alias.trim() : undefined;

  if (alias !== undefined && alias !== null && typeof alias !== "string") {
    return NextResponse.json({ error: "Alias must be text." }, { status: 400 });
  }

  try {
    const expiry = parseExpiresAt(expiresAt);
    const { code, record } = await createLink(normalized, cleanAlias, expiry);
    return NextResponse.json(
      {
        code,
        url: record.url,
        shortUrl: `${baseUrl(request)}/${code}`,
        createdAt: record.createdAt,
        expiresAt: record.expiresAt ?? null,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof StoreError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
