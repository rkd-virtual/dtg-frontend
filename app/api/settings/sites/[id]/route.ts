import { NextResponse } from "next/server";

const FLASK_BASE = (process.env.FLASK_API_URL || process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

function forwardHeaders(req: Request) {
  const h: Record<string, string> = { accept: "application/json" };
  const cookie = req.headers.get("cookie");
  if (cookie) h["cookie"] = cookie;
  const auth = req.headers.get("authorization");
  if (auth) h["authorization"] = auth;
  const ct = req.headers.get("content-type");
  if (ct) h["content-type"] = ct;
  return h;
}

export async function DELETE(req: Request, { params }: any) {
  const id = params.id;
  const flaskUrl = `${FLASK_BASE}/api/user/sites/${id}`;
  console.log(`[proxy] Forwarding DELETE to: ${flaskUrl}`);

  try {
    const flaskRes = await fetch(flaskUrl, {
      method: "DELETE",
      headers: forwardHeaders(req),
    });

    const text = await flaskRes.text();
    const contentType = flaskRes.headers.get("content-type") ?? undefined;

    return new NextResponse(text || null, {
      status: flaskRes.status,
      headers: contentType ? { "content-type": contentType } : undefined,
    });
  } catch (err) {
    console.error("[proxy] DELETE fetch error:", err);
    return NextResponse.json({ error: "proxy_delete_failed", detail: String(err) }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET,POST,DELETE,PATCH,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
    },
  });
}
