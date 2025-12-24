"use client"

// portal/(app)/shop/page.tsx

import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { AlertCircle, SearchIcon, MinusIcon, PlusIcon } from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { useQuote } from "@/contexts/quote-context"
import { toast } from "sonner"

interface Product {
  id: number
  name: string
  partnumber: string
  category: string
  price: string
  description?: string
  notes?: string
  image?: string
  archived?: boolean
  requiresHardware?: string
}

export default function ShopPage() {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState("All Products")

  const { addItem, items: quoteItems } = useQuote()

  /* ----------------------------------------
   Fetch products
  ---------------------------------------- */
  useEffect(() => {
    const controller = new AbortController()

    const fetchProducts = async () => {
      try {
        setLoading(true)
        setError(null)

        const API_ROOT =
          process.env.NEXT_PUBLIC_SITES_API ??
          "https://dtg-backend.onrender.com/api"

        const res = await fetch(`${API_ROOT}/products`, {
          signal: controller.signal,
        })

        if (!res.ok) {
          throw new Error(`Failed to load products (${res.status})`)
        }

        const payload = await res.json()

        const productsArray =
          payload?.data?.products ??
          payload?.products ??
          payload?.data ??
          []

        if (!Array.isArray(productsArray)) {
          throw new Error("Invalid products response format")
        }

        const normalized: Product[] = productsArray
          .map((p: any) => ({
            ...p,
            price: p.price !== undefined ? String(p.price) : "0.00",
            partnumber: p.partnumber ?? p.partNumber ?? p.part ?? "",
            description: p.description ?? p.notes ?? "",
          }))
          .filter((p: Product) => !p.archived)

        setProducts(normalized)
      } catch (err) {
        if ((err as any)?.name !== "AbortError") {
          setError(err instanceof Error ? err.message : String(err))
          console.error(err)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
    return () => controller.abort()
  }, [])

  /* ----------------------------------------
   Group & sort products
  ---------------------------------------- */
  const productsByCategory = useMemo(() => {
    const grouped: Record<string, Product[]> = {}

    products.forEach((product) => {
      const category = product.category || "Other"
      if (!grouped[category]) grouped[category] = []
      grouped[category].push(product)
    })

    Object.keys(grouped).forEach((cat) => {
      grouped[cat].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      )
    })

    return grouped
  }, [products])

  const allCategories = useMemo(
    () =>
      Object.keys(productsByCategory).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" })
      ),
    [productsByCategory]
  )

  /* ----------------------------------------
   Filtering logic
  ---------------------------------------- */
  const filteredProductsByCategory = useMemo(() => {
    let base = productsByCategory

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const filtered: Record<string, Product[]> = {}

      Object.entries(productsByCategory).forEach(([category, items]) => {
        const matches = items.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.partnumber.toLowerCase().includes(q)
        )
        if (matches.length) filtered[category] = matches
      })

      base = filtered
    }

    if (selectedCategory !== "All Products") {
      base = {
        [selectedCategory]: base[selectedCategory] || [],
      }
    }

    return base
  }, [productsByCategory, searchQuery, selectedCategory])

  /* ----------------------------------------
   Quantity helpers
  ---------------------------------------- */
  const updateQuantity = (id: string, change: number) => {
    setQuantities((prev) => {
      const current = prev[id] ?? 1
      return { ...prev, [id]: Math.max(1, current + change) }
    })
  }

  const getQuantity = (id: string) => quantities[id] ?? 1

  /* ----------------------------------------
   Add to quote
  ---------------------------------------- */
  const handleAddToQuote = (product: Product) => {
    const quantity = getQuantity(product.partnumber)

    addItem({
      partnumber: product.partnumber,
      qty: quantity,
      name: product.name,
      description: product.description ?? product.notes ?? "",
      price: Number.parseFloat(String(product.price)) || 0,
      image: product.image,
      requiresHardware: product.requiresHardware ?? product.partnumber,
      id: product.partnumber,
    })

    setQuantities((prev) => {
      const updated = { ...prev }
      delete updated[product.partnumber]
      return updated
    })

    toast.success("Item added to the Quote successfully", {
      icon: <AlertCircle className="w-5 h-5 text-green-500" />,
    })
  }

  /* ----------------------------------------
   States
  ---------------------------------------- */
  if (loading) {
    return (
      <>
        <SiteHeader title="Shop" />
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <SiteHeader title="Shop" />
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-red-500">{error}</p>
        </div>
      </>
    )
  }

  /* ----------------------------------------
   Render
  ---------------------------------------- */
  return (
    <>
      <SiteHeader title="Shop" />

      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div>
          <h1 className="text-3xl font-bold">Shop</h1>
          <p className="text-muted-foreground">
            Browse our catalog and add items to your quote
          </p>
        </div>

        {/* Search */}
        <div className="sticky top-4 z-20 bg-white/90 backdrop-blur-sm rounded-md py-2 px-3 max-w-2xl">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === "All Products" ? "default" : "outline"}
            onClick={() => setSelectedCategory("All Products")}
          >
            All Products
          </Button>

          {allCategories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Products */}
        {allCategories
          .filter((cat) => (filteredProductsByCategory[cat] || []).length > 0)
          .map((category) => {
            const items = filteredProductsByCategory[category]

            return (
              <div key={category} className="space-y-4">
                <h2 className="text-xl font-semibold">{category}</h2>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {items.map((product) => {
                    const id = product.partnumber
                    const isAdded = quoteItems.some(
                      (qi) => qi.partnumber === product.partnumber
                    )
                    const priceNumber =
                      Number.parseFloat(String(product.price)) || 0

                    return (
                      <Card
                        key={id}
                        className="flex h-full flex-col"
                      >
                        <CardHeader className="space-y-3">
                          {product.image && (
                            <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}

                          <CardTitle className="text-base line-clamp-2">
                            {product.name}
                          </CardTitle>

                          <CardDescription className="text-xs">
                            Part #: {product.partnumber}
                          </CardDescription>
                        </CardHeader>

                        <CardContent className="flex flex-col flex-1">
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {product.description || product.notes}
                          </p>

                          <div className="mt-auto space-y-4 pt-4">
                            <div className="text-2xl font-bold">
                              ${priceNumber.toFixed(2)}
                            </div>

                            <div className="flex items-center justify-center gap-2 h-10">
                              {isAdded ? (
                                <div className="h-8 w-full" />
                              ) : (
                                <>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => updateQuantity(id, -1)}
                                  >
                                    <MinusIcon className="h-4 w-4" />
                                  </Button>

                                  <span className="w-10 text-center">
                                    {getQuantity(id)}
                                  </span>

                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => updateQuantity(id, 1)}
                                  >
                                    <PlusIcon className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>

                            <Button
                              className={`w-full h-10 ${
                                isAdded
                                  ? "bg-gray-200 text-gray-600 hover:bg-gray-200"
                                  : ""
                              }`}
                              disabled={isAdded}
                              onClick={() => handleAddToQuote(product)}
                            >
                              {isAdded ? "Item added" : "Add to Quote"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
      </div>
    </>
  )
}
