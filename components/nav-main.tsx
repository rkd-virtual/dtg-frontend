"use client"

import { MailIcon, PlusCircleIcon, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { useQuote } from "@/contexts/quote-context"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    exact?: boolean
  }[]
}) {
  const { getTotalItems } = useQuote()
  const quoteItemCount = getTotalItems()
  const pathname = usePathname() ?? ""
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            // exact match when specified, otherwise prefix match
            const isActive = item.exact ? pathname === item.url : pathname.startsWith(item.url)

            const Icon = item.icon

            return (
              <SidebarMenuItem key={item.title}>
                {/* set data-active on the SidebarMenuButton so shadcn styles that target [data-active="true"] apply */}
                <SidebarMenuButton tooltip={item.title} asChild data-active={isActive ? "true" : "false"}>
                  {/* using a regular <a> keeps this the same as your previous markup.
                      If you prefer client-side navigation, replace the <a> with a next/link setup,
                      but keep in mind how the shadcn component forwards props when using asChild. */}
                  <a href={item.url} aria-current={isActive ? "page" : undefined} className="flex items-center gap-2 w-full">
                    {Icon && <Icon className="w-4 h-4" />}
                    <span>{item.title}</span>

                    {item.title === "Quotes" && quoteItemCount > 0 && (
                      <Badge variant="default" className="ml-auto">
                        {quoteItemCount}
                      </Badge>
                    )}
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
