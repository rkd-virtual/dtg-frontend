// frontend/contexts/auth-context.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApi, postApi } from "@/lib/apiClient";
import { Item, ItemMedia, ItemContent, ItemTitle } from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";
import Image from "next/image";

type UserShape = {
  id?: number;
  email?: string;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  job_title?: string | null;
  avatar?: string | null;
} | null;

export type SiteRow = {
  id: number;
  user_id: number;
  site_slug: string;
  label: string;
  is_default: boolean;
  created_at?: string | null;
};

type AuthContextType = {
  user: UserShape;
  sites: SiteRow[] | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (u: UserShape) => void;
  setSites: (s: SiteRow[] | null) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserShape>(null);
  const [sites, setSites] = useState<SiteRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function fetchMe() {
    try {
      const data: any = await getApi("/auth/me");
      if (!data) {
        setUser(null);
        return;
      }

      const normalized = {
        id: data?.id ?? undefined,
        email: data?.email ?? undefined,
        first_name: data?.first_name ?? null,
        last_name: data?.last_name ?? null,
        name:
          data?.name ??
          (data?.first_name ? `${data.first_name}${data?.last_name ? " " + data.last_name : ""}` : data?.email?.split("@")[0]) ??
          null,
        job_title: data?.job_title ?? null,
        avatar: data?.avatar ?? data?.profile_image ?? null,
      };

      setUser(normalized);
    } catch (err) {
      setUser(null);
    }
  }

  async function fetchSites() {
  try {
    const res: any = await getApi("/auth/sites");

    // Normalize backend response
    const rows = Array.isArray(res)
      ? res                       
      : Array.isArray(res?.data)
      ? res.data                  
      : [];

    setSites(rows);
  } catch {
    setSites(null);
  }
}

  // refresh both user and sites
  async function refresh() {
    setLoading(true);
    try {
      await Promise.all([fetchMe(), fetchSites()]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // initial load
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signOut() {
    try {
      await postApi("/auth/logout");
    } catch {
      // ignore network error — still clear locally
    } finally {
      // clear UI state and redirect to login
      setUser(null);
      setSites(null);
      try {
        sessionStorage.removeItem("pendingEmail");
        sessionStorage.removeItem("selectedAccount");
      } catch {}
      router.push("/log-in");
    }
  }

  // --- themed loader while auth initializes ---
  if (loading) {
    return (
    <div className="min-h-screen flex items-center justify-center bg-muted/10 p-6">
    <div className="flex flex-col items-center gap-6">

        {/* Start: Enhanced Loader Container */}
        <div className="relative w-40 h-40 flex items-center justify-center">

            {/* 1. Background Ring (Static, Muted) - Base for the spinner */}
            <div className="absolute inset-0 border-4 border-muted-foreground/10 rounded-full w-full h-full" />

            {/* 2. Top Rotating Ring (Primary Color) */}
            <Spinner
                size={120}
                className="text-green-500/80 absolute inset-0 m-auto animate-spin"
            />
            
            {/* 3. Logo (Refined Centering) */}
            <Image
                src="/DTG_Logo.svg"
                alt="DTG"
                width={80}
                height={80}
                className="relative z-10 w-24 h-24 object-contain transition-transform duration-1000 ease-in-out"
                style={{
                    // FIX: Reverting to a small negative vertical offset to achieve visual center, 
                    // relying mostly on the parent flex container for alignment.
                    transform: 'translateY(10px)', 
                    animation: 'scale-breathe 2s infinite alternate',
                }}
            />
        </div>
        {/* End: Enhanced Loader Container */}

        <div className="text-center mt-2">
            <div className="text-lg font-medium text-gray-800">Loading your data</div>
            <div className="text-sm text-muted-foreground">Please wait while we prepare your account.</div>
        </div>

    </div>    
    {/* Define custom keyframes if necessary for the 'scale-breathe' effect (optional, depends on your global CSS setup) */}
    {/* <style jsx global>{`
        @keyframes scale-breathe {
            from { transform: scale(1.0); }
            to { transform: scale(1.05); }
        }
    `}</style> 
    */}
    </div>    
    );
  }


  return (
    <AuthContext.Provider value={{ user, sites, loading, refresh, signOut, setUser, setSites }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside an AuthProvider");
  return ctx;
}
