"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
// Import icons needed for the UI enhancement
import {
  LoaderIcon, // <-- Used for loading indicators, including the card counts
  ChevronDownIcon,
  ShoppingBag, // Icon for Orders
  FileText,   // Icon for Quotes
  Zap,        // Retained Zap for the "Updating..." status, but removed from card counts
} from "lucide-react";

export default function Page() {
  const { sites, loading } = useAuth();

  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [ordersCount, setOrdersCount] = useState<number | null>(null);
  const [quotesCount, setQuotesCount] = useState<number | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // --- ACCOUNT SELECTION LOGIC (Unmodified) ---

  // initial selection logic (sessionStorage -> default site -> all-accounts)
  useEffect(() => {
    if (loading) return;
    if (selectedAccount !== null) return;

    try {
      const saved = sessionStorage.getItem("selectedAccount");
      if (saved) {
        setSelectedAccount(saved);
        return;
      }
    } catch {
      // ignore
    }

    if (sites && sites.length > 0) {
      const def = sites.find((s) => s.is_default) || sites[0];
      if (def && def.site_slug) {
        setSelectedAccount(def.site_slug);
        return;
      }
    }

    setSelectedAccount("all-accounts");
  }, [loading, sites, selectedAccount]);

  // persist selection
  useEffect(() => {
    if (selectedAccount === null) return;
    try {
      sessionStorage.setItem("selectedAccount", selectedAccount);
    } catch {}
  }, [selectedAccount]);

  const selectValue = useMemo(() => {
    if (selectedAccount) return selectedAccount;
    if (!loading && sites && sites.length > 0) {
      const def = sites.find((s) => s.is_default) || sites[0];
      return def?.site_slug ?? "all-accounts";
    }
    return "all-accounts";
  }, [selectedAccount, sites, loading]);

  // fetch counts for resolved site (Unmodified)
  useEffect(() => {
    let siteToUse: string | null = null;

    if (selectedAccount && selectedAccount !== "all-accounts")
      siteToUse = selectedAccount;
    else if (selectedAccount === "all-accounts") {
      if (sites && sites.length > 0) {
        const def = sites.find((s) => s.is_default) || sites[0];
        siteToUse = def?.site_slug ?? null;
      } else {
        siteToUse = null;
      }
    } else {
      if (sites && sites.length > 0) {
        const def = sites.find((s) => s.is_default) || sites[0];
        siteToUse = def?.site_slug ?? null;
      } else {
        siteToUse = null;
      }
    }

    if (!siteToUse) {
      setOrdersCount(null);
      setQuotesCount(null);
      setFetchError(null);
      return;
    }

    let aborted = false;
    async function fetchCountsForSite(siteSlugRaw: string) {
      setLoadingCounts(true);
      setFetchError(null);

      try {
        const siteSlug = String(siteSlugRaw || "").trim();
        if (!siteSlug) throw new Error("Invalid site code");

        const normalized = siteSlug.toUpperCase();
        const url = `${process.env.NEXT_PUBLIC_SITES_API}/dashboard?site_code=${encodeURIComponent(
          normalized
        )}`;

        const res = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(txt || `Dashboard fetch failed (${res.status})`);
        }

        const json = await res.json().catch(() => ({}));
        if (aborted) return;

        const part1 = json?.part1 ?? {};
        const orderVal =
          typeof part1.order === "number" ? part1.order : part1.order ? Number(part1.order) : null;
        const quotesVal =
          typeof part1.quotes === "number"
            ? part1.quotes
            : part1.quotes
            ? Number(part1.quotes)
            : null;

        setOrdersCount(Number.isFinite(orderVal) ? orderVal : null);
        setQuotesCount(Number.isFinite(quotesVal) ? quotesVal : null);
      } catch (err: any) {
        if (aborted) return;
        console.error("Failed to fetch dashboard:", err);
        setFetchError(err?.message || "Failed to fetch dashboard");
        setOrdersCount(null);
        setQuotesCount(null);
      } finally {
        if (!aborted) setLoadingCounts(false);
      }
    }

    fetchCountsForSite(siteToUse);
    return () => {
      aborted = true;
    };
  }, [selectedAccount, sites, loading]);

  const showSelect = !!sites && sites.length > 1;

  // build link to Orders & Quotes page with `tab` param and optional site param (omitted for 'all-accounts')
  const buildOrdersLink = (tab: "orders" | "quotes") => {
    const base = "/portal/orders-quotes";
    const params = new URLSearchParams();
    params.set("tab", tab);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  };

  // --- START OF RENDER LOGIC WITH NEW COLORS AND LOADER FIX ---

  return (
    <>
      <SiteHeader title="Dashboard" />
      <div className="p-4 lg:p-6">
        {/* Account Selection Card */}
        <Card className="w-fit shadow-sm p-0">
          <CardContent className="p-3 flex items-center gap-4">
            {loading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <LoaderIcon className="h-4 w-4 animate-spin" />
                <span>Loading accounts...</span>
              </div>
            ) : showSelect ? (
              <div className="flex items-center gap-3">
                <div className="text-sm font-semibold whitespace-nowrap text-gray-700">
                  Viewing Account:
                </div>

                <div className="relative flex items-center">
                  <select
                    id="account-select"
                    value={selectValue}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    className="
                        block
                        appearance-none
                        rounded-lg
                        border
                        border-gray-300
                        bg-white
                        pl-3
                        pr-8
                        py-1.5
                        text-sm
                        font-medium
                        text-gray-900
                        shadow-sm
                        focus:border-emerald-500
                        focus:outline-none
                        focus:ring-2
                        focus:ring-emerald-500
                        focus:ring-opacity-50
                        cursor-pointer
                      "
                    style={{ minWidth: "140px" }}
                  >
                    <option value="all-accounts">All Accounts</option>
                    {!loading && sites && sites.length > 0
                      ? sites.map((s: any) => (
                          <option key={s.id} value={s.site_slug}>
                            {s.label}
                          </option>
                        ))
                      : null}
                  </select>
                  <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                </div>

                {/* {loadingCounts && (
                  <div className="flex items-center text-sm text-green-600">
                     <Zap className="h-4 w-4 animate-spin mr-1" /> 
                    <LoaderIcon className="h-4 w-4 animate-spin" />
                    <span className="text-gray-500">Updating...</span>
                  </div>
                )} */}
              </div>
            ) : sites && sites.length === 1 ? (
              <div className="flex items-center gap-4">
                <div className="text-sm font-semibold text-gray-700">
                  Account: <strong className="text-gray-900">{sites[0].label ?? sites[0].site_slug}</strong>
                </div>
                {/* {loadingCounts && <LoaderIcon className="h-4 w-4 animate-spin" />} */}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No accounts available</div>
            )}
          </CardContent>
        </Card>

        {/* Dashboard Stat Cards (Orders and Quotes only) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 mt-6">

          {/* ORDERS Card (Light Green/Grey) */}
          <Link
            href={buildOrdersLink("orders")}
            className="group block rounded-xl transition duration-150 focus:ring-4 focus:ring-offset-2 focus:ring-emerald-400"
            aria-label="View Orders"
          >
            <Card
              className="h-full hover:shadow-xl hover:shadow-emerald-200 transition-shadow border-l-4 border-emerald-500 bg-white"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-bold text-gray-700">
                  Orders
                </CardTitle>
                <ShoppingBag className="h-5 w-5 text-emerald-500 group-hover:text-emerald-600 transition" />
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-extrabold text-gray-800 leading-none">
                  {loadingCounts ? (
                    // Reverted to original loader icon
                    <span className="text-emerald-500"><LoaderIcon className="h-8 w-8 inline-block animate-spin" /></span>
                  ) : ordersCount !== null ? (
                    <span className="text-gray-800">{ordersCount}</span>
                  ) : (
                    <span className="text-gray-400">N/A</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Total quick stats
                </p>
                {fetchError && <div className="text-xs text-red-600 mt-2">Data Error!</div>}
              </CardContent>
            </Card>
          </Link>

          {/* QUOTES Card (Light Green/Grey) */}
          <Link
            href={buildOrdersLink("quotes")}
            className="group block rounded-xl transition duration-150 focus:ring-4 focus:ring-offset-2 focus:ring-lime-400"
            aria-label="View Quotes"
          >
            <Card
              className="h-full hover:shadow-xl hover:shadow-lime-200 transition-shadow border-l-4 border-lime-500 bg-white"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-bold text-gray-700">
                  Quotes
                </CardTitle>
                <FileText className="h-5 w-5 text-lime-500 group-hover:text-lime-600 transition" />
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-extrabold text-gray-800 leading-none">
                  {loadingCounts ? (
                    // Reverted to original loader icon
                    <span className="text-lime-500"><LoaderIcon className="h-8 w-8 inline-block animate-spin" /></span>
                  ) : quotesCount !== null ? (
                    <span className="text-gray-800">{quotesCount}</span>
                  ) : (
                    <span className="text-gray-400">N/A</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Total quick stats
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </>
  );
}