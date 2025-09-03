// /app/(protected)/layout.tsx

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
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login");
  }

  // Now we only need to check the reliable status flag.
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete") // <-- SELECT THE NEW COLUMN
    .eq("id", user.id)
    .single();

  console.log("profile", profile);

  if (!profile || !profile.onboarding_complete) {
    // <-- CHECK THE NEW COLUMN
    redirect("/onboarding");
  }

  // Render protected layout
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
