// app/api/auth/sites/route.ts
import { NextRequest, NextResponse } from "next/server";

const FLASK_API = process.env.FLASK_API_URL!;

export async function GET(req: NextRequest) {
  const cookie = req.headers.get("cookie");

  if (!cookie) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const res = await fetch(`${FLASK_API}/api/auth/sites`, {
    headers: {
      cookie, 
    },
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
