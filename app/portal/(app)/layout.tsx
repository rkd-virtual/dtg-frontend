// app/portal/(app)/layout.tsx
"use client";

import React from "react";
import { AppSidebar } from "@/components/app-sidebar"; // default or named import based on your export (see note)
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { QuoteProvider } from "@/contexts/quote-context";
import { CartProvider } from "@/contexts/cart-context";
import { AuthProvider } from "@/contexts/auth-context";
import { RequireAuth } from "@/components/require-auth";
import { Toaster } from "sonner";

/**
 * Portal layout that provides sidebar, cart and quote contexts.
 * - Do NOT include <html> or <body> here.
 * - Keep the AppSidebar inside SidebarProvider so useSidebar() works.
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <QuoteProvider>
        <AuthProvider>
          <SidebarProvider>
            {/* wrapper used by sidebar css (group classes are applied by SidebarProvider) */}
            <div className="group/sidebar-wrapper flex min-h-screen w-full">
              {/* Real sidebar */}
              <AppSidebar variant="inset" />
              {/* Main content area (the SidebarInset component already has styling) */}
              <SidebarInset>
                <RequireAuth>
                    {children}
                </RequireAuth>               
              </SidebarInset>
            </div>
          </SidebarProvider>
        </AuthProvider>
      </QuoteProvider>
    </CartProvider>
  );
}
