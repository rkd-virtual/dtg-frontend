"use client"

import { useEffect, useState } from "react"

export default function TabsWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    if (window.location.hash === "#shipping") {
      setTimeout(() => {
        const el = document.getElementById("shipping")
        el?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 120)
    }
  }, [])

  return <>{children}</>
}
