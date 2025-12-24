// frontend/app/forgot-password/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Mail } from "lucide-react";
import { postApi } from "@/lib/apiClient";
import styles from "./styles.module.css";
import Image from "next/image";
// small debounce hook
function useDebounce<T>(value: T, delay = 400) {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string>("");
  const [status, setStatus] = useState<{ state: string; message?: string }>({
    state: "idle",
  });
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [sending, setSending] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  const debouncedEmail = useDebounce(email, 400);

  useEffect(() => {
    const e = (debouncedEmail || "").trim().toLowerCase();

    if (!e) {
      setStatus({ state: "idle" });
      return;
    }

    const at = e.indexOf("@") > 0;
    const dotAfterAt = e.indexOf(".") > e.indexOf("@");
    const isFmt = at && dotAfterAt;

    if (!isFmt) {
      setStatus({
        state: "invalid_format",
        message: "Please enter a valid email",
      });
      return;
    }

    let aborted = false;

    async function check() {
      setLoadingCheck(true);
      setStatus({ state: "checking", message: "Checking email..." });
      try {
        const json: any = await postApi("/auth/check-member", { email: e });

        if (aborted) return;

        if (json && typeof json.allowed !== "undefined") {
          if (json.allowed) {
            setStatus({
              state: "ok",
              message: "Email verified — you can reset password",
            });
          } else {
            setStatus({
              state: "blocked",
              message:
                json.message ||
                "This email cannot reset password right now",
            });
          }
        } else {
          setStatus({ state: "ok", message: "OK" });
        }
      } catch (err: any) {
        if (aborted) return;
        setStatus({
          state: "error",
          message:
            err?.payload?.message || "Could not validate email right now",
        });
      } finally {
        if (!aborted) setLoadingCheck(false);
      }
    }

    check();
    return () => {
      aborted = true;
    };
  }, [debouncedEmail]);

  const canReset = status.state === "ok" && !loadingCheck && !!email;

  useEffect(() => {
    if (!toastVisible) return;
    const t = setTimeout(() => setToastVisible(false), 3000);
    return () => clearTimeout(t);
  }, [toastVisible]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canReset || sending) return;
    setSending(true);
    setStatus({ state: "sending", message: "Sending reset code..." });

    try {
      const data: any = await postApi("/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });

      setStatus({
        state: "sent",
        message:
          data?.message ||
          "If the email exists, a reset code has been sent.",
      });
      setToastVisible(true);

      try {
        sessionStorage.setItem(
          "pendingEmail",
          email.trim().toLowerCase()
        );
      } catch {
        // ignore
      }

      setTimeout(() => {
        router.push("/reset-password");
      }, 1500);
    } catch (err: any) {
      setStatus({
        state: "error",
        message:
          err?.payload?.message ||
          err?.message ||
          "Failed to send reset code",
      });
    } finally {
      setSending(false);
    }
  };

  const isErrorState =
    status.state === "error" ||
    status.state === "blocked" ||
    status.state === "invalid_format";

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4">
      {toastVisible && (
        <div className="fixed inset-x-0 top-6 flex items-center justify-center pointer-events-none z-50">
          <div className="pointer-events-auto bg-white border border-amber-200 shadow p-3 rounded-md text-sm">
            <strong className="block text-amber-700 mb-1">
              Reset Requested
            </strong>
            <div className="text-amber-700">
              {status.message ||
                "If the email exists, a reset code has been sent."}
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-4xl grid md:grid-cols-2 bg-card border rounded-2xl shadow-lg overflow-hidden">
        {/* Left side / intro (desktop only) */}
        <div className="hidden md:flex flex-col justify-center gap-4 bg-gradient-to-br from-primary/10 to-primary/5 px-10 py-12">
          <div className="h-14 w-14 rounded-full bg-background/70 flex items-center justify-center shadow">
            {/* <img src="/DTG_Logo copy.svg" alt="Logo" width={48} height={48} className={`flex-shrink-0 ${styles.pageLogo}`} /> */}
            <Image src="/DTG_Logo.svg" alt="DTG" className={`flex-shrink-0 ${styles.pageLogo}`} width={48} height={48} />
          </div>
          <h1 className="text-2xl font-semibold leading-snug">
            Forgot your password?
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter the Amazon email address linked to your account and
            we&apos;ll send you a secure reset link.
          </p>
        </div>

        {/* Right side / form */}
        <div className="px-6 py-8 sm:px-10 sm:py-12">
          {/* Mobile header (since left panel is hidden) */}
          <div className="mb-6 md:hidden flex flex-col gap-2">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Mail className="w-5 h-5 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold leading-snug">
              Enter your email to reset your password
            </h2>
            <p className="text-sm text-muted-foreground">
              Enter the Amazon email address associated with your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-muted-foreground">
                Amazon Email Address
              </label>
              <Input
                type="email"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                placeholder="you@amazon.com"
                autoComplete="email"
                className={
                  isErrorState
                    ? "border-red-400 focus-visible:ring-red-200"
                    : ""
                }
              />
              {status.message && (
                <p
                  className={`text-sm ${
                    status.state === "ok"
                      ? "text-green-600"
                      : status.state === "checking"
                      ? "text-gray-500"
                      : isErrorState
                      ? "text-red-600"
                      : "text-gray-500"
                  }`}
                >
                  {loadingCheck ? "Checking…" : status.message}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Button
                type="submit"
                className="w-full h-10 rounded-md"
                disabled={!canReset || sending}
              >
                {sending ? "Sending…" : "Reset Password"}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/log-in" className="underline text-primary">
                  Create an account
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
