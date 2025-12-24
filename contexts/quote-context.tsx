// quote-context.tsx (fixed for nullish/logical operator precedence)
"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

export interface PersistedQuoteItem {
  id: string
  partnumber: string
  name: string
  description?: string
  price: string // persisted as string e.g. "42.00"
  qty: string // persisted as string e.g. "2"
  requiresHardware?: string
  image?: string
  notes?: string
}

interface RuntimeQuoteItem {
  id: string
  partnumber: string
  name: string
  description?: string
  price: number
  qty: number
  requiresHardware?: string
  image?: string
  notes?: string
}

interface QuoteContextType {
  items: RuntimeQuoteItem[]
  addItem: (item: Partial<RuntimeQuoteItem> & { partnumber?: string; id?: string; qty?: number }) => void
  removeItem: (identifier: string) => void
  updateQuantity: (identifier: string, qty: number) => void
  clearQuote: () => void
  getTotalItems: () => number
  getTotalPrice: () => number
}

const QuoteContext = createContext<QuoteContextType | undefined>(undefined)
const STORAGE_KEY = "quote-items"

function persistedToRuntime(p: PersistedQuoteItem): RuntimeQuoteItem {
  return {
    id: p.id ?? p.partnumber,
    partnumber: p.partnumber,
    name: p.name ?? "",
    description: p.description,
    price: Number.parseFloat(String(p.price || "0")) || 0,
    qty: parseInt(String(p.qty || "1"), 10) || 1,
    requiresHardware: p.requiresHardware,
    image: p.image,
    notes: p.notes,
  }
}

function runtimeToPersisted(r: RuntimeQuoteItem): PersistedQuoteItem {
  return {
    id: r.id ?? r.partnumber,
    partnumber: r.partnumber,
    name: r.name,
    description: r.description ?? "",
    price: (Number.isFinite(r.price) ? r.price.toFixed(2) : "0.00"),
    qty: String(r.qty),
    requiresHardware: r.requiresHardware ?? r.partnumber,
    image: r.image,
    notes: r.notes,
  }
}

