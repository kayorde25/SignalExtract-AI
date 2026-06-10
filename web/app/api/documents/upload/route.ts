import { NextRequest, NextResponse } from "next/server";

const BACKEND = (process.env.BACKEND_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");
const API_KEY = process.env.API_KEY ?? "";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const headers: HeadersInit = {};
    if (API_KEY) headers["x-api-key"] = API_KEY;

    const res = await fetch(`${BACKEND}/api/v1/documents/upload`, {
      method: "POST",
      headers,
      body: formData,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Upload proxy error:", err);
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}
