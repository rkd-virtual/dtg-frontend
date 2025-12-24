// frontend/app/api/auth/verify-email/route.ts
import { NextResponse } from "next/server";

const FLASK_API = process.env.FLASK_API_URL || "http://127.0.0.1:5000";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // optional debug log (Visible in Next server console)
    console.log("[/api/auth/verify-email] proxy ->", `${FLASK_API}/api/auth/verify-email`, "body:", body);

    const backendRes = await fetch(`${FLASK_API}/api/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // credentials: 'include' if you need to forward cookies
    });

    const text = await backendRes.text();
    const contentType = backendRes.headers.get("content-type") || "application/json";

    return new NextResponse(text, {
      status: backendRes.status,
      headers: { "Content-Type": contentType },
    });
  } catch (err: any) {
    console.error("verify-email proxy error:", err);
    return NextResponse.json({ message: "Proxy error", error: String(err) }, { status: 500 });
  }
}
