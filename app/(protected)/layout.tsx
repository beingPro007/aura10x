// app/(protected)/layout.tsx
import React, { ReactNode } from "react";
import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabaseServer";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

interface ProtectedLayoutProps {
  children: ReactNode;
}

const ProtectedLayout = async ({ children }: ProtectedLayoutProps) => {
  const supabase = await serverClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  // ✅ Check onboarding progress
  const { data: profiles } = await supabase
    .from("profiles")
    .select("intrests")
    .eq("id", user.id)
    .single();

  console.log("Profiles: ", profiles)
  
  // If intrests not filled, redirect to onboarding
  if (!profiles?.intrests || profiles.intrests.length === 0) {
    redirect("/onboarding");
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default ProtectedLayout;
