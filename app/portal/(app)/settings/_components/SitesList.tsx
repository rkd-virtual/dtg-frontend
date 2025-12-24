// portal/(app)/settings/_components/SitesList.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";

// Dialog (shadcn / radix-style pattern)
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { LoaderIcon, Star, StarOff } from "lucide-react";
import { toast } from "sonner";

type Site = {
  id: number;
  user_id?: number;
  site_slug?: string;
  label?: string | null;
  address?: string | null;
  is_default?: boolean;
  created_at?: string | null;
};

export default function SitesList() {
  const [sites, setSites] = useState<Site[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state (controlled)
  const [addOpen, setAddOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<null | Site>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    (async () => {
      try {
        const res = await fetch("/api/settings/sites", { credentials: "include" });
        if (!res.ok) {
          const txt = await res.text().catch(() => res.statusText);
          throw new Error(txt || res.statusText);
        }
        const data = await res.json();
        if (!mounted) return;
        setSites(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error("Failed to fetch sites:", err);
        if (mounted) setError("Failed to load Amazon sites");
        toast.error("Failed to load Amazon sites");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const existingSlugs = (sites || []).map((s) => (s.site_slug || "").trim()).filter(Boolean);

  const normalize = (raw: string) =>
    (raw || "")
      .toString()
      .toLowerCase()
      .replace(/^amazon[:\s-]*/i, "")
      .replace(/[^a-z0-9\-_.]/gi, " ")
      .trim();

  const SITES_API = process.env.NEXT_PUBLIC_SITES_AUTOCOMPLETE_API || "/api/sites/search";

  const SitesTagAutocomplete: React.FC<{
    value: string;
    onChange: (csv: string) => void;
    placeholder?: string;
    minChars?: number;
    exclude?: string[];
    onAttemptExisting?: (slug: string) => void;
  }> = ({ value, onChange, placeholder, minChars = 1, exclude = [], onAttemptExisting }) => {
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
    const [localHint, setLocalHint] = useState<string | null>(null);

    useEffect(() => {
      const parsed = parseCsv(value);
      if (parsed.length !== tags.length || parsed.some((t, i) => tags[i] !== t)) {
        setTags(parsed);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    useEffect(() => {
      const qNorm = normalize(query);
      if (!qNorm) {
        setLocalHint(null);
        return;
      }
      const excludeNorm = (exclude || []).map((e) => normalize(e));
      const tagsNorm = tags.map((t) => normalize(t));

      if (excludeNorm.includes(qNorm)) {
        setLocalHint("This site is already added.");
        return;
      }
      if (tagsNorm.includes(qNorm)) {
        setLocalHint("Already selected.");
        return;
      }
      setLocalHint(null);
    }, [query, exclude, tags]);

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
            const excludeNormalized = (exclude || []).map((e) => normalize(e));
            const tagsNormalized = tags.map((t) => normalize(t));

            const filtered = list
              .map((x) => x.trim())
              .filter(Boolean)
              .filter((x) => {
                const candidate = normalize(x);
                return !tagsNormalized.includes(candidate) && !excludeNormalized.includes(candidate);
              });

            setSuggestions(filtered);
            setOpen(true);
          }
        } catch (err: any) {
          if (err.name === "AbortError") {
            // ignore abort
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
    }, [query, SITES_API, minChars, tags, exclude]);

    const commitTags = (nextTags: string[]) => {
      setTags(nextTags);
      onChange(nextTags.join(", "));
    };

    const addTag = (raw: string) => {
      const t = (raw || "").trim();
      if (!t) return;

      const excludeNormalized = (exclude || []).map((e) => normalize(e));
      const tagsNormalized = tags.map((x) => normalize(x));
      const candidateNorm = normalize(t);

      if (excludeNormalized.includes(candidateNorm)) {
        onAttemptExisting?.(t);
        setQuery("");
        setSuggestions([]);
        setOpen(false);
        return;
      }
      if (tagsNormalized.includes(candidateNorm)) {
        toast.error("Already selected.");
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

        {localHint && <div className="mt-1 text-xs text-rose-600">{localHint}</div>}

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

  const [newSitesCsv, setNewSitesCsv] = useState<string>("");

  const saveNewSites = async () => {
    const existingNormalized = existingSlugs.map((s) => normalize(s));

    const chosen = (newSitesCsv || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((slug) => !existingNormalized.includes(normalize(slug)));

    if (chosen.length === 0) {
      toast.error("No new sites to add.");
      return;
    }

    const payload = { sites: chosen.map((slug) => ({ site_slug: slug, label: null })) };

    const tempItems: Site[] = payload.sites.map((s, idx) => ({
      id: -Date.now() - idx,
      site_slug: s.site_slug,
      label: s.label,
      is_default: false,
    }));

    setSites((prev) => (prev ? [...tempItems, ...prev] : [...tempItems]));
    setAddOpen(false);
    setNewSitesCsv("");

    try {
      const res = await fetch("/api/settings/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => res.statusText);
        throw new Error(txt || res.statusText);
      }

      const created: Site[] = await res.json();
      setSites((prev) => {
        const withoutTemp = (prev || []).filter((p) => p.id > 0);
        return [...created, ...withoutTemp];
      });
      toast.success("Added successfully.");
    } catch (e: any) {
      console.error("Failed to create sites", e);
      setSites((prev) => (prev ? prev.filter((s) => s.id > 0) : []));
      toast.error("Failed to save sites.");
    }
  };

  const onAttemptExisting = (slug: string) => {
    toast.error(`${slug} is already added.`);
  };

  const setDefault = async (siteId: number) => {
    const prev = sites ? sites.map((s) => ({ ...s })) : [];

    setSites((cur) => (cur ? cur.map((s) => ({ ...s, is_default: s.id === siteId })) : cur));

    try {
      const res = await fetch(`/api/settings/sites/${siteId}/default`, {
        method: "PATCH",
        credentials: "include",
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => res.statusText);
        throw new Error(txt || res.statusText);
      }

      let payload: any = null;
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }

      const fallback = (sites || []).find((x) => x.id === siteId) || { id: siteId, site_slug: undefined, label: undefined };

      const updated = {
        id: payload?.id ?? fallback.id,
        site_slug: payload?.site_slug ?? fallback.site_slug,
        label: payload?.label ?? fallback.label,
      };

      window.dispatchEvent(
        new CustomEvent("dtg:defaultSiteChanged", {
          detail: updated,
        })
      );

      toast.success("Successfully changed the default site");
    } catch (e: any) {
      console.error("Failed to set default", e);
      setSites(prev);
      toast.error("Failed to change default site.");
    }
  };

  const confirmDelete = (s: Site) => {
    if (s.is_default) {
      toast.error("Cannot delete the default site. First make another site the default.");
      return;
    }
    setToDelete(s);
    setDeleteOpen(true);
  };

  const doDelete = async () => {
    if (!toDelete) return;
    const target = toDelete;
    const prev = sites ? [...sites] : [];
    setSites((cur) => (cur ? cur.filter((x) => x.id !== target.id) : cur));
    setDeleteOpen(false);
    setToDelete(null);

    try {
      const res = await fetch(`/api/settings/sites/${target.id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const txt = await res.text().catch(() => res.statusText);
        throw new Error(txt || res.statusText);
      }
      toast.success("Successfully Deleted.");
    } catch (e: any) {
      console.error("Delete failed", e);
      setSites(prev);
      toast.error("Failed to delete site.");
    }
  };

  if (loading) return <div className="p-6"><LoaderIcon className="h-5 w-5 animate-spin" /></div>;
  if (error) return <div className="p-6 text-destructive">{error}</div>;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Amazon Sites</h3>

        <Dialog open={addOpen} onOpenChange={(v: boolean) => setAddOpen(v)}>
          <DialogTrigger asChild>
            <Button onClick={() => setAddOpen(true)}>Add New Site</Button>
          </DialogTrigger>

          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Add Amazon Site(s)</DialogTitle>
            </DialogHeader>

            <div className="mb-3">
              <Label>Search sites (autocomplete)</Label>
              <SitesTagAutocomplete
                value={newSitesCsv}
                onChange={(csv) => setNewSitesCsv(csv)}
                placeholder="Type site code or press Enter / comma to add"
                minChars={1}
                exclude={existingSlugs}
                onAttemptExisting={onAttemptExisting}
              />
              <div className="mt-2 text-sm text-muted-foreground">You can select multiple sites.</div>
            </div>

            <DialogFooter className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setAddOpen(false); setNewSitesCsv(""); }}>
                Cancel
              </Button>
              <Button onClick={saveNewSites}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-hidden rounded border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Site Code</TableHead>
              <TableHead>Label / Address</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-middle">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {sites && sites.length > 0 ? (
              sites.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium font-mono">{s.site_slug ?? "—"}</TableCell>
                  <TableCell>
                    <div>{s.label ?? "—"}</div>
                    {s.address && <div className="text-sm text-muted-foreground">{s.address}</div>}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center justify-normal gap-3">
                      {s.is_default ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-black text-white px-3 py-1 text-xs font-medium shadow-sm">
                          <Star className="w-3.5 h-3.5" />
                          Default
                        </span>
                      ) : (
                        <button
                          onClick={() => setDefault(s.id)}
                          className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-xs font-medium hover:bg-gray-50 transition-colors duration-150"
                          aria-label={`Make ${s.site_slug} default`}
                          title={`Make ${s.site_slug} default`}
                        >
                          <StarOff className="w-3.5 h-3.5 text-gray-600" />
                          Make default
                        </button>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-middle">
                    {s.is_default ? (
                      <button
                        className="inline-flex items-center justify-center text-sm px-3 py-1 rounded-md border border-gray-100 text-gray-400 cursor-not-allowed"
                        title="Default site cannot be deleted"
                        aria-disabled="true"
                        disabled
                      >
                        Delete
                      </button>
                    ) : (
                      <Button variant="ghost" size="sm" className="text-destructive rounded-md border border-gray-100" onClick={() => confirmDelete(s)}>
                        Delete
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No sites found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={deleteOpen} onOpenChange={(v: boolean) => setDeleteOpen(v)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete site</DialogTitle>
          </DialogHeader>

          <div className="mb-4 text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{toDelete?.site_slug}</strong>?
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button className="text-destructive" onClick={doDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
