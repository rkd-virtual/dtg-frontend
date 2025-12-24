// frontend/app/log-in/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { postApi } from "@/lib/apiClient";

// =========================
// Validation Schemas
// =========================
const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

const signupSchema = z
  .object({
    first_name: z.string().min(2, "First name is required"),
    last_name: z.string().min(2, "Last name is required"),
    email: z
      .string()
      .email({ message: "Invalid email address" })
      .refine(
        (val) => val.endsWith("@dtgpower.com") || val.endsWith("@amazon.com"),
        { message: "Only @dtgpower.com or @amazon.com emails are allowed" }
      ),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    confirmPassword: z.string().min(8, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function LogInPage() {
  const router = useRouter();

  // Shared UI state
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Signup state (controlled)
  const [tabValue, setTabValue] = useState<"login" | "signup">("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);

  // Derived / UX
  const emailDomainInvalid =
    !!email &&
    !(email.endsWith("@dtgpower.com") || email.endsWith("@amazon.com"));

  useEffect(() => {
    // clear server messages when user changes inputs
    setServerError("");
  }, [email, firstName, lastName, password, confirmPassword]);

  // =========================
  // LOGIN
  // =========================
  const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  if (loading) return;

  setServerError("");
  setErrors({});
  setLoading(true);

  // 1. Client-side validation
  const parsed = loginSchema.safeParse({
    email: loginEmail.trim().toLowerCase(),
    password: loginPassword,
  });

  if (!parsed.success) {
    const map: Record<string, string> = {};
    parsed.error.issues.forEach((i) => {
      map[i.path[0].toString()] = i.message;
    });
    setErrors(map);
    setLoading(false);
    return;
  }

  // 2. API call via Next proxy (no CORS)
  try {
    const data: any = await postApi("/auth/login", {
      email: loginEmail.trim().toLowerCase(),
      password: loginPassword,
    });

    // 3. Extract token (supports multiple shapes from backend)
    const token =
      data?.data?.access_token ||
      data?.data?.token ||
      data?.access_token ||
      data?.token;

    if (token) {
      try {
        if (rememberMe) {
          localStorage.setItem("jwt_token", token);
        } else {
          localStorage.removeItem("jwt_token");
        }
      } catch {
        /* ignore localStorage errors */
      }
    }

    // 4. Redirect
    router.push("/portal/dashboard");
  } catch (err: any) {
    console.error("LOGIN ERROR:", err);

    // postApi throws structured error: { message, status, payload }
    const message =
      err?.payload?.message || err?.payload?.error || err?.message || "Login failed";

    setServerError(message);
  } finally {
    setLoading(false);
  }
};

  // =========================
  // SIGNUP
  // =========================
  const handleSignup = async (e: React.FormEvent) => {
  e.preventDefault();
  if (loading) return;

  setServerError("");
  setErrors({});
  setLoading(true);

  const payloadForParse = {
    first_name: firstName.trim(),
    last_name: lastName.trim(),
    email: email.trim().toLowerCase(),
    password,
    confirmPassword,
  };

  // client-side validation
  const parsed = signupSchema.safeParse(payloadForParse);
  if (!parsed.success) {
    const map: Record<string, string> = {};
    parsed.error.issues.forEach((i) => {
      const key = i.path[0] ? i.path[0].toString() : "form";
      map[key] = i.message;
    });
    setErrors(map);
    setLoading(false);
    return;
  }

  // ensure terms are checked
  if (!termsChecked) {
    setErrors({ terms: "You must agree to the Terms of Service and Privacy Policy" });
    setLoading(false);
    return;
  }

  try {
    // postApi returns parsed body or throws structured error
    const data: any = await postApi("/auth/signup", {
      first_name: payloadForParse.first_name,
      last_name: payloadForParse.last_name,
      email: payloadForParse.email,
      password: payloadForParse.password,
    });

    // success path: backend returned successfully
    try {
      sessionStorage.setItem("pendingEmail", payloadForParse.email);
    } catch {
      /* ignore storage errors */
    }

    router.push("/verify-email-sent");
  } catch (err: any) {
    console.error("SIGNUP ERROR:", err);

    // If backend returned 422 with field errors, postApi will throw with err.status and err.payload
    if (err?.status === 422 && err?.payload?.errors && typeof err.payload.errors === "object") {
      setErrors(err.payload.errors);
    } else {
      // prefer backend message if present
      const message =
        err?.payload?.message || err?.payload?.error || err?.message || "Signup failed";
      setServerError(message);
    }
  } finally {
    setLoading(false);
  }
};

  // =========================
  // UI
  // =========================
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted/20">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Welcome</h1>
          <p className="text-muted-foreground">Log in to access DTG's Amazon Portal</p>
        </div>

        <Tabs
          value={tabValue}
          onValueChange={(v) => setTabValue(v as "login" | "signup")}
          defaultValue="login"
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          {/* =================== LOGIN TAB =================== */}
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>Enter your credentials</CardDescription>
              </CardHeader>

              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  {serverError && (
                    <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{serverError}</p>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="name@example.com"
                      aria-label="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                    />
                    {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        aria-label="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-pressed={showPassword}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOffIcon className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <EyeIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2">
                      <input
                        id="remember"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">Remember me</span>
                    </label>

                    <Link href="/forgot-password" className="px-0 text-sm text-muted-foreground">
                      Forgot password?
                    </Link>
                  </div>
                </CardContent>

                <CardFooter>
                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? "Signing In..." : "Sign In"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          {/* =================== SIGNUP TAB =================== */}
          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Create an account</CardTitle>
                <CardDescription>Enter your information</CardDescription>
              </CardHeader>

              <form onSubmit={handleSignup}>
                <CardContent className="space-y-4">
                  {serverError && (
                    <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{serverError}</p>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first-name">First name</Label>
                      <Input
                        id="first-name"
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                      {errors.first_name && <p className="text-xs text-red-600">{errors.first_name}</p>}
                    </div>
                    <div>
                      <Label htmlFor="last-name">Last name</Label>
                      <Input
                        id="last-name"
                        placeholder="Doe"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                      {errors.last_name && <p className="text-xs text-red-600">{errors.last_name}</p>}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="e.g. yourname@amazon.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    {errors.email ? (
                      <p className="text-xs text-red-600">{errors.email}</p>
                    ) : emailDomainInvalid ? (
                      <p className="text-xs text-red-600">
                        Please note: ONLY dtgpower.com and amazon.com domains are allowed.
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showSignupPassword ? "text" : "password"}
                        placeholder="Create a password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        aria-pressed={showSignupPassword}
                      >
                        {showSignupPassword ? (
                          <EyeOffIcon className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <EyeIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Must be longer than 8 characters.</p>
                    {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
                  </div>

                  <div>
                    <Label htmlFor="confirm-password">Confirm password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-pressed={showConfirmPassword}
                      >
                        {showConfirmPassword ? (
                          <EyeOffIcon className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <EyeIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    {errors.confirmPassword && <p className="text-xs text-red-600">{errors.confirmPassword}</p>}
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      id="terms"
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={termsChecked}
                      onChange={(e) => setTermsChecked(e.target.checked)}
                    />
                    <Label htmlFor="terms" className="text-sm font-normal cursor-pointer">
                      I agree to the{" "}
                      <Button variant="link" className="px-0 text-sm h-auto" type="button">
                        Terms of Service
                      </Button>{" "}
                      and{" "}
                      <Button variant="link" className="px-0 text-sm h-auto" type="button">
                        Privacy Policy
                      </Button>
                    </Label>
                  </div>
                  {errors.terms && <p className="text-xs text-red-600">{errors.terms}</p>}
                </CardContent>

                <CardFooter>
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={loading || !termsChecked}
                  >
                    {loading ? "Creating..." : "Create Account"}
                  </Button>
                </CardFooter>
              </form>
            </Card>

            <p className="mt-3 text-center text-sm">
              Already have an account?{" "}
              <Link href="#" onClick={() => setTabValue("login")} className="text-primary">
                Log In
              </Link>
            </p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
