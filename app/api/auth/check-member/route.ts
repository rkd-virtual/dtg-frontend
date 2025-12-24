// frontend/app/api/auth/check-member/route.ts
import { NextResponse } from "next/server";

const FLASK_API = process.env.FLASK_API_URL || "http://127.0.0.1:5000";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("[/api/auth/check-member] proxy ->", `${FLASK_API}/api/auth/check-member`, "body:", body);

    const backendRes = await fetch(`${FLASK_API}/api/auth/check-member`, {
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
    console.error("check-member proxy error:", err);
    return NextResponse.json({ message: "Proxy error", error: String(err) }, { status: 500 });
  }
}
