"use client"

// portal/(app)/quotes/page.tsx
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertCircle, MinusIcon, PlusIcon, TrashIcon } from "lucide-react"

import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useQuote } from "@/contexts/quote-context"
import { getApi } from "@/lib/apiClient"

export default function QuotesPage() {
  const { items, updateQuantity, removeItem, getTotalPrice, clearQuote } =
    useQuote()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const total = getTotalPrice()

  /* -------------------- USER ID RESOLUTION -------------------- */
  async function getUserId(): Promise<string | null> {
    const extractId = (obj: any) =>
      obj?.id ?? obj?._id ?? obj?.userId ?? obj?.user_id ?? obj?.sub ?? null

    const endpoints = ["/auth/me", "/user", "/users/me", "/me"]
    for (const ep of endpoints) {
      try {
        const resp = await getApi(ep)
        const id = extractId(resp)
        if (id) return String(id)
      } catch {}
    }

    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("user")
        if (raw) {
          const parsed = JSON.parse(raw)
          return extractId(parsed)
        }
      }
    } catch {}

    return null
  }

  /* -------------------- SUBMIT QUOTE -------------------- */
  async function handleSubmitQuote() {
    if (!items.length) {
      toast.error("Your quote is empty.", {
        icon: <AlertCircle className="w-5 h-5 text-red-500" />,
      })
      return
    }

    setIsSubmitting(true)

    try {
      const userId = await getUserId()

      const normalizedItems = items.map((item: any) => ({
        id: item.partnumber,
        partnumber: item.partnumber,
        name: item.name,
        qty: item.qty,
        unit_price: Number(item.price),
        line_total: Number(item.price) * item.qty,
      }))

      const payload = {
        user_id: userId,
        items: normalizedItems,
        summary: {
          total_items: items.reduce((s, i) => s + i.qty, 0),
          total_amount: total,
        },
        meta: {
          source: "portal",
          submitted_at: new Date().toISOString(),
        },
      }

      const API_ROOT =
        process.env.NEXT_PUBLIC_SITES_API ??
        "https://dtg-backend.onrender.com/api"

      const resp = await fetch(`${API_ROOT}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!resp.ok) {
        const body = await resp.json().catch(() => null)
        throw new Error(body?.message || "Failed to submit quote")
      }

      toast.success("Quote submitted successfully.")
      localStorage.removeItem("quote-items")
      clearQuote()
    } catch (err: any) {
      toast.error(err.message || "Something went wrong.", {
        icon: <AlertCircle className="w-5 h-5 text-red-500" />,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  /* -------------------- UI -------------------- */
  return (
    <>
      <SiteHeader title="Quotes" />

      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Quote Request</h1>
            <p className="text-muted-foreground">
              {items.length} {items.length === 1 ? "item" : "items"}
            </p>
          </div>
          {items.length > 0 && (
            <Button variant="outline" onClick={clearQuote}>
              Clear All
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">Your quote is empty.</p>
            <Button onClick={() => router.push("/portal/shop")}>
              Browse Shop
            </Button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* LEFT */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item: any) => (
                <Card key={item.partnumber}>
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      {item.image && (
                        <img
                          src={item.image}
                          className="h-24 w-24 object-contain rounded"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <div>
                            <h3 className="font-semibold">{item.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              Part #: {item.partnumber}
                            </p>
                          </div>
                          <div className="font-semibold">
                            ${Number(item.price).toFixed(2)}
                          </div>
                        </div>

                        <div className="flex justify-between items-center mt-4">
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() =>
                                updateQuantity(
                                  item.partnumber,
                                  Math.max(1, item.qty - 1)
                                )
                              }
                            >
                              <MinusIcon className="h-4 w-4" />
                            </Button>
                            <span>{item.qty}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() =>
                                updateQuantity(item.partnumber, item.qty + 1)
                              }
                            >
                              <PlusIcon className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="flex items-center gap-4">
                            <span className="font-medium">
                              ${(item.price * item.qty).toFixed(2)}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => removeItem(item.partnumber)}
                            >
                              <TrashIcon className="h-4 w-4 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* RIGHT */}
            <div>
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>Quote Summary</CardTitle>
                </CardHeader>

                <CardContent className="space-y-3">
                  {items.map((item: any) => (
                    <div
                      key={item.partnumber}
                      className="flex justify-between p-3 border rounded-md shadow-sm"
                    >
                      <div>
                        <div className="text-sm font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Qty: {item.qty}
                        </div>
                      </div>
                      <div className="font-semibold">
                        ${(item.price * item.qty).toFixed(2)}
                      </div>
                    </div>
                  ))}

                  <Separator />

                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-2">
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleSubmitQuote}
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? "Submitting..."
                      : "Submit Quote Request"}
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push("/portal/shop")}
                  >
                    Continue Shopping
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
