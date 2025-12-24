// frontend/components/require-auth.tsx
"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/log-in");
    }
  }, [loading, user, router]);

  if (loading) return <div className="p-6">Loading...</div>;
  return <>{user ? children : null}</>;
};
