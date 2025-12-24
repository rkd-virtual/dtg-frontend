// portal/(app)/orders-quotes/page.tsx
"use client";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  LoaderIcon,
  EditIcon,
  DownloadIcon,
  MoreVerticalIcon,
  MinusIcon,
  PlusIcon,
  TrashIcon,
  AlertCircle,
  AlertTriangleIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import React from "react";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

/* types */
interface LineItem {
  partNumber: string;
  name: string;
  quantity: number;
  price: string;
  tracking?: string | null;
  status?: string | null;
}

interface OrderOrQuote {
  id: string;
  type: "order" | "quote";
  date?: string;
  status: string;
  items: LineItem[];
  total: number;
  tracking?: string;
}

/* static fallback data kept for when remote is empty */
const ordersAndQuotes: OrderOrQuote[] = [];

// NEW HELPER FUNCTION: Format number as comma-separated USD currency
const formatCurrency = (amount: number | string | null | undefined): string => {
  if (amount === null || amount === undefined) {
    return "$0.00";
  }
  const numberAmount = Number(amount);
  if (isNaN(numberAmount)) {
    return "$0.00";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numberAmount);
};

/* small UI helpers */
function StatusBadge({ status }: { status?: string | null }) {
  const s = (status ?? "").toString().trim();

  if (!s) return <span className="text-sm text-muted-foreground">—</span>;

  let classes =
    "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ";
  let icon = null;

  // Define color mapping based on status
  switch (s) {
    case "Shipped":
    case "Delivered":
      // Green for completed actions
      classes +=
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-background text-green-600";
      icon = <CheckCircleIcon className="h-4 w-4" />;
      break;
    case "Approved":
    case "Invoiced": // Added Invoiced status
      // Blue for positive status
      classes +=
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-background text-blue-800";
      icon = <CheckCircleIcon className="h-4 w-4" />;
      break;
    case "Processing":
    case "Pending":
      // Yellow/Orange for in-progress
      classes +=
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-background text-yellow-800";
      icon = <LoaderIcon className="h-4 w-4 animate-spin" />;
      break;
    case "Open":
      // Gray for default/initial state
      classes +=
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-background text-gray-800";
      icon = <LoaderIcon className="h-4 w-4" />;
      break;
    case "Cancelled":
    case "Rejected":
      // Red for negative status
      classes += "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400";
      break;
    default:
      // Default styles
      classes += "bg-muted/50 text-muted-foreground border";
      break;
  }

  return (
    <div className={classes}>
      {icon}
      <span>{s}</span>
    </div>
  );
}

