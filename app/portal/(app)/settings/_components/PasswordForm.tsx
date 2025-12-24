"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getApi, putApi } from "@/lib/apiClient";
import { toast } from "sonner";

export default function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errors, setErrors] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const validate = () => {
    const e = { current: "", new: "", confirm: "" };

    if (!currentPassword.trim()) e.current = "Current password is required.";
    if (!newPassword.trim()) e.new = "New password is required.";
    else if (newPassword.length < 8) e.new = "New password must be at least 8 characters.";
    if (confirmPassword !== newPassword) e.confirm = "Passwords do not match.";

    setErrors(e);
    return !e.current && !e.new && !e.confirm;
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!validate()) return;

  try {
    await putApi("/auth/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    });

    toast.success("Password updated successfully");

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setErrors({ current: "", new: "", confirm: "" });
  } catch (err: any) {
    toast.error(err?.message || "Failed to update password");
  }
};

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current Password</Label>
        <Input
          id="currentPassword"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        {errors.current && <p className="text-sm text-red-600">{errors.current}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">New Password</Label>
        <Input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        {errors.new && <p className="text-sm text-red-600">{errors.new}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {errors.confirm && <p className="text-sm text-red-600">{errors.confirm}</p>}
      </div>
      <Separator />
      <Button type="submit">Update Password</Button>
    </form>
  );
}
