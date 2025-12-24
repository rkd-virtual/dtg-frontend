// frontend/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
const FLASK_API = process.env.FLASK_API_URL || "http://127.0.0.1:5000";

export async function POST(request: Request) {
  try {
    // Optionally notify Flask to revoke token
    await fetch(`${FLASK_API}/api/auth/logout`, {
      method: "POST",
      headers: { cookie: request.headers.get("cookie") || "" },
    }).catch(() => {});

    const res = NextResponse.json({ ok: true });
    res.cookies.set({
      name: "access_token_cookie",
      value: "",
      path: "/",
      httpOnly: true,
      expires: new Date(0),
    });
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: "server_error", message: String(err) }, { status: 500 });
  }
}
