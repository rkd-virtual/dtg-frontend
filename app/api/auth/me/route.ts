import { NextResponse } from "next/server";

const FLASK_API = process.env.FLASK_API_URL || "http://127.0.0.1:5000";

export async function GET(request: Request) {
  try {
    // log incoming authorization/cookie for debugging
    const incomingAuth = request.headers.get("authorization") || "";
    const incomingCookie = request.headers.get("cookie") || "";
    //console.log("[/api/auth/me] incoming Authorization header:", incomingAuth);
    //console.log("[/api/auth/me] incoming cookie header:", incomingCookie ? incomingCookie : "(no cookie)");

    // Forward request to Flask with the cookie (if present)
    const flaskRes = await fetch(`${FLASK_API}/api/auth/me`, {
      method: "GET",
      headers: {
        ...(incomingAuth ? { Authorization: incomingAuth } : {}),
        ...(incomingCookie ? { cookie: incomingCookie } : {}),
      },
      credentials: "include",
    });

    const text = await flaskRes.text();
    //console.log("[/api/auth/me] flask status:", flaskRes.status, "body:", text);

    return new NextResponse(text, {
      status: flaskRes.status,
      headers: { "content-type": flaskRes.headers.get("content-type") || "application/json" },
    });
  } catch (err: any) {
    console.error("[/api/auth/me] error:", err);
    return NextResponse.json({ error: "server_error", message: String(err) }, { status: 500 });
  }
}