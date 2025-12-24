// components/app-sidebar.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboardIcon,
  PackageIcon,
  StoreIcon,
  HeadphonesIcon,
  SettingsIcon,
  FileTextIcon,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { useAuth } from "@/contexts/auth-context";
import { useQuote } from "@/contexts/quote-context";
import { Item, ItemMedia, ItemContent, ItemTitle } from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";
import Image from "next/image";


const baseNav = [
  { title: "Dashboard", url: "/portal/dashboard", icon: LayoutDashboardIcon },
  { title: "Orders & Quotes", url: "/portal/orders-quotes", icon: PackageIcon },
  { title: "Shop", url: "/portal/shop", icon: StoreIcon },
  { title: "Quotes", url: "/portal/quotes", icon: FileTextIcon },
  { title: "Support", url: "/portal/support", icon: HeadphonesIcon },
];

const secondaryNav = [{ title: "Settings", url: "/portal/settings", icon: SettingsIcon }];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { user, loading, sites, signOut } = useAuth();
  const { clearQuote } = useQuote();

  const [openProfile, setOpenProfile] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const profileRef = React.useRef<HTMLDivElement | null>(null);
  const popoverRef = React.useRef<HTMLDivElement | null>(null);
  const [popoverStyle, setPopoverStyle] = React.useState<{ top: number; left: number } | null>(null);
  const [triangleTop, setTriangleTop] = React.useState<number | null>(null);

  // Outside click handler (unchanged)
  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      const insideProfile = profileRef.current?.contains(target as Node);
      const insidePopover = popoverRef.current?.contains(target as Node);
      if (!insideProfile && !insidePopover) setOpenProfile(false);
    }
    if (openProfile) document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [openProfile]);

  // position popover (unchanged)
  React.useEffect(() => {
    if (!openProfile) {
      setPopoverStyle(null);
      setTriangleTop(null);
      return;
    }
    const anchor = profileRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const popWidth = 220; // px
    const gap = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = rect.right + gap;
    if (left + popWidth + 8 > vw) {
      const leftPos = rect.left - popWidth - gap;
      if (leftPos >= 8) left = leftPos;
      else left = Math.min(Math.max(rect.right - popWidth, 8), vw - popWidth - 8);
    }

    const tempTop = Math.min(Math.max(rect.top, 8), Math.max(8, vh - 120 - 8));
    setPopoverStyle({ top: Math.round(tempTop), left: Math.round(left) });

    requestAnimationFrame(() => {
      const pop = popoverRef.current;
      if (!pop) return;
      const popHeight = pop.offsetHeight;
      const centerY = rect.top + rect.height / 2;
      let top = centerY - popHeight / 2;
      top = Math.min(Math.max(top, 8), Math.max(8, vh - popHeight - 8));
      const rawTriangleTop = centerY - top;
      const triangleClamped = Math.min(Math.max(rawTriangleTop, 12), popHeight - 12);

      setPopoverStyle({ top: Math.round(top), left: Math.round(left) });
      setTriangleTop(Math.round(triangleClamped));
    });
  }, [openProfile]);

  // display fallback user info
  const name =
    (user?.first_name || user?.last_name)
      ? `${user?.first_name ?? ""}${user?.first_name && user?.last_name ? " " : ""}${user?.last_name ?? ""}`.trim()
      : user?.name || "John Doe";
  const email = user?.email || "johndoe@example.com";

  // --- live update override for default site (CustomEvent) ---
  const [defaultSiteOverride, setDefaultSiteOverride] = React.useState<{
    id?: number;
    site_slug?: string;
    label?: string;
  } | null>(null);

  React.useEffect(() => {
    const handler = (ev: Event) => {
  try {
    const detail = (ev as CustomEvent).detail || {};

        // 1. Update sidebar UI instantly
        setDefaultSiteOverride({
          id: detail.id,
          site_slug: detail.site_slug,
          label: detail.label,
        });

        // 2. Update sessionStorage for the whole app
        if (detail.site_slug) {
          sessionStorage.setItem(
            "selectedAccount",
            detail.site_slug   // or detail.label, depending on what other pages use
          );
        }
      } catch (err) {
        console.error("dtg:defaultSiteChanged parse error", err);
      }
    };

    window.addEventListener("dtg:defaultSiteChanged", handler as EventListener);
    return () => window.removeEventListener("dtg:defaultSiteChanged", handler as EventListener);
  }, []);

  // Optional: clear override when sites update from server so authoritative data wins
  React.useEffect(() => {
    setDefaultSiteOverride(null);
  }, [sites]);

  // determine default site label — prefer override
  const defaultSiteLabel = React.useMemo(() => {
    if (defaultSiteOverride) {
      if (defaultSiteOverride.label) return defaultSiteOverride.label;
      if (defaultSiteOverride.site_slug) return `Amazon ${defaultSiteOverride.site_slug}`;
    }

    if (!sites || sites.length === 0) return null;
    const def = sites.find((s) => s.is_default) || sites[0];
    return def?.label ?? null;
  }, [sites, defaultSiteOverride]);

  

  // logout handler: show overlay until signOut completes
  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await signOut();
    } catch (err) {
      console.error("signOut failed", err);
    } 

    try {
    // clear in-memory context immediately so UI updates
    try {
      clearQuote();
    } catch (e) {
      console.warn("clearQuote failed", e);
    }

    // remove generic draft
    try {
      localStorage.removeItem("quote-items");
    } catch (e) {
      console.warn("Failed to remove quote-items", e);
    }
    
    try {
      const uid = user?.id ? String(user.id) : null;
      if (uid) localStorage.removeItem(`quote-items:${uid}`);
    } catch (e) {
      console.warn("Failed to remove per-user quote-items", e);
    }
  }
    finally {
      setIsLoggingOut(false);
      setOpenProfile(false);
    }
  }

  return (
    <>
      {/* {isLoggingOut && (
        <div aria-hidden={!isLoggingOut} className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 bg-white/90 px-6 py-4 rounded-md shadow-lg">
            <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <div className="text-sm font-medium text-gray-900">Signing out…</div>
          </div>
        </div>
      )} */}

      {isLoggingOut && (
  <div
    aria-hidden={!isLoggingOut}
    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
  >
    <div className="rounded-md bg-background/95 shadow-lg px-6 py-4 flex items-center gap-4 min-w-[200px]">
      {/* optional small logo on left — uncomment if you want */}
      {/* <img src="/DTG_Logo copy.svg" alt="DTG" className="w-8 h-8 object-contain" /> */}
        <Image src="/DTG_Logo.svg" alt="DTG" className="object-contain" width={35} height={35} />
      {/* spinner + content */}
      <Item variant="muted" className="bg-transparent border-transparent p-0">
        <ItemMedia>
          <Spinner size={20} className="text-primary" />
        </ItemMedia>
        <ItemContent className="pr-0">
          <ItemTitle className="text-sm font-medium">Signing out…</ItemTitle>
          <div className="text-xs text-muted-foreground">Please wait</div>
        </ItemContent>
      </Item>
    </div>
  </div>
)}

      <Sidebar collapsible="offcanvas" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5" >
                <Link href="/portal/dashboard" className="flex items-center">
                  {/* <img src="/DTG_Logo copy.svg" alt="Logo" width={48} height={48} className="flex-shrink-0" /> */}
                  <Image src="/DTG_Logo.svg" alt="DTG" className="flex-shrink-0" width={48} height={48} />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <NavMain items={baseNav} />
          <NavSecondary items={secondaryNav} className="mt-auto" />
        </SidebarContent>

        <SidebarFooter>
          <div className="w-full p-3" ref={profileRef} data-profile-area>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 text-gray-700 font-semibold text-lg select-none">
                {user?.first_name?.charAt(0)?.toUpperCase() || name?.charAt(0)?.toUpperCase() || "J"}
              </div>

              <div className="flex-1 min-w-0 bg-transparent">
                <div className="text-sm font-medium truncate">{loading ? "Loading..." : name}</div>
                <div className="text-xs text-gray-500 truncate">{loading ? "" : email}</div>
                {defaultSiteLabel && <div className="text-xs text-muted-foreground truncate mt-0.5">{defaultSiteLabel}</div>}
              </div>

              <div className="relative">
                <button
                  aria-label="Open profile menu"
                  onClick={() => setOpenProfile((s) => !s)}
                  className="ml-2 p-1 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-300"
                  title="Open profile menu"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-ellipsis-vertical ml-auto size-4" aria-hidden="true">
                    <circle cx="12" cy="5" r="1.5" />
                    <circle cx="12" cy="12" r="1.5" />
                    <circle cx="12" cy="19" r="1.5" />
                  </svg>
                </button>

                {openProfile && popoverStyle && (
                  <div
                    ref={popoverRef}
                    role="dialog"
                    aria-modal="false"
                    className="rounded-md border bg-white text-left shadow-lg z-50"
                    style={{
                      position: "fixed",
                      top: popoverStyle.top,
                      left: popoverStyle.left,
                      width: 220,
                      overflow: "visible",
                      paddingLeft: 0,
                    }}
                  >
                    {triangleTop !== null && (
                      <div
                        aria-hidden
                        style={{
                          position: "absolute",
                          left: -8,
                          top: triangleTop - 8,
                          width: 16,
                          height: 16,
                          pointerEvents: "none",
                          zIndex: 10,
                          overflow: "visible",
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" style={{ display: "block", transform: "translateY(0)" }} aria-hidden>
                          <defs>
                            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                              <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="rgba(16,24,40,0.06)" />
                            </filter>
                          </defs>
                          <polygon points="0,8 12,0 12,16" fill="#ffffff" filter="url(#shadow)" />
                        </svg>
                      </div>
                    )}

                    <div className="px-3 py-2">
                      <div className="text-sm font-semibold text-gray-800">{name}</div>
                      <div className="text-xs text-gray-500 truncate">{email}</div>                      
                    </div>

                    <div className="border-t" />

                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 disabled:opacity-60"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-600">
                        <path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M21 12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M13 19H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>Log out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
    </>
  );
}
