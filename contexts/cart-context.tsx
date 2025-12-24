"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

export interface CartItem {
  partNumber: string
  name: string
  price: string
  quantity: number
  image?: string
  notes?: string
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (partNumber: string) => void
  updateQuantity: (partNumber: string, quantity: number) => void
  clearCart: () => void
  getTotalItems: () => number
  getSubtotal: () => number
  getTax: () => number
  getShipping: () => number
  getTotal: () => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [mounted, setMounted] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem("cart-items")
    if (saved) {
      try {
        setItems(JSON.parse(saved))
      } catch (e) {
        console.error("Failed to load cart items", e)
      }
    }
  }, [])

  // Save to localStorage whenever items change
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("cart-items", JSON.stringify(items))
    }
  }, [items, mounted])

  const addItem = (newItem: CartItem) => {
    setItems((current) => {
      const existing = current.find((item) => item.partNumber === newItem.partNumber)
      if (existing) {
        return current.map((item) =>
          item.partNumber === newItem.partNumber
            ? { ...item, quantity: item.quantity + newItem.quantity }
            : item
        )
      }
      return [...current, newItem]
    })
  }

  const removeItem = (partNumber: string) => {
    setItems((current) => current.filter((item) => item.partNumber !== partNumber))
  }

  const updateQuantity = (partNumber: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(partNumber)
      return
    }
    setItems((current) =>
      current.map((item) =>
        item.partNumber === partNumber ? { ...item, quantity } : item
      )
    )
  }

  const clearCart = () => {
    setItems([])
  }

  const getTotalItems = () => {
    return items.reduce((sum, item) => sum + item.quantity, 0)
  }

  const getSubtotal = () => {
    return items.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0
      return sum + price * item.quantity
    }, 0)
  }

  const getTax = () => {
    return getSubtotal() * 0.08
  }

  const getShipping = () => {
    return items.length > 0 ? 9.99 : 0
  }

  const getTotal = () => {
    return getSubtotal() + getTax() + getShipping()
  }

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getTotalItems,
        getSubtotal,
        getTax,
        getShipping,
        getTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
