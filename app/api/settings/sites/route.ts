// frontend/app/api/settings/sites/route.ts
import { NextResponse } from "next/server";

const FLASK_BASE = (process.env.FLASK_API_URL || process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

function forwardHeaders(req: Request) {
  const headers: Record<string, string> = {
    accept: "application/json",
  };
  const cookie = req.headers.get("cookie");
  if (cookie) headers["cookie"] = cookie;
  const auth = req.headers.get("authorization");
  if (auth) headers["authorization"] = auth;
  const contentType = req.headers.get("content-type");
  if (contentType) headers["content-type"] = contentType;
  return headers;
}

export async function GET(req: Request) {
  if (!FLASK_BASE) return NextResponse.json({ error: "flask_base_not_configured" }, { status: 500 });
  const flaskUrl = `${FLASK_BASE}/api/user/sites`;
  const flaskRes = await fetch(flaskUrl, { method: "GET", headers: forwardHeaders(req) });
  const text = await flaskRes.text();
  return new NextResponse(text, { status: flaskRes.status, headers: { "content-type": flaskRes.headers.get("content-type") ?? "application/json" } });
}

export async function POST(req: Request) {
  if (!FLASK_BASE) return NextResponse.json({ error: "flask_base_not_configured" }, { status: 500 });
  const flaskUrl = `${FLASK_BASE}/api/user/sites`;
  // forward raw body so JSON stays intact
  const body = await req.text();
  const flaskRes = await fetch(flaskUrl, { method: "POST", headers: forwardHeaders(req), body });
  const text = await flaskRes.text();
  return new NextResponse(text, { status: flaskRes.status, headers: { "content-type": flaskRes.headers.get("content-type") ?? "application/json" } });
}

/* optional OPTIONS handler to reduce preflight issues */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
    },
  });
}
