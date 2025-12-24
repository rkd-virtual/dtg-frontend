// frontend/app/verify-email-sent/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Link from "next/link";
import { Mail } from "lucide-react";
import { postApi } from "@/lib/apiClient";

export default function VerifyEmailSentPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [serverMsg, setServerMsg] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    try {
      const pending = sessionStorage.getItem("pendingEmail") || sessionStorage.getItem("pendingEmailLocal");
      setEmail(pending || null);
    } catch {
      setEmail(null);
    }
  }, []);

  useEffect(() => {
    if (!showPopup) return;
    const t = setTimeout(() => setShowPopup(false), 3500);
    return () => clearTimeout(t);
  }, [showPopup])

  // JSX toast (place above Card or at root of return)
{showPopup && (
  <div className="fixed inset-x-0 top-6 flex items-center justify-center pointer-events-none z-50">
    <div className="pointer-events-auto bg-white border border-amber-200 shadow p-3 rounded-md text-sm">
      <strong className="block text-amber-700 mb-1">Verification Sent</strong>
      <div className="text-amber-700">{serverMsg || "A new verification link was sent to your email."}</div>
    </div>
  </div>
)}

  const handleResend = async () => {
  if (!email) {
    setServerError("No email available to resend to.");
    return;
  }

  setLoading(true);
  setServerError(null);
  setServerMsg(null);

  try {
    const data: any = await postApi("/auth/resend-verification", { email });

    // success: show popup / toast
    setServerMsg(data?.message || "Verification email resent.");
    setShowPopup(true);   // new UI state to show popup
    setResent(true);
  } catch (err: any) {
    console.error("RESEND ERROR:", err);
    const msg = err?.payload?.message || err?.message || "Failed to resend verification email";
    setServerError(msg);
  } finally {
    setLoading(false);
  }
}

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background to-muted/10">
      <div className="w-full max-w-xl">
        <Card className="rounded-xl shadow-md">
          <CardContent className="p-10 text-center">
            <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center">
              <Mail className="w-8 h-8 text-muted-foreground" />
            </div>

            <h2 className="text-2xl font-semibold mb-2">Verify your email to activate your account</h2>
            <p className="text-sm text-muted-foreground mb-6">
              We sent an email to
              <span className="block mt-2 text-base font-medium text-foreground">{email || "your email"}</span>
            </p>

            <p className="text-sm text-muted-foreground max-w-prose mx-auto mb-6">
              Just click on the link in that email to complete your signup. If you don't see it, you may need to check
              your spam folder.
            </p>

            {serverError && (
              <div className="mb-4 text-sm text-red-700 bg-red-50 p-3 rounded">{serverError}</div>
            )}

            {serverMsg && (
              <div className="mb-4 text-sm text-amber-900 bg-amber-50 p-3 rounded">{serverMsg}</div>
            )}

            <div className="space-y-3">
              <Button
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 rounded-md px-8 w-full"
                size="lg"
                onClick={handleResend}
                disabled={loading || resent}
              >
                {loading ? "Resending..." : resent ? "Verification Sent" : "Resend Verification Email"}
              </Button>

              <div className="text-center text-sm">
                Still can't find the email?{" "}
                <Link href="/log-in" className="text-primary underline">
                  Log In
                </Link>{" "}
                or <Link href="/" className="text-primary underline">return home</Link>.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
