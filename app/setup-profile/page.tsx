// frontend/app/setup-profile/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postApi, putApi, getApi } from "@/lib/apiClient";
import { Mail } from "lucide-react";
import styles from "./styles.module.css"; 
import Image from "next/image";

type FormState = {
  job_title: string;
  amazon_site: string; // comma-separated tags
  other_accounts: string;
};

export default function SetupProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Normalize token from URL so + and spaces survive email clients
  const tokenFromUrl = useMemo(() => {
    const raw = (searchParams?.get("member") as string) || "";
    return decodeURIComponent(raw).replace(/ /g, "+").trim();
  }, [searchParams]);

  const [setupToken, setSetupToken] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [initialEmailHint, setInitialEmailHint] = useState<string>("");

  // <-- new: user name coming from verify-email response
  const [userName, setUserName] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  const [form, setForm] = useState<FormState>({
    job_title: "",
    amazon_site: "",
    other_accounts: "",
  });

  const [checking, setChecking] = useState(false);
  const [memberOk, setMemberOk] = useState<boolean | null>(null);
  const [memberMsg, setMemberMsg] = useState<string>("");

  const debounceRef = useRef<number | null>(null);
  const SITES_API = process.env.NEXT_PUBLIC_SITES_AUTOCOMPLETE_API || "";

  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // NEW: control whether to show the setup form (backend tells us)
  const [showForm, setShowForm] = useState(true);
  const [setupStatusMsg, setSetupStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!showToast) return;
    const t = setTimeout(() => setShowToast(false), 3500);
    return () => clearTimeout(t);
  }, [showToast]);

  // Verify email token -> get setup_token + initial email hint
  useEffect(() => {
    const run = async () => {
      try {
        if (!tokenFromUrl) throw new Error("Missing token");
        // NOTE: The backend's /verify-email must be updated to handle the email string now
        // and return the secure token in data.setup_token.
        const data: any = await postApi("/auth/verify-email", { token: tokenFromUrl });

        const tokenForSetup = data?.setup_token || tokenFromUrl;
        setSetupToken(tokenForSetup);

        // server may return an email hint (which will now be the email passed in the URL, if temporary flow was used)
        setInitialEmailHint(data?.email || "");

        // server may return a user name (try common keys)
        const maybeName = data?.name || data?.full_name || data?.username || "";
        setUserName(maybeName || "");

      } catch (e: any) {
        console.error("verify-email error", e);
        setErr(e?.payload?.message || e?.message || "Invalid or expired link");
      } finally {
        setLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenFromUrl]);

  // If initialEmailHint is present, set email and run checkMember automatically
  useEffect(() => {
    if (!initialEmailHint) return;
    setEmail(initialEmailHint);
    // run check for the hinted email (non-blocking)
    checkMember(initialEmailHint).catch((e) => {
      // ignore errors here; checkMember already sets state on errors
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEmailHint]);

  // NEW: ask backend if this token/user may use the setup form
  useEffect(() => {
    // 🎯 Functional fix applied: Wait for loading to finish AND the secure token to be available
    if (loading || !setupToken) return;

    let mounted = true;

    async function checkSetupStatus() {
      try {
        // Use the secure setupToken
        const res: any = await getApi(`/auth/check-setup?member=${encodeURIComponent(setupToken)}`);

        // res.status expected: "invalid" | "pending_email" | "already_completed" | "allowed"
        if (!mounted) return;

        if (res.status === "already_completed") {
          setSetupStatusMsg("Your profile is already completed. Please log in.");
          setShowForm(false);
        } else if (res.status === "pending_email") {
          setSetupStatusMsg("Email not verified yet. Please check your inbox for the verification link.");
          setShowForm(false);
        } else if (res.status === "invalid") {
          setSetupStatusMsg("Invalid or expired verification link.");
          setShowForm(false);
        } else {
          // allowed - show the form
          setShowForm(true);
          setSetupStatusMsg(null);
        }
      } catch (err: any) {
        console.error("check-setup error", err);
        // If server/network error, block the form and show friendly message
        setSetupStatusMsg("Could not confirm verification status. Try again later.");
        setShowForm(false);
      }
    }

    checkSetupStatus();

    return () => {
      mounted = false;
    };
    // Dependency updated to run when token is ready AND loading is finished
  }, [setupToken, loading]); 

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // only allow editing when userName is not present
    if (userName) return;
    const v = (e.target.value || "").trim();
    setEmail(v);
    setMemberOk(null);
    setMemberMsg("");
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      checkMember(v);
    }, 600);
  };

  const checkMember = async (candidateEmail: string) => {
    if (!candidateEmail) {
      setMemberOk(false);
      setMemberMsg("Please enter your email.");
      return;
    }

    setChecking(true);
    setMemberOk(null);
    setMemberMsg("");

    try {
      const payload: any = { email: candidateEmail };
      if (setupToken) payload.token = setupToken;

      const data: any = await postApi("/auth/check-member", payload);
      if (!data) {
        setMemberOk(false);
        setMemberMsg("Unexpected server response.");
        return;
      }
      if (!data.exists) {
        setMemberOk(false);
        setMemberMsg(data.message || "This email isn't registered. Please sign up first.");
        return;
      }
      if (data.allowed) {
        setMemberOk(true);
        setMemberMsg("Email verified — you can complete your profile now.");
      } else {
        setMemberOk(false);
        setMemberMsg(data.message || "This email is not allowed to complete profile.");
      }
    } catch (err: any) {
      console.error("check-member error", err);
      setMemberOk(false);
      setMemberMsg(err?.payload?.message || err?.message || "Could not check email. Try again.");
    } finally {
      setChecking(false);
    }
  };

  //
  // Tag-style Autocomplete component for multiple Amazon Sites
  //
  const SitesTagAutocomplete: React.FC<{
    value: string; // comma-separated tags from parent
    onChange: (csv: string) => void;
    placeholder?: string;
    minChars?: number;
  }> = ({ value, onChange, placeholder, minChars = 1 }) => {
    const parseCsv = (csv: string) =>
      (csv || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

    const [tags, setTags] = useState<string[]>(() => parseCsv(value));
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [open, setOpen] = useState(false);
    const [loadingLocal, setLoadingLocal] = useState(false);

    useEffect(() => {
      const parsed = parseCsv(value);
      if (parsed.length !== tags.length || parsed.some((t, i) => tags[i] !== t)) {
        setTags(parsed);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    useEffect(() => {
      if (!query || query.length < minChars) {
        setSuggestions([]);
        setOpen(false);
        setLoadingLocal(false);
        return;
      }

      let mounted = true;
      const controller = new AbortController();
      setLoadingLocal(true);

      const id = window.setTimeout(async () => {
        try {
          if (!SITES_API) {
            if (mounted) {
              setSuggestions([]);
              setOpen(false);
            }
            return;
          }

          const url = SITES_API.includes("?")
            ? `${SITES_API}&q=${encodeURIComponent(query)}`
            : `${SITES_API}?q=${encodeURIComponent(query)}`;

          console.debug("autocomplete fetch:", url);

          const res = await fetch(url, { signal: controller.signal });
          if (!res.ok) {
            if (mounted) {
              setSuggestions([]);
              setOpen(false);
            }
            return;
          }

          const text = await res.text();
          let list: string[] = [];
          try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) list = parsed.map((x) => String(x));
          } catch {
            list = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
          }

          if (mounted) {
            const filtered = list.map((x) => x.trim()).filter(Boolean).filter((x) => !tags.includes(x));
            setSuggestions(filtered);
            setOpen(true);
          }
        } catch (err: any) {
          if (err.name === "AbortError") {
            // ignored
          } else {
            console.error("autocomplete fetch error", err);
            if (mounted) setSuggestions([]);
          }
        } finally {
          if (mounted) setLoadingLocal(false);
        }
      }, 250);

      return () => {
        mounted = false;
        controller.abort();
        clearTimeout(id);
      };
    }, [query, SITES_API, minChars, tags]);

    const commitTags = (nextTags: string[]) => {
      setTags(nextTags);
      onChange(nextTags.join(", "));
    };

    const addTag = (raw: string) => {
      const t = (raw || "").trim();
      if (!t) return;
      if (tags.includes(t)) {
        setQuery("");
        setSuggestions([]);
        setOpen(false);
        return;
      }
      const next = [...tags, t];
      commitTags(next);
      setQuery("");
      setSuggestions([]);
      setOpen(false);
    };

    const removeTagAt = (index: number) => {
      const next = tags.filter((_, i) => i !== index);
      commitTags(next);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (query) addTag(query);
        return;
      }
      if (e.key === ",") {
        e.preventDefault();
        if (query) addTag(query);
        return;
      }
      if (e.key === "Backspace" && query === "") {
        if (tags.length > 0) {
          removeTagAt(tags.length - 1);
        }
      }
      if (e.key === "ArrowDown" && suggestions.length > 0) {
        e.preventDefault();
        const first = document.querySelector<HTMLLIElement>(".sites-suggestion-list li");
        first?.focus();
      }
    };

    const selectSuggestion = (s: string) => {
      addTag(s);
    };

    return (
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2 border rounded px-2 py-1 min-h-[44px]">
          {tags.map((t, i) => (
            <div key={t + i} className="flex items-center bg-gray-100 rounded-full px-2 py-1 text-sm">
              <span className="mr-2">{t}</span>
              <button
                type="button"
                onClick={() => removeTagAt(i)}
                className="text-gray-500 hover:text-gray-800 focus:outline-none"
                aria-label={`Remove ${t}`}
              >
                ×
              </button>
            </div>
          ))}

          <input
            className="flex-1 min-w-[140px] outline-none py-2 px-1 text-sm"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            aria-expanded={open}
            aria-autocomplete="list"
          />
        </div>

        {open && (suggestions.length > 0 || loadingLocal) && (
          <ul
            className="absolute sites-suggestion-list z-50 mt-1 w-full bg-white border rounded shadow max-h-48 overflow-auto"
            role="listbox"
          >
            {loadingLocal && <li className="px-3 py-2 text-sm text-gray-500">Loading…</li>}
            {!loadingLocal &&
              suggestions.map((s) => (
                <li
                  key={s}
                  tabIndex={0}
                  className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                  onMouseDown={(ev) => {
                    ev.preventDefault();
                    selectSuggestion(s);
                  }}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter") {
                      ev.preventDefault();
                      selectSuggestion(s);
                    }
                  }}
                >
                  {s}
                </li>
              ))}

            {!loadingLocal && suggestions.length === 0 && <li className="px-3 py-2 text-sm text-gray-500">No results</li>}
          </ul>
        )}
      </div>
    );
  };

  // submit handler
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (memberOk !== true) {
      setErr("Please confirm your email before submitting.");
      return;
    }

    setSaving(true);
    setErr("");

    try {
      const payload = {
        token: setupToken,
        email,
        job_title: form.job_title,
        amazon_site: form.amazon_site,
        other_accounts: (form.other_accounts || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };

      /* SALES FORCE MEMBER UPDATE */
      const API_ROOT = process.env.NEXT_PUBLIC_SITES_API ?? "https://dtg-backend.onrender.com/api"
      const resp = await fetch(`${API_ROOT}/update-member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      await putApi("/auth/setup-profile", payload);     

      try {
        sessionStorage.removeItem("pendingEmail");
      } catch {}

      setToastMessage("Profile saved. Please log in to continue.");
      setShowToast(true);

      setTimeout(() => {
        router.push("/log-in");
      }, 800);
    } catch (err: any) {
      console.error("setup-profile save error", err);
      setErr(err?.payload?.message || err?.message || "Could not save profile");
      setToastMessage(err?.payload?.message || err?.message || "Could not save profile");
      setShowToast(true);
    } finally {
      setSaving(false);
    }
  };

  const inputsDisabled = memberOk !== true;

  // Loading states
  if (loading) {
    return <div className="mx-auto max-w-md rounded-2xl bg-white p-8 text-center shadow">Validating link…</div>;
  }

  // If backend told us not to show the form, short-circuit and show friendly message
  if (!showForm) {
    return (
      <div className="mx-auto max-w-md rounded-2xl bg-white p-8 text-center shadow">
        <h2 className="text-lg font-medium mb-3">Verification status</h2>
        <p className="mb-4 text-sm text-gray-700">{setupStatusMsg || "You cannot complete setup."}</p>

        <div className="flex gap-2 justify-center">
          <button
            type="button"
            onClick={() => router.push("/log-in")}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 rounded-md px-8 w-full"
          >
            Go to login
          </button>
        </div>
      </div>
    );
  }

  if (err && !setupToken) {
    return <div className="mx-auto max-w-md rounded-2xl bg-white p-8 text-center shadow text-red-600">{err}</div>;
  }

  if (!setupToken) {
    return (
      <div className="mx-auto max-w-md rounded-2xl bg-white p-8 text-center shadow text-red-600">
        Invalid or missing verification token.
      </div>
    );
  }

  const isErrorState = memberOk === false;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-6">
      {/* toast */}
      {showToast && (
        <div className="fixed inset-x-0 top-6 flex items-center justify-center pointer-events-none z-50">
          <div className="pointer-events-auto bg-white border border-amber-200 shadow p-3 rounded-md text-sm">
            <strong className="block text-amber-700 mb-1">Notice</strong>
            <div className="text-amber-700">{toastMessage}</div>
          </div>
        </div>
      )}

      {/* card: two-column layout - FIXED */}
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 bg-white rounded-2xl shadow-lg overflow-hidden md:divide-x md:divide-gray-100">
        
        {/* left intro panel (visual) - FIXED: Added min-h-full */}
        <div className="hidden md:flex flex-col items-start justify-start gap-6 px-12 py-10 sm:py-12 bg-gradient-to-br from-gray-100 via-gray-50 to-white min-h-full">
          <div className="w-16 h-16 rounded-full bg-white/90 border flex items-center justify-center shadow-sm">
            <Image src="/DTG_Logo.svg" alt="DTG" className={`flex-shrink-0 ${styles.pageLogo}`} width={48} height={48} />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Let's Setup Your Account</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Enter the Amazon email address associated with your account and complete your profile. We'll confirm the account and save your profile details.
            </p>
          </div>
        </div>

        {/* right form panel - FIXED: Added w-full */}
        <div className="w-full px-6 py-10 sm:px-10 sm:py-12 flex flex-col justify-center">
          {initialEmailHint ? (
            <p className="mb-4 text-sm text-gray-600 text-center md:text-left">
              We sent a verification link to <span className="font-medium">{initialEmailHint}</span>.
            </p>
          ) : (
            <h3 className="mb-4 text-lg font-medium text-gray-800">Complete your profile</h3>
          )}

          <form onSubmit={submit} className="space-y-4 max-w-xl">
            <div>
              <Label htmlFor="email">{userName ? "User" : "Amazon Email Address*"}</Label>
              <Input
                id="email"
                name="email"
                placeholder={userName ? undefined : "you@amazon.com"}
                value={userName ? userName : email}
                onChange={onEmailChange}
                disabled={!!userName}
                aria-label={userName ? `User: ${userName}` : "Amazon Email Address"}
              />
              <div className="text-xs mt-2">
                {checking ? (
                  <span className="text-gray-500">Checking email…</span>
                ) : memberOk === true ? (
                  <span className="text-emerald-600">✔ {memberMsg}</span>
                ) : memberOk === false ? (
                  <span className="text-rose-600">✖ {memberMsg}</span>
                ) : (
                  <span className="text-gray-500">Type your email to validate and enable the form.</span>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="job_title">Job Title*</Label>
              <Input id="job_title" name="job_title" value={form.job_title} onChange={onChange} disabled={inputsDisabled} />
            </div>

            <div>
              <Label htmlFor="amazon_site">Amazon Site*</Label>
              <SitesTagAutocomplete
                value={form.amazon_site}
                onChange={(csv) => setForm((f) => ({ ...f, amazon_site: csv }))}
                placeholder="Type and select or press Enter / comma to add"
                minChars={1}
              />
              <p className="text-xs text-muted-foreground mt-1">You can add multiple sites. Press Enter or comma to add.</p>
            </div>

            <div>
              <Label htmlFor="other_accounts">Other Accounts</Label>
              <Input id="other_accounts" name="other_accounts" value={form.other_accounts} onChange={onChange} disabled={inputsDisabled} />
              <p className="text-xs text-muted-foreground mt-1">e.g. Amazon XY21, Amazon XY22</p>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={saving || inputsDisabled}
                className="w-full inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 rounded-md px-8"
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>

            {memberOk === false && (
              <div className="pt-2 text-xs text-gray-600">
                {memberMsg}
                {memberMsg && memberMsg.toLowerCase().includes("expired") && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await postApi("/auth/resend-verification", { email });
                          setMemberMsg("A new verification link was sent if the email exists.");
                          setToastMessage("Verification email resent.");
                          setShowToast(true);
                        } catch {
                          setMemberMsg("Could not resend verification link.");
                          setToastMessage("Could not resend verification link.");
                          setShowToast(true);
                        }
                      }}
                      className="underline text-indigo-600"
                    >
                      Resend verification email
                    </button>
                  </div>
                )}
              </div>
            )}

            {err && <div className="text-sm text-red-600">{err}</div>}
          </form>
        </div>
      </div>
    </div>
  );
}