export function QuoteProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<RuntimeQuoteItem[]>([])
  const [ready, setReady] = useState(false)

  const matches = (it: RuntimeQuoteItem, identifier?: string) =>
    !!identifier && (it.partnumber === identifier || it.id === identifier)

  useEffect(() => {
    let mounted = true

    const loadAndMigrate = async () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        console.debug("[QuoteProvider] raw localStorage:", raw)

        if (!raw) {
          if (mounted) setReady(true)
          console.debug("[QuoteProvider] no persisted quote-items found.")
          return
        }

        let parsed: any
        try {
          parsed = JSON.parse(raw)
        } catch (parseErr) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
          const backupKey = `${STORAGE_KEY}-broken-${timestamp}`
          localStorage.setItem(backupKey, raw)
          console.warn(`[QuoteProvider] parse error, backed up corrupted quote-items -> ${backupKey}`, parseErr)
          if (mounted) setReady(true)
          return
        }

        if (!Array.isArray(parsed)) {
          console.warn("[QuoteProvider] persisted quote-items is not an array; ignoring migration.")
          if (mounted) setReady(true)
          return
        }

        let products: any[] = []
        const API_ROOT = process.env.NEXT_PUBLIC_API_BASE ?? ""
        try {
          const res = await fetch(`${API_ROOT.replace(/\/$/, "")}/products`)
          if (res.ok) {
            const body = await res.json()
            products = body?.data?.products ?? []
          }
        } catch (e) {
          console.debug("[QuoteProvider] product fetch failed (ok to ignore):", e)
        }

        const normalized: RuntimeQuoteItem[] = parsed.map((p: any) => {
          const part = p.partnumber ?? p.partNumber ?? p.part ?? p.requiresHardware ?? ""
          const matched = products.find((pr) => pr.partnumber === part || pr.id === p.id)

          const priceStr = matched?.price ?? p.price ?? "0"
          // ensure parentheses when mixing ??? and || anywhere — here it's only ?? chain so it's fine
          const qtyVal = (p.qty ?? p.quantity) ?? 1

          // Use parentheses when mixing ?? and || — do that for id fallback below
          const fallbackId = (p.id ?? matched?.partnumber ?? part) || `DTG-${Math.random().toString(36).slice(2, 9)}`

          return {
            id: fallbackId,
            partnumber: matched?.partnumber ?? part,
            name: matched?.name ?? p.name ?? "",
            description: matched?.description ?? p.description ?? "",
            price: Number.parseFloat(String(priceStr)) || 0,
            qty: typeof qtyVal === "string" ? parseInt(qtyVal, 10) || 1 : Number(qtyVal) || 1,
            requiresHardware: matched?.requiresHardware ?? p.requiresHardware ?? part,
            image: matched?.image ?? p.image,
            notes: p.notes ?? "",
          }
        })

        if (mounted) {
          setItems(normalized)
          setReady(true)
          console.debug("[QuoteProvider] migration complete, items loaded:", normalized)
        }
      } catch (err) {
        console.error("[QuoteProvider] unexpected init error (will not clear storage):", err)
        if (mounted) setReady(true)
      }
    }

    loadAndMigrate()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    try {
      const toPersist = items.map(runtimeToPersisted)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist))
      console.debug("[QuoteProvider] persisted to storage:", toPersist)
    } catch (e) {
      console.error("[QuoteProvider] failed to persist quote-items:", e)
    }
  }, [items, ready])

  const addItem = (incoming: Partial<RuntimeQuoteItem> & { partnumber?: string; id?: string; qty?: number }) => {
    const part = incoming.partnumber ?? String(incoming.id ?? "")
    const id = incoming.id ?? part
    const qty = Math.max(1, Number(incoming.qty ?? 1))
    const price = Number.isFinite(Number(incoming.price)) ? Number(incoming.price) : 0

    console.debug("[QuoteProvider] addItem()", { incoming, part, id, qty, price })

    setItems((current) => {
      const idx = current.findIndex((it) => matches(it, part) || matches(it, id))
      if (idx !== -1) {
        const updated = [...current]
        updated[idx] = {
          ...updated[idx],
          qty: updated[idx].qty + qty,
          price: price || updated[idx].price,
          name: incoming.name ?? updated[idx].name,
          description: incoming.description ?? updated[idx].description,
          image: incoming.image ?? updated[idx].image,
          requiresHardware: incoming.requiresHardware ?? updated[idx].requiresHardware,
        }
        console.debug("[QuoteProvider] merged item:", updated[idx])
        return updated
      }

      const created: RuntimeQuoteItem = {
        id,
        partnumber: part,
        name: incoming.name ?? "",
        description: incoming.description ?? "",
        price,
        qty,
        requiresHardware: incoming.requiresHardware ?? part,
        image: incoming.image,
        notes: incoming.notes,
      }
      console.debug("[QuoteProvider] created item:", created)
      return [...current, created]
    })
  }

  const removeItem = (identifier: string) => {
    setItems((cur) => cur.filter((it) => !matches(it, identifier)))
  }

  const updateQuantity = (identifier: string, qty: number) => {
    if (qty <= 0) {
      removeItem(identifier)
      return
    }
    setItems((cur) => cur.map((it) => (matches(it, identifier) ? { ...it, qty } : it)))
  }

  const clearQuote = () => {
    setItems([])
    localStorage.removeItem(STORAGE_KEY)
    console.debug("[QuoteProvider] user cleared quote and storage removed")
  }

  const getTotalItems = () => items.reduce((s, it) => s + it.qty, 0)
  const getTotalPrice = () => items.reduce((sum, it) => sum + (Number.isFinite(it.price) ? it.price * it.qty : 0), 0)

  return (
    <QuoteContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearQuote,
        getTotalItems,
        getTotalPrice,
      }}
    >
      {children}
    </QuoteContext.Provider>
  )
}

export function useQuote() {
  const ctx = useContext(QuoteContext)
  if (!ctx) throw new Error("useQuote must be used within QuoteProvider")
  return ctx
}
