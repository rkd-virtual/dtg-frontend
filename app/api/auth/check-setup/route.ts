// frontend/app/api/auth/check-setup/route.ts
import { NextResponse } from "next/server";

const FLASK_API = process.env.FLASK_API_URL || "http://127.0.0.1:5000";

/**
 * For robustness we support both GET (querystring) and POST (JSON body).
 * The frontend sometimes uses GET with ?member=... and sometimes POST with { token }.
 */

export async function GET(req: Request) {
  try {
    // forward full path + query to Flask (preserve querystring)
    // req.url looks like http://localhost:3000/api/auth/check-setup?member=...
    const rawUrl = new URL((req as any).url);
    const qs = rawUrl.search || "";
    const backendUrl = `${FLASK_API}/api/auth/check-setup${qs}`;

    const backendRes = await fetch(backendUrl, { method: "GET" });
    const text = await backendRes.text();
    const contentType = backendRes.headers.get("content-type") || "application/json";

    return new NextResponse(text, {
      status: backendRes.status,
      headers: { "Content-Type": contentType },
    });
  } catch (err: any) {
    console.error("check-setup GET proxy error:", err);
    return NextResponse.json({ message: "Proxy error", error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const backendRes = await fetch(`${FLASK_API}/api/auth/check-setup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await backendRes.text();
    const contentType = backendRes.headers.get("content-type") || "application/json";

    return new NextResponse(text, {
      status: backendRes.status,
      headers: { "Content-Type": contentType },
    });
  } catch (err: any) {
    console.error("check-setup POST proxy error:", err);
    return NextResponse.json({ message: "Proxy error", error: String(err) }, { status: 500 });
  }
}
