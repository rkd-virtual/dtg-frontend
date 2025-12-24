// server component (no "use client" here)
// portal/(app)/settings/page.tsx

import { SiteHeader } from "@/components/site-header";
import SitesList from "./_components/SitesList"; 
import PersonalInfoForm from "./_components/PersonalInfoForm";
import PasswordForm from "./_components/PasswordForm";
import ShippingForm from "./_components/ShippingForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TabsWrapper from "./TabsWrapper"

export default function SettingsPage() {
  return (
    <>
      <SiteHeader title="Settings" />

      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account settings and preferences
            </p>
          </div>
        </div>
        <TabsWrapper>
        <Tabs defaultValue="account" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="sites">Amazon Sites</TabsTrigger>
          </TabsList>

          {/* ----------------------------- ACCOUNT TAB -------------------------------- */}
          <TabsContent value="account" className="space-y-4">

            {/* PERSONAL INFO */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Personal Information</CardTitle>
                <CardDescription>
                  Update your account details and personal information
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Client-side form handles loading, saving, errors */}
                <PersonalInfoForm />
              </CardContent>
            </Card>

            {/* PASSWORD */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Password</CardTitle>
                <CardDescription>
                  Change your password to keep your account secure
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <PasswordForm />
              </CardContent>              
            </Card>

            {/* SHIPPING INFORMATION */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Shipping Information</CardTitle>
                <CardDescription>
                  Provide the default shipping address and account used for fulfillment.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <ShippingForm />
              </CardContent>

            </Card>
            <span id="shipping"></span>
          </TabsContent>

          {/* ----------------------------- SITES TAB -------------------------------- */}
          <TabsContent value="sites" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Amazon Sites</CardTitle>
                <CardDescription>Manage your Amazon fulfillment center sites</CardDescription>
              </CardHeader>

              <CardContent>
                <SitesList />
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
        </TabsWrapper>
      </div>
    </>
  );
}
