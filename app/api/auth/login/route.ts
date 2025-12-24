// frontend/app/api/auth/login/route.ts
import { NextResponse } from "next/server";

const FLASK_API = process.env.FLASK_API_URL || "http://127.0.0.1:5000";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    console.log("[/api/auth/login] Proxying to:", `${FLASK_API}/api/auth/login`);
    
    // Forward credentials to Render backend
    const flaskRes = await fetch(`${FLASK_API}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include", // Include cookies from backend
    });

    const data = await flaskRes.json().catch(() => ({}));

    console.log("[/api/auth/login] Response status:", flaskRes.status);
    console.log("[/api/auth/login] Response data:", data);

    // If login failed, forward status & body
    if (!flaskRes.ok) {
      return NextResponse.json(data, { status: flaskRes.status });
    }

    // Extract token from backend response
    const token =
      data?.access_token ||
      data?.token ||
      data?.data?.access_token ||
      data?.data?.token;

    // Create response that includes token in body for frontend to read
    const res = NextResponse.json({ 
      ...data,
      access_token: token, // Ensure token is in response
    });

    // Also set as cookie for server-side requests
    if (token) {
      console.log('Token found')
      res.cookies.set({
        name: "access_token_cookie",
        value: token,
        httpOnly: true, // Frontend needs to read this
        path: "/",
        sameSite: "lax",
        secure: false, // true in production with HTTPS
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    return res;
  } catch (err: any) {
    console.error("[/api/auth/login] Error:", err);
    return NextResponse.json(
      { error: "server_error", message: String(err) },
      { status: 500 }
    );
  }
}