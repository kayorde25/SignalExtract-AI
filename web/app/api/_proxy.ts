import { NextRequest, NextResponse } from "next/server";

const BACKEND = (process.env.BACKEND_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");
const API_KEY = process.env.API_KEY ?? "";

function backendHeaders(): HeadersInit {
  const h: HeadersInit = {};
  if (API_KEY) h["x-api-key"] = API_KEY;
  return h;
}

export async function proxyRequest(
  req: NextRequest,
  backendPath: string,
  overrideInit?: RequestInit,
): Promise<NextResponse> {
  const url = new URL(req.url);
  const upstream = `${BACKEND}/api/v1${backendPath}${url.search}`;

  try {
    const init: RequestInit = {
      method: req.method,
      headers: { ...backendHeaders() },
      ...overrideInit,
    };

    // Forward body for non-GET/HEAD requests (skip for FormData — handled by caller)
    if (!["GET", "HEAD"].includes(req.method) && !overrideInit?.body) {
      const ct = req.headers.get("content-type") ?? "";
      if (ct.includes("application/json")) {
        (init.headers as Record<string, string>)["content-type"] = "application/json";
        init.body = await req.text();
      }
    }

    const res = await fetch(upstream, init);
    const ct = res.headers.get("content-type") ?? "application/json";
    const body = await res.arrayBuffer();

    return new NextResponse(body, {
      status: res.status,
      headers: {
        "content-type": ct,
        ...(res.headers.get("content-disposition")
          ? { "content-disposition": res.headers.get("content-disposition")! }
          : {}),
      },
    });
  } catch (err) {
    console.error(`Proxy error → ${upstream}:`, err);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}