/* Pagination tiny component */
function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (newPage: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const pagesToShow = (() => {
    const pages: number[] = [];
    const startP = Math.max(1, page - 2);
    const endP = Math.min(totalPages, page + 2);
    for (let p = startP; p <= endP; p++) pages.push(p);
    return pages;
  })();

  if (total === 0) {
    return null;
  }

  return (
    <div className="mt-4 flex items-center justify-between">
      <div className="text-sm text-muted-foreground">{`Showing ${start}-${end} of ${total}`}</div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          Prev
        </Button>

        {pagesToShow.map((p) => (
          <Button
            key={p}
            size="sm"
            variant={p === page ? "default" : "outline"}
            onClick={() => onChange(p)}
          >
            {p}
          </Button>
        ))}

        <Button
          size="sm"
          variant="outline"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

/* utility to extract first tracking URL from shipments array (server returns HTML link sometimes) */
const extractTrackingFromShipments = (shipments: any[]): string | null => {
  if (!Array.isArray(shipments) || shipments.length === 0) return null;
  const first = shipments[0];
  if (!first) return null;

  const maybeLink = first.tracking_link || first.tracking || first.tracking_link_html || "";
  if (!maybeLink) return null;

  const hrefMatch = String(maybeLink).match(/href=["']([^"']+)["']/i);
  if (hrefMatch) return hrefMatch[1];
  const urlMatch = String(maybeLink).match(/https?:\/\/[^\s'"]+/);
  if (urlMatch) return urlMatch[0];

  return String(maybeLink);
};

/* map single remote quote into local model */
const mapRemoteQuoteToLocal = (q: any): OrderOrQuote => {
  const lines: LineItem[] = Array.isArray(q.lines)
    ? q.lines.map((l: any) => ({
        partNumber: String(l.name ?? "UNKNOWN"),
        name: (l.description && String(l.description).trim()) || String(l.name ?? "Item"),
        quantity: Number.isFinite(Number(l.qty)) ? Number(l.qty) : Number(l.quantity ?? 0),
        price: (l.price !== undefined && l.price !== null) ? String(Number(l.price).toFixed(2)) : "0.00",
        tracking: undefined,
        status: l.status ?? q.status ?? "Open",
      }))
    : [];

  const computedTotal = lines.reduce((s, li) => s + (parseFloat(li.price || "0") || 0) * (li.quantity || 0), 0);

  return {
    id: String(q.name ?? `Q-${Math.random().toString(36).slice(2, 8)}`),
    type: "quote",
    status: q.status ?? "Open",
    items: lines,
    total: Number(Number(computedTotal).toFixed(2)),
  };
};

/* Page component */
export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sites, loading } = useAuth();

  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const initialFilter = (() => {
    const tab = searchParams?.get("tab") ?? "";
    if (tab === "orders") return "order";
    if (tab === "quotes") return "quote";
    return "quote";
  })();
  const [filter, setFilter] = useState<"order" | "quote">(initialFilter);

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingQuote, setEditingQuote] = useState<OrderOrQuote | null>(null);
  const [editedItems, setEditedItems] = useState<LineItem[]>([]);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // For deletion confirmation
  const [deletingQuote, setDeletingQuote] = useState<OrderOrQuote | null>(null);

  // States for PDF Download
  const [downloadingQuoteId, setDownloadingQuoteId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // NEW: copy order states
  const [copyingOrder, setCopyingOrder] = useState<OrderOrQuote | null>(null);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyingLoading, setCopyingLoading] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  // remote fetch states
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [localQuotes, setLocalQuotes] = useState<OrderOrQuote[]>(
    ordersAndQuotes.filter((q) => q.type === "quote")
  );
  const [remotePayloadPreview, setRemotePayloadPreview] = useState<any | null>(null);

  // pagination
  const [page, setPage] = useState<number>(1);

  const fetchControllerRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);
  const lastUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (fetchControllerRef.current) fetchControllerRef.current.abort();
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (selectedAccount !== null) return;

    try {
      const saved = sessionStorage.getItem("selectedAccount");
      if (saved) {
        setSelectedAccount(saved);
        return;
      }
    } catch {}

    if (sites && sites.length > 0) {
      const def = sites.find((s: any) => s.is_default) || sites[0];
      if (def && def.site_slug) {
        setSelectedAccount(def.site_slug);
        return;
      }
    }

    setSelectedAccount("all-accounts");
  }, [loading, sites, selectedAccount]);

  useEffect(() => {
    if (selectedAccount === null) return;
    try {
      sessionStorage.setItem("selectedAccount", selectedAccount);
    } catch {}
  }, [selectedAccount]);

  const selectValue = useMemo(() => {
    if (selectedAccount) return selectedAccount;
    if (!loading && sites && sites.length > 0) {
      const def = sites.find((s: any) => s.is_default) || sites[0];
      return def?.site_slug ?? "all-accounts";
    }
    return "all-accounts";
  }, [selectedAccount, sites, loading]);

  const showSelect = !!sites && sites.length > 1;

  const resolveAccountLabel = (siteSlug: string | null) => {
    if (!siteSlug) return null;
    if (!sites || sites.length === 0) return siteSlug;
    const found = sites.find((s: any) => s.site_slug === siteSlug);
    return found ? found.label ?? found.site_slug : siteSlug;
  };

  const API_ROOT = process.env.NEXT_PUBLIC_SITES_API ?? "https://dtg-backend.onrender.com/api";
  const buildAccountDataUrl = (accountName: string, type: "quotes" | "orders", pageParam = 1) =>
    `${API_ROOT}/account-data?account_name=${encodeURIComponent(accountName)}&page=${pageParam}&type=${type}`;

  // fetch remote payload whenever account/filter/page changes
  useEffect(() => {
    if (!selectedAccount || selectedAccount === "all-accounts") {
      setRemotePayloadPreview(null);
      setRemoteError(null);
      setLoadingRemote(false);
      setLoadingAccount(false);
      return;
    }

    const accountLabel = resolveAccountLabel(selectedAccount);
    if (!accountLabel) return;

    const typeParam = filter === "order" ? "orders" : "quotes";
    const url = buildAccountDataUrl(accountLabel, typeParam, page);

    if (lastUrlRef.current === url && !remoteError) return;

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const lastUrlPrefix = lastUrlRef.current?.split("&page=")[0];
    const currentUrlPrefix = url.split("&page=")[0];
    const isAccountOrFilterChange = lastUrlRef.current === null || lastUrlPrefix !== currentUrlPrefix;

    debounceRef.current = window.setTimeout(() => {
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
        fetchControllerRef.current = null;
      }

      const controller = new AbortController();
      fetchControllerRef.current = controller;

      setLoadingRemote(true);
      if (isAccountOrFilterChange) {
        setLoadingAccount(true);
      } else {
        setLoadingAccount(false);
      }

      setRemoteError(null);
      setRemotePayloadPreview(null);

      fetch(url, { signal: controller.signal, cache: "no-store" })
        .then(async (res) => {
          if (!res.ok) {
            const txt = await res.text().catch(() => res.statusText);
            throw new Error(`Status ${res.status}: ${txt || res.statusText}`);
          }
          return res.json().catch(() => null);
        })
        .then((json) => {
          setRemotePayloadPreview(json);
          lastUrlRef.current = url;
          if (filter === "quote" && Array.isArray(json?.quotes)) {
            setLocalQuotes(mapRemoteQuotesToLocal(json.quotes));
          }
        })
        .catch((err: any) => {
          if (err?.name === "AbortError") return;
          console.error("account-data fetch failed:", err);
          setRemoteError(err?.message ?? "Failed to fetch account data");
          lastUrlRef.current = null;
        })
        .finally(() => {
          setLoadingRemote(false);
          setLoadingAccount(false);
        });
    }, 250);

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccount, filter, page, sites]);

  const updateTabParam = (tab: "orders" | "quotes") => {
    const params = new URLSearchParams(Array.from(searchParams?.entries() || []));
    params.set("tab", tab);
    const qs = params.toString();
    router.push(`/portal/orders-quotes${qs ? `?${qs}` : ""}`);
    setFilter(tab === "quotes" ? "quote" : "order");
    setPage(1);
    lastUrlRef.current = null;
    setRemotePayloadPreview(null);
    setRemoteError(null);
    setLoadingAccount(true);
    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort();
      fetchControllerRef.current = null;
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleEditQuote = (quote: OrderOrQuote) => {
    setEditingQuote(quote);
    setEditedItems([...quote.items]);
    setShowEditDialog(true);
  };

  const handleUpdateQuantity = (partNumber: string, newQuantity: number) => {
    setEditedItems((items) =>
      items.map((item) =>
        item.partNumber === partNumber ? { ...item, quantity: Math.max(1, newQuantity) } : item
      )
    );
  };

  const handleRemoveItem = (partNumber: string) => {
    setEditedItems((items) => items.filter((item) => item.partNumber !== partNumber));
  };

  /**
   * NEW: Save edited quote -> POST to /api/quote-edit
   * Payload format:
   * {
   *   quote_name: string,
   *   lines: [{ name: partNumber, description: name, qty: number, price: number }]
   * }
   *
   * Behavior:
   * - On success: optimistic local update + router.refresh() to re-fetch server state
   * - Show sonner toasts for success / error
   */
  const handleSaveQuote = async () => {
    if (!editingQuote) {
      setShowEditDialog(false);
      setEditingQuote(null);
      setEditedItems([]);
      return;
    }

    const payload = {
      quote_name: editingQuote.id,
      lines: editedItems.map((it) => ({
        name: it.partNumber,
        description: it.name,
        qty: Number(it.quantity || 0),
        price: Number(isFinite(Number(it.price)) ? Number(it.price) : 0),
      })),
    };

    try {
      // call API
      const endpoint = `${API_ROOT}/quote-edit`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => res.statusText);
        throw new Error(`Status ${res.status}: ${txt || res.statusText}`);
      }

      // Attempt to read returned quote object if backend provides it
      const responseJson = await res.json().catch(() => null);

      // If backend returned an updated quote object, map it. Otherwise use optimistic local update.
      if (responseJson && (responseJson.name || responseJson.lines)) {
        // Backend returned single quote structure
        const mapped = mapRemoteQuoteToLocal(responseJson);
        setLocalQuotes((prev) => prev.map((q) => (q.id === mapped.id ? mapped : q)));
      } else {
        // optimistic local update (instant)
        setLocalQuotes((prev) =>
          prev.map((q) =>
            q.id === editingQuote.id
              ? {
                  ...q,
                  items: editedItems.map((it) => ({ ...it })),
                  total: Number(
                    editedItems
                      .reduce((s, li) => s + (parseFloat(li.price || "0") || 0) * (li.quantity || 0), 0)
                      .toFixed(2)
                  ),
                }
              : q
          )
        );
      }

      // close dialog and reset local edit state
      setShowEditDialog(false);
      setEditingQuote(null);
      setEditedItems([]);

      // ensure server-side content is re-fetched (app-router friendly)
      try {
        router.refresh();
      } catch (e) {
        // router.refresh may throw in some test envs - ignore silently
        // but we still notify user about success
      }

      toast.success("Quote saved successfully.", {
          icon: <AlertCircle className="w-5 h-5 text-green-500" />,
        })
      console.log("Quote updated successfully", editingQuote.id);
    } catch (err: any) {
      console.error("Failed to save quote:", err);
      toast.error(`Failed to save quote: ${err?.message ?? "Unknown error"}`, {
          icon: <AlertCircle className="w-5 h-5 text-red-500" />,
        })
      // keep dialog open for retry
    }
  };

  const handleCancelEdit = () => {
    setShowEditDialog(false);
    setEditingQuote(null);
    setEditedItems([]);
  };

  const calculateEditedTotal = () =>
    editedItems.reduce((sum, item) => sum + (parseFloat(item.price || "0") || 0) * (item.quantity || 0), 0);

  // ENHANCED PDF DOWNLOAD FUNCTION
  const handleDownloadPDF = async (quote: OrderOrQuote) => {
    const quoteName = quote.id;
    setDownloadingQuoteId(quoteName);
    setDownloadError(null);

    try {
      const apiEndpoint = `${API_ROOT}/get-quote-pdf?quote_name=${encodeURIComponent(quoteName)}`;

      const response = await fetch(apiEndpoint, {
        method: "GET",
        headers: {
          Accept: "application/pdf",
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`Failed to generate PDF. Status ${response.status}: ${errorText || response.statusText}`);
      }

      const blob = await response.blob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Quote-${quoteName}.pdf`;

      document.body.appendChild(a);
      a.click();

      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("PDF Download Error:", error);
      setDownloadError(error?.message ?? "An unexpected error occurred during download.");
    } finally {
      setDownloadingQuoteId(null);
    }
  };

  const handleDeleteQuoteConfirmation = (quote: OrderOrQuote) => {
    setDeletingQuote(quote);
  };

  const handleDeleteQuote = () => {
    if (deletingQuote) {
      console.log("Deleting quote (mock):", deletingQuote.id);

      setLocalQuotes((prevQuotes) => prevQuotes.filter((q) => q.id !== deletingQuote.id));

      setDeletingQuote(null);
      setExpandedRows((prev) => {
        const newSet = new Set(prev);
        newSet.delete(deletingQuote.id);
        return newSet;
      });
    }
  };

  /* map remote quotes into listing model */
  const mapRemoteQuotesToLocal = (remoteQuotes: any[]): OrderOrQuote[] => {
    return remoteQuotes.map((q: any) => {
      const lines: LineItem[] = Array.isArray(q.lines)
        ? q.lines.map((l: any) => ({
            partNumber: String(l.name ?? "UNKNOWN"),
            name: (l.description && String(l.description).trim()) || String(l.name ?? "Item"),
            quantity: Number.isFinite(Number(l.qty)) ? Number(l.qty) : Number(l.quantity ?? 0),
            price: (l.price !== undefined && l.price !== null) ? String(Number(l.price).toFixed(2)) : "0.00",
            tracking: undefined,
            status: l.status ?? q.status ?? "Open",
          }))
        : [];

      const computedTotal = lines.reduce((s, li) => s + (parseFloat(li.price || "0") || 0) * (li.quantity || 0), 0);

      return {
        id: String(q.name ?? `Q-${Math.random().toString(36).slice(2, 8)}`),
        type: "quote",
        status: q.status ?? "Open",
        items: lines,
        total: Number(Number(computedTotal).toFixed(2)),
      };
    });
  };

  const remoteQuotesAsList: OrderOrQuote[] = useMemo(() => {
    if (!remotePayloadPreview || !Array.isArray(remotePayloadPreview.quotes)) {
      return ordersAndQuotes.filter((it) => it.type === "quote");
    }
    return mapRemoteQuotesToLocal(remotePayloadPreview.quotes);
  }, [remotePayloadPreview]);

  /* map remote orders into listing model
     ENHANCEMENT: Propagate parent order's status and tracking to all line items.
  */
  const remoteOrdersAsList: OrderOrQuote[] = useMemo(() => {
    if (!remotePayloadPreview || !Array.isArray(remotePayloadPreview.orders)) return [];
    return remotePayloadPreview.orders.map((o: any, idx: number) => {
      const orderStatus = o.status ?? "Open";
      const trackingUrl = extractTrackingFromShipments(o.shipments || []);

      const lines: LineItem[] = Array.isArray(o.lines)
        ? o.lines.map((l: any) => {
            const part = String(l.name ?? "UNKNOWN");
            const desc = (l.description && String(l.description).trim()) || String(l.name ?? "Item");
            const qty = Number.isFinite(Number(l.qty)) ? Number(l.qty) : Number(l.quantity ?? 0);
            const price = (l.price !== undefined && l.price !== null) ? String(Number(l.price).toFixed(2)) : "0.00";
            return {
              partNumber: part,
              name: desc,
              quantity: qty,
              price,
              status: l.status ?? orderStatus,
              tracking: trackingUrl,
            } as LineItem;
          })
        : [];

      const computedTotal = lines.reduce((s, li) => s + (parseFloat(li.price || "0") || 0) * (li.quantity || 0), 0);

      return {
        id: String(o.name ?? `ORD-${idx}-${Math.random().toString(36).slice(2, 6)}`),
        type: "order",
        status: orderStatus,
        items: lines,
        total: Number(Number(computedTotal).toFixed(2)),
      };
    });
  }, [remotePayloadPreview]);

  /* final listing data - use remote results for quotes/orders based on filter, prioritize local state for quotes if modified */
  const listingData: OrderOrQuote[] = useMemo(() => {
    if (filter === "quote") {
      return localQuotes;
    }

    if (remoteOrdersAsList.length > 0) return remoteOrdersAsList;
    if (remotePayloadPreview && Array.isArray(remotePayloadPreview.orders) && remotePayloadPreview.orders.length === 0) return [];
    return ordersAndQuotes.filter((it) => it.type === "order");
  }, [filter, localQuotes, remoteOrdersAsList, remotePayloadPreview]);

  /* pagination meta */
  const totalItems = useMemo(() => {
    if (filter === "quote" && remotePayloadPreview && typeof remotePayloadPreview.total_quotes === "number") {
      return remotePayloadPreview.total_quotes;
    }
    if (filter === "order" && remotePayloadPreview && typeof remotePayloadPreview.total_orders === "number") return remotePayloadPreview.total_orders;

    return listingData.length;
  }, [remotePayloadPreview, filter, listingData]);

  const pageSize = useMemo(() => {
    if (remotePayloadPreview && typeof remotePayloadPreview.page_size === "number") return remotePayloadPreview.page_size;
    return remotePayloadPreview && remotePayloadPreview.page_size ? Number(remotePayloadPreview.page_size) : 5;
  }, [remotePayloadPreview]);

  const onAccountChange = (val: string) => {
    setSelectedAccount(val);
    setPage(1);
    lastUrlRef.current = null;
    setRemotePayloadPreview(null);
    setRemoteError(null);
    setLoadingAccount(true);
    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort();
      fetchControllerRef.current = null;
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage === page) return;
    setPage(newPage);
    setRemotePayloadPreview(null);
    setRemoteError(null);
    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort();
      fetchControllerRef.current = null;
    }
    const el = document.querySelector("#history-card");
    if (el) (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ----- NEW: Copy Order handlers -----
  const handleCopyOrderConfirmation = (order: OrderOrQuote) => {
      if (!order || !Array.isArray(order.items) || order.items.length === 0) {      
      setCopyError("Cannot copy an order with no items.");      
      window.setTimeout(() => setCopyError(null), 2500);
      return;
    }
    setCopyError(null);
    setCopyingOrder(order);
    setShowCopyDialog(true);
  };

  const handleCopyOrder = async () => {
    if (!copyingOrder) return;
    setCopyingLoading(true);
    setCopyError(null);

    try {
      // Call API - POST with order identifier in body
      const endpoint = `${API_ROOT}/copy-order`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_name: copyingOrder.id }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => res.statusText);
        throw new Error(`Status ${res.status}: ${txt || res.statusText}`);
      }

      // Trigger a reload of orders: reset remote preview and page so your existing useEffect will refetch.
      lastUrlRef.current = null;
      setRemotePayloadPreview(null);
      setRemoteError(null);
      setPage(1);
      setShowCopyDialog(false);
      setCopyingOrder(null);
    } catch (err: any) {
      console.error("Copy order failed:", err);
      setCopyError(err?.message ?? "Failed to copy order");
    } finally {
      setCopyingLoading(false);
    }
  };
  // ------------------------------------

  return (
    <>
      <SiteHeader title="Orders & Quotes" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders & Quotes</h1>
          <p className="text-muted-foreground">View and track your orders and quote requests</p>
          {downloadError && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              PDF Download Error: {downloadError}
            </div>
          )}
        </div>

        {/* START: Buttons and Account Selector */}
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-2">
            <Button variant={filter === "order" ? "default" : "outline"} onClick={() => updateTabParam("orders")}>
              Orders
            </Button>
            <Button variant={filter === "quote" ? "default" : "outline"} onClick={() => updateTabParam("quotes")}>
              Quotes
            </Button>
          </div>

          {/* Account Selection Card (Targeted Fix for Compact Look) */}
          <Card className="w-fit shadow-sm p-0">
            <CardContent className="p-3 flex items-center gap-4">
              {loading ? (
                <div className="flex items-center gap-2">
                  <LoaderIcon className="h-4 w-4 animate-spin" />
                  <span>Loading accounts...</span>
                </div>
              ) : showSelect ? (
                <div className="flex items-center gap-3">
                  <Label className="text-sm font-medium whitespace-nowrap text-gray-900 mb-0">
                    Select an Account
                  </Label>

                  <div className="relative flex items-center">
                    <select
                      id="account-select"
                      value={selectValue}
                      onChange={(e) => onAccountChange(e.target.value)}
                      className="
                                        block
                                        appearance-none
                                        rounded-md
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
                                        focus:border-indigo-500
                                        focus:outline-none
                                        focus:ring-1
                                        focus:ring-indigo-500
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

                  {loadingAccount && (
                    <div className="flex items-center text-sm text-blue-600">
                      <LoaderIcon className="h-5 w-5 animate-spin" />
                    </div>
                  )}
                </div>
              ) : sites && sites.length === 1 ? (
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    Account: <strong>{sites[0].label ?? sites[0].site_slug}</strong>
                  </div>
                  {loadingAccount && <LoaderIcon className="h-4 w-4 animate-spin" />}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No accounts available</div>
              )}
            </CardContent>
          </Card>
        </div>
        {/* END: Buttons and Account Selector */}

        <Card id="history-card">
          <CardHeader>
            <CardTitle>History</CardTitle>
            <CardDescription>Your recent orders and quote requests</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead className="w-[220px]">Order ID</TableHead>
                  <TableHead className="w-[220px]">Items</TableHead>
                  <TableHead className="w-[80px] text-center">Qty.</TableHead>
                  <TableHead className="w-[120px] text-right">Total</TableHead>
                  <TableHead className="w-[120px] text-center">Status</TableHead>
                  <TableHead className="w-[100px]">{filter === "order" ? "Tracking" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody style={{ minHeight: "250px" }}>
                {loadingRemote ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <LoaderIcon className="h-5 w-5 animate-spin" />
                        <span>{filter === "quote" ? "Loading quotes..." : "Loading orders..."}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : listingData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {Number(totalItems || 0) === 0
                        ? remoteError
                          ? `Error: ${remoteError}`
                          : filter === "quote"
                          ? "No quotes found"
                          : "No orders found"
                        : "No items available on this page or data gap detected."}
                    </TableCell>
                  </TableRow>
                ) : (
                  listingData.map((item) => {
                    const isExpanded = expandedRows.has(item.id);

                    const totalQty = item.items.reduce((sum, li) => {
                      const q = Number(li.quantity ?? 0);
                      return sum + (Number.isFinite(q) ? q : 0);
                    }, 0);

                    const count = item.items.length || 0;
                    const itemsSummary = `${count} item${count === 1 ? "" : "s"}`;

                    const totalNumber = Number.isFinite(Number(item.total))
                      ? Number(item.total)
                      : item.items.reduce((s, li) => s + (parseFloat(li.price || "0") || 0) * (li.quantity || 0), 0);

                    const hasLineItems = item.items.length > 0;

                    return (
                      <React.Fragment key={item.id}>
                        <TableRow className="hover:bg-muted/50">
                          <TableCell>
                            {hasLineItems ? (
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => toggleRow(item.id)}>
                                {isExpanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                              </Button>
                            ) : (
                              <span className="text-sm text-muted-foreground w-8 text-center ml-2">—</span>
                            )}
                          </TableCell>

                          <TableCell className="font-medium font-mono text-sm break-words">{filter === "order" ? "Order" : "Quote#"}: {item.id}</TableCell>

                          <TableCell className="max-w-[300px]">{itemsSummary}</TableCell>

                          <TableCell className="text-center">{totalQty}</TableCell>

                          <TableCell className="text-right font-semibold">{formatCurrency(totalNumber)}</TableCell>

                          <TableCell>
                            {item.status ? <StatusBadge status={item.status} /> : <span className="text-sm text-muted-foreground">—</span>}
                          </TableCell>

                          {/* Dynamic Action/Tracking Cell */}
                          <TableCell>
                            {item.type === "quote" && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVerticalIcon className="h-4 w-4" />
                                    <span className="sr-only">Open menu</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {hasLineItems && (
                                    <DropdownMenuItem onClick={() => handleEditQuote(item)}>
                                      <EditIcon className="h-4 w-4 mr-2" />
                                      Edit Quote
                                    </DropdownMenuItem>
                                  )}

                                  {hasLineItems && (
                                    <DropdownMenuItem onClick={() => handleDownloadPDF(item)} disabled={downloadingQuoteId === item.id}>
                                      {downloadingQuoteId === item.id ? (
                                        <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
                                      ) : (
                                        <DownloadIcon className="h-4 w-4 mr-2" />
                                      )}
                                      Download PDF
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuItem onClick={() => handleDeleteQuoteConfirmation(item)} className="text-red-600 focus:text-red-600">
                                    <TrashIcon className="h-4 w-4 mr-2" />
                                    Delete Quote
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                            {item.type === "order" && item.items.length > 0 && item.items[0].tracking ? (
                              <div className="flex items-center gap-2">
                                <a href={String(item.items[0].tracking)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-[12px] font-medium">
                                  Tracking URL
                                </a>

                                {/* Three-dot action for Orders (copy order) */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <MoreVerticalIcon className="h-4 w-4" />
                                      <span className="sr-only">Order actions</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                          onClick={() => handleCopyOrderConfirmation(item)}
                                          disabled={!hasLineItems}
                                          title={!hasLineItems ? "Order has no items to copy" : undefined}
                                          className={!hasLineItems ? "opacity-60 cursor-not-allowed" : ""}
                                        >
                                      <EditIcon className="h-4 w-4 mr-2" />
                                      Copy Order
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            ) : item.type === "order" ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">N/A</span>

                                {/* Even when tracking is N/A, allow the copy action */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <MoreVerticalIcon className="h-4 w-4" />
                                      <span className="sr-only">Order actions</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleCopyOrderConfirmation(item)}>
                                      <EditIcon className="h-4 w-4 mr-2" />
                                      Copy Order
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            ) : null}
                          </TableCell>
                        </TableRow>

                        {isExpanded && hasLineItems && (
                          <TableRow>
                            <TableCell colSpan={7} className="bg-muted/30 p-0">
                              <div className="p-4">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="w-[18%]">Part Number</TableHead>
                                      <TableHead className="w-[42%]">Product Name</TableHead>
                                      <TableHead className="w-[5%] text-center">Qty.</TableHead>
                                      <TableHead className="w-[10%] text-right">Price</TableHead>
                                      <TableHead className="w-[10%] text-right">Total</TableHead>
                                      <TableHead className="w-[10%] text-center">Status</TableHead>
                                      <TableHead className="w-[130px]">Tracking</TableHead>
                                    </TableRow>
                                  </TableHeader>

                                  <TableBody>
                                    {item.items.map((lineItem, idx) => {
                                      const qty = Number(lineItem.quantity || 0);
                                      const unitPrice = parseFloat(String(lineItem.price || "0")) || 0;
                                      const lineTotal = unitPrice * qty;

                                      const lineStatus = lineItem.status ?? item.status ?? null;

                                      const trackingContent = lineItem.tracking ? (
                                        /^https?:\/\//.test(String(lineItem.tracking)) ? (
                                          <a href={String(lineItem.tracking)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-[12px]">
                                            Tracking URL
                                          </a>
                                        ) : (
                                          <span className="text-sm text-muted-foreground">{String(lineItem.tracking)}</span>
                                        )
                                      ) : (
                                        <span className="text-sm text-muted-foreground">N/A</span>
                                      );

                                      return (
                                        <TableRow key={`${item.id}-item-${idx}`}>
                                          <TableCell className="font-mono text-sm break-words max-w-[220px]">
                                            {lineItem.partNumber}
                                          </TableCell>

                                          <TableCell>{lineItem.name}</TableCell>

                                          <TableCell className="text-center">{qty}</TableCell>

                                          <TableCell className="text-right font-medium">{formatCurrency(unitPrice)}</TableCell>

                                          <TableCell className="text-right font-medium">{formatCurrency(lineTotal)}</TableCell>

                                          <TableCell>
                                            {lineStatus ? <StatusBadge status={lineStatus} /> : <span className="text-sm text-muted-foreground">N/A</span>}
                                          </TableCell>

                                          <TableCell>{trackingContent}</TableCell>
                                        </TableRow>
                                      );
                                    })}

                                    <TableRow>
                                      <TableCell colSpan={4} className="text-right font-semibold">
                                        Total
                                      </TableCell>
                                      <TableCell className="text-right font-semibold">
                                        {formatCurrency(item.items.reduce((s, li) => s + (parseFloat(li.price || "0") || 0) * (li.quantity || 0), 0))}
                                      </TableCell>
                                      <TableCell colSpan={2} />
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>

            <Pagination page={page} pageSize={pageSize} total={Number(totalItems || 0)} onChange={handlePageChange} />
          </CardContent>
        </Card>
      </div>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Quote {editingQuote?.id}</DialogTitle>
            <DialogDescription>Update quantities or remove items from this quote.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {editedItems.map((item) => (
              <Card key={item.partNumber}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-2">
                      <div>
                        <h4 className="font-semibold">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">Part #: {item.partNumber}</p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`qty-${item.partNumber}`} className="text-sm">
                            Quantity:
                          </Label>
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleUpdateQuantity(item.partNumber, item.quantity - 1)}>
                              <MinusIcon className="h-3 w-3" />
                            </Button>
                            <Input
                              id={`qty-${item.partNumber}`}
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateQuantity(item.partNumber, parseInt(e.target.value) || 1)}
                              className="h-8 w-16 text-center"
                            />
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleUpdateQuantity(item.partNumber, item.quantity + 1)}>
                              <PlusIcon className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-auto">
                          <span className="text-sm text-muted-foreground">{formatCurrency(item.price)} each</span>
                          <span className="font-semibold">{formatCurrency(parseFloat(item.price || "0") * item.quantity)}</span>
                        </div>
                      </div>
                    </div>

                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRemoveItem(item.partNumber)}>
                      <TrashIcon className="h-4 w-4" />
                      <span className="sr-only">Remove item</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {editedItems.length === 0 && <div className="text-center py-8 text-muted-foreground">No items in this quote. Add items to continue.</div>}

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total:</span>
                <span className="text-2xl font-bold">{formatCurrency(calculateEditedTotal())}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveQuote} disabled={editedItems.length === 0}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Deleting a Quote */}
      <Dialog open={!!deletingQuote} onOpenChange={() => setDeletingQuote(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangleIcon className="h-6 w-6" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete quote <strong>{deletingQuote?.id}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingQuote(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteQuote}>
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Copy Order */}
      <Dialog open={showCopyDialog} onOpenChange={() => setShowCopyDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy Order</DialogTitle>
            <DialogDescription>
              Are you sure to copy this order <strong>{copyingOrder?.id}</strong>?
            </DialogDescription>
          </DialogHeader>

          {copyError && <div className="mt-2 text-sm text-red-600">{copyError}</div>}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCopyDialog(false); setCopyingOrder(null); setCopyError(null); }}>
              No
            </Button>
            <Button onClick={handleCopyOrder} disabled={copyingLoading}>
              {copyingLoading ? <LoaderIcon className="h-4 w-4 animate-spin mr-2" /> : null}
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
