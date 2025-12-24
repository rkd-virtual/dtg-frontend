"use client";

import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getApi } from "@/lib/apiClient";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

type Site = {
  id: number;
  site_slug?: string;
  label?: string | null;
  is_default?: boolean;
};

export default function ShippingForm() {
  const [sites, setSites] = useState<Site[]>([]);
  const [saving, setSaving] = useState(false);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedSite, setSelectedSite] = useState<string>("ALL");

  const [form, setForm] = useState({
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    shipto: "",
  });

  const [validation, setValidation] = useState({
    address1: "",
    city: "",
    state: "",
    zip: "",
    country: "",
  });

  const [zipValid, setZipValid] = useState<boolean | null>(null);
  const zipTimerRef = useRef<number | null>(null);

  const ZIP_API_BASE =
    process.env.NEXT_PUBLIC_ZIP_API || "https://api.zippopotam.us";
  const SITES_API_BASE =
    process.env.NEXT_PUBLIC_SITES_API ||
    "https://dtg-backend.onrender.com/api";

  /* --------------------------------------------------
     Load sites → select default (NO fetch here)
  -------------------------------------------------- */
  useEffect(() => {
    let mounted = true;

    async function loadSites() {
      try {
        const data = await getApi("/auth/sites");
        if (!mounted) return;

        //const arr: Site[] = Array.isArray(data) ? data : [];
        const arr: Site[] = Array.isArray(data?.data) ? data.data : [];
        setSites(arr);

        const def = arr.find((s) => s.is_default) ?? arr[0];
        if (def?.site_slug) {
          setSelectedSite(def.site_slug);
        }
      } catch {
        setError("Failed to load accounts");
      }
    }

    loadSites();
    return () => {
      mounted = false;
      if (zipTimerRef.current) window.clearTimeout(zipTimerRef.current);
    };
  }, []);

  /* --------------------------------------------------
     Fetch address ONLY when selectedSite changes
  -------------------------------------------------- */
  useEffect(() => {
    if (!selectedSite || selectedSite === "ALL") return;

    const site = sites.find((s) => s.site_slug === selectedSite);
    if (site) fetchAddressForSite(site);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSite]);

  async function fetchAddressForSite(site: Site) {
    setRemoteLoading(true);
    setError(null);

    try {
      let first_name = "";
      let last_name = "";

      try {
        const me = await getApi("/auth/me");
        first_name = me?.first_name || "";
        last_name = me?.last_name || "";
      } catch {}

      const body = {
        account_name: site.label ?? site.site_slug,
        first_name,
        last_name,
      };

      const res = await fetch(
        `${SITES_API_BASE.replace(/\/$/, "")}/fetch-address`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) throw new Error();

      const data = await res.json();

      setForm({
        address1: data.address1 ?? "",
        address2: data.address2 ?? "",
        city: data.city ?? "",
        state: data.state ?? "",
        zip: data.zip ?? "",
        country: data.country ?? "",
        shipto: data.shipto ?? "",
      });

      if (data.zip) validateZipDebounced(data.zip, true);
    } catch {
      toast.error("Failed to fetch address", {
        icon: <AlertCircle className="w-5 h-5 text-red-500" />,
      });
    } finally {
      setRemoteLoading(false);
    }
  }

  function updateField<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setValidation((v) => ({ ...v, [key]: "" }));
    setError(null);

    if (key === "zip") {
      setZipValid(null);
      if (zipTimerRef.current) window.clearTimeout(zipTimerRef.current);
      validateZipDebounced(value);
    }
  }

  function validateZipDebounced(zip: string, immediate = false) {
    if (!zip) {
      setZipValid(null);
      setValidation((v) => ({ ...v, zip: "" }));
      return;
    }

    if (zip.length < 5) {
      setZipValid(false);
      setValidation((v) => ({ ...v, zip: "ZIP must be at least 5 characters" }));
      return;
    }

    if (zipTimerRef.current) window.clearTimeout(zipTimerRef.current);

    if (immediate) {
      validateZip(zip);
    } else {
      zipTimerRef.current = window.setTimeout(
        () => validateZip(zip),
        700
      );
    }
  }

  async function validateZip(zip: string) {
    const country = (form.country || "US").toUpperCase();
    setZipLoading(true);

    try {
      const res = await fetch(`${ZIP_API_BASE}/${country}/${zip}`);
      if (!res.ok) throw new Error();
      setZipValid(true);
      setValidation((v) => ({ ...v, zip: "" }));
    } catch {
      setZipValid(false);
      setValidation((v) => ({ ...v, zip: "ZIP code not found" }));
    } finally {
      setZipLoading(false);
    }
  }

  function validate() {
    const v = { address1: "", city: "", state: "", zip: "", country: "" };
    if (!form.address1.trim()) v.address1 = "Address is required";
    if (!form.city.trim()) v.city = "City is required";
    if (!form.state.trim()) v.state = "State is required";
    if (!form.country.trim()) v.country = "Country is required";
    if (!form.zip.trim() || zipValid !== true)
      v.zip = validation.zip || "Invalid ZIP";

    setValidation(v);
    return !Object.values(v).some(Boolean);
  }

  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setError(null);

    try {
      const site = sites.find((s) => s.site_slug === selectedSite);

      const payload = {
        address_line_1: form.address1,
        account_name: site?.label ?? site?.site_slug ?? "",
        city: form.city,
        state: form.state,
        zip: form.zip,
        country: form.country,
      };

      const API_ROOT = process.env.NEXT_PUBLIC_SITES_API ?? "https://dtg-backend.onrender.com/api"

      const res = await fetch(`${API_ROOT}/update-address`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) throw new Error();

      toast.success("Shipping information updated");
    } catch {
      toast.error("Failed to update shipping information", {
        icon: <AlertCircle className="w-5 h-5 text-red-500" />,
      });
    } finally {
      setSaving(false);
    }
  }

  /* ---------------- UI (UNCHANGED) ---------------- */

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="mb-2">Select an Account</Label>
          <select
            className="w-full rounded border px-3 py-2 text-sm"
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
            disabled={remoteLoading}
          >
            <option value="ALL">All Accounts</option>
            {sites.map((s) => (
              <option key={s.id} value={s.site_slug ?? ""}>
                {s.label ?? s.site_slug}
              </option>
            ))}
          </select>
          {remoteLoading && (
            <div className="text-sm text-muted-foreground mt-1">
              Fetching address…
            </div>
          )}
        </div>

        <div>
          <Label className="mb-2">Ship To</Label>
          <Input
            value={form.shipto}
            onChange={(e) => updateField("shipto", e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="mb-2">Address Line 1</Label>
          <Input
            value={form.address1}
            onChange={(e) => updateField("address1", e.target.value)}
          />
          {validation.address1 && (
            <p className="text-sm text-red-600">{validation.address1}</p>
          )}
        </div>

        <div>
          <Label className="mb-2">City</Label>
          <Input
            value={form.city}
            onChange={(e) => updateField("city", e.target.value)}
          />
          {validation.city && (
            <p className="text-sm text-red-600">{validation.city}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="mb-2">State / Province</Label>
          <Input
            value={form.state}
            onChange={(e) => updateField("state", e.target.value)}
          />
          {validation.state && (
            <p className="text-sm text-red-600">{validation.state}</p>
          )}
        </div>

        <div>
          <Label className="mb-2">Country</Label>
          <Input
            value={form.country}
            onChange={(e) => updateField("country", e.target.value)}
          />
          {validation.country && (
            <p className="text-sm text-red-600">{validation.country}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="relative">
          <Label className="mb-2 block">ZIP / Postal code</Label>
          <Input
            className="pr-12"
            value={form.zip}
            onChange={(e) => updateField("zip", e.target.value)}
            onBlur={() => validateZipDebounced(form.zip, true)}
          />

          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
            {zipLoading ? (
              <svg className="w-4 h-4 animate-spin text-muted-foreground" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : zipValid === true ? (
              <svg className="w-4 h-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : zipValid === false ? (
              <svg className="w-4 h-4 text-rose-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 8.586L4.707 3.293a1 1 0 10-1.414 1.414L8.586 10l-5.293 5.293a1 1 0 001.414 1.414L10 11.414l5.293 5.293a1 1 0 001.414-1.414L11.414 10l5.293-5.293a1 1 0 00-1.414-1.414L10 8.586z" clipRule="evenodd" />
              </svg>
            ) : null}
          </div>

          {validation.zip && (
            <p className="text-sm text-red-600 mt-1">{validation.zip}</p>
          )}
        </div>
      </div>

      <Separator />

      <Button type="submit" disabled={saving || remoteLoading || zipLoading}>
        {saving ? "Saving…" : "Save Changes"}
      </Button>
    </form>
  );
}
