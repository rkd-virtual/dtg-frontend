"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LoaderIcon } from "lucide-react";
import { getApi } from "@/lib/apiClient";

type PersonalData = {
  first_name: string;
  last_name: string;
  email: string;
  job_title?: string;
  other_accounts?: string[];
};

export default function PersonalInfoForm() {
  const [data, setData] = useState<PersonalData | null>(null);
  const [loading, setLoading] = useState(true);

  /* ------------------ LOAD DATA ------------------ */

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      try {
        const me = await getApi("/auth/me");

        if (!cancelled && me) {
          setData({
            first_name: me.first_name ?? "",
            last_name: me.last_name ?? "",
            email: me.email ?? "",
            job_title: me.job_title ?? "",
            other_accounts: Array.isArray(me.other_accounts)
              ? me.other_accounts
              : [],
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ------------------ HELPERS ------------------ */

  function updateField<K extends keyof PersonalData>(
    key: K,
    value: PersonalData[K]
  ) {
    setData((d) => (d ? { ...d, [key]: value } : d));
  }

  function otherAccountsToString(list?: string[]) {
    if (!list || list.length === 0) return "";
    return list.join(", ");
  }

  function parseOtherAccounts(str: string) {
    return str
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  /* ------------------ UI ------------------ */

  if (loading)
    return (
      <div className="p-4">
        <LoaderIcon className="h-5 w-5 animate-spin" />
      </div>
    );

  if (!data)
    return <div className="p-4 text-red-600">No personal data available.</div>;

  return (
    <form className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={data.first_name}
            onChange={(e) => updateField("first_name", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={data.last_name}
            onChange={(e) => updateField("last_name", e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={data.email} readOnly disabled />
        </div>

        <div className="space-y-2">
          <Label htmlFor="other_accounts">Other Accounts</Label>
          <Input
            id="other_accounts"
            value={otherAccountsToString(data.other_accounts)}
            onChange={(e) =>
              updateField(
                "other_accounts",
                parseOtherAccounts(e.target.value) as any
              )
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="job_title">Job Title</Label>
        <Input
          id="job_title"
          value={data.job_title ?? ""}
          onChange={(e) => updateField("job_title", e.target.value)}
        />
      </div>

      <Separator />

      <Button type="button" disabled>
        Save Changes
      </Button>
    </form>
  );
}
