"use client"

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
import { MinusIcon, PlusIcon, TrashIcon, ShoppingCartIcon } from "lucide-react"
import { useCart } from "@/contexts/cart-context"
import { useRouter } from "next/navigation"

export default function CartPage() {
  const { items, updateQuantity, removeItem, getSubtotal, getTax, getShipping, getTotal, getTotalItems } = useCart()
  const router = useRouter()

  if (items.length === 0) {
    return (
      <>
        <SiteHeader title="Cart" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
          <ShoppingCartIcon className="h-24 w-24 text-muted-foreground" />
          <div className="text-center">
            <h2 className="text-2xl font-bold">Your cart is empty</h2>
            <p className="text-muted-foreground mt-2">
              Add items from the shop to get started
            </p>
          </div>
          <Button onClick={() => router.push("/shop")} size="lg">
            Continue Shopping
          </Button>
        </div>
      </>
    )
  }

  return (
    <>
      <SiteHeader title="Cart" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Shopping Cart</h1>
            <p className="text-muted-foreground">
              {getTotalItems()} items in your cart
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <Card key={item.partNumber}>
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <div className="h-24 w-24 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          No image
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{item.name}</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            Part #: {item.partNumber}
                          </p>
                          {item.notes && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {item.notes}
                            </p>
                          )}
                        </div>
                        <p className="font-semibold">
                          ${parseFloat(item.price).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.partNumber, item.quantity - 1)}
                          >
                            <MinusIcon className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.partNumber, item.quantity + 1)}
                          >
                            <PlusIcon className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => removeItem(item.partNumber)}
                        >
                          <TrashIcon className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">${getSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-medium">${getShipping().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax (8%)</span>
                  <span className="font-medium">${getTax().toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-lg">${getTotal().toFixed(2)}</span>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button className="w-full" size="lg">
                  Proceed to Checkout
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/shop")}
                >
                  Continue Shopping
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
