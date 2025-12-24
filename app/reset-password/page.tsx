// frontend/app/reset-password/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Link from "next/link";
import { Lock } from "lucide-react";
import { postApi } from "@/lib/apiClient";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string>("");
  const [code, setCode] = useState<string>(""); // 6 digit
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverMsg, setServerMsg] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    try {
      const pending = sessionStorage.getItem("pendingEmail") || sessionStorage.getItem("pendingEmailLocal");
      if (pending) setEmail(pending);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!toastVisible) return;
    const t = setTimeout(() => setToastVisible(false), 3000);
    return () => clearTimeout(t);
  }, [toastVisible]);

  // validations
  const codeValid = /^\d{6}$/.test(code);
  const passwordValid = password.length >= 8;
  const passwordsMatch = password === confirmPassword && passwordValid;
  const formValid = !!email && codeValid && passwordValid && passwordsMatch && !submitting;

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setServerError(null);
    setServerMsg(null);

    if (!formValid) {
      setServerError("Please fix the errors before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      // Note: postApi should map to your API prefix (/api) — adjust path if needed
      const data: any = await postApi("/auth/reset-password", {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        new_password: password,
      });

      setServerMsg(data?.message || "Password reset successful. Redirecting to login...");
      setToastVisible(true);

      // clear pending email
      try {
        sessionStorage.removeItem("pendingEmail");
        sessionStorage.removeItem("pendingEmailLocal");
      } catch {}

      // short delay so user sees confirmation
      setTimeout(() => {
        router.push("/log-in");
      }, 1200);
    } catch (err: any) {
      // postApi should throw with helpful payload; fallback to generic
      const msg = err?.payload?.message || err?.message || "Failed to reset password";
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background to-muted/10">
      {toastVisible && (
        <div className="fixed inset-x-0 top-6 flex items-center justify-center pointer-events-none z-50">
          <div className="pointer-events-auto bg-white border border-amber-200 shadow p-3 rounded-md text-sm">
            <strong className="block text-amber-700 mb-1">Success</strong>
            <div className="text-amber-700">{serverMsg || "Password reset successful."}</div>
          </div>
        </div>
      )}

      <div className="w-full max-w-xl">
        <Card className="rounded-xl shadow-md">
          <CardHeader>
            <div className="flex flex-col items-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center">
                <Lock className="w-7 h-7 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-semibold">Reset your password</h2>
              <p className="text-sm text-muted-foreground mt-2">Enter the 6-digit code we sent and choose a new password.</p>
            </div>
          </CardHeader>

          <CardContent className="p-8">
            <form onSubmit={handleSubmit} noValidate>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@amazon.com"
                autoComplete="email"
                className="w-full px-3 py-2 border rounded mb-3 focus:outline-none focus:ring-2 border-gray-300 ring-indigo-50"
                required
              />

              <label className="block text-sm font-medium text-muted-foreground mb-2">Reset Code (6 digits)</label>
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className={`w-full px-3 py-2 border rounded mb-1 focus:outline-none focus:ring-2 ${code && !codeValid ? "border-red-400 ring-red-100" : "border-gray-300 ring-indigo-50"}`}
                required
              />
              {!codeValid && code.length > 0 && <div className="text-sm text-red-600 mb-2">Code must be 6 digits.</div>}

              <label className="block text-sm font-medium text-muted-foreground mb-2">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                className={`w-full px-3 py-2 border rounded mb-1 focus:outline-none focus:ring-2 ${password && !passwordValid ? "border-red-400 ring-red-100" : "border-gray-300 ring-indigo-50"}`}
                required
              />
              {!passwordValid && password.length > 0 && <div className="text-sm text-red-600 mb-2">Password must be at least 8 characters.</div>}

              <label className="block text-sm font-medium text-muted-foreground mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                autoComplete="new-password"
                className={`w-full px-3 py-2 border rounded mb-3 focus:outline-none focus:ring-2 ${confirmPassword && !passwordsMatch ? "border-red-400 ring-red-100" : "border-gray-300 ring-indigo-50"}`}
                required
              />
              {!passwordsMatch && confirmPassword.length > 0 && <div className="text-sm text-red-600 mb-2">Passwords do not match.</div>}

              {serverError && <div className="mb-3 text-sm text-red-700 bg-red-50 p-3 rounded">{serverError}</div>}

              <div className="mt-4 space-y-3">
                <Button
                  type="submit"
                  className="w-full h-10 rounded-md bg-primary text-primary-foreground"
                  disabled={!formValid}
                >
                  {submitting ? "Resetting…" : "Reset Password"}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  Remembered your password?{" "}
                  <Link href="/log-in" className="underline text-primary">
                    Log in
                  </Link>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
