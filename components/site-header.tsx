import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggler } from "./theme-toggler"

export function SiteHeader() {
  return (
    <header className="flex h-[--header-height] shrink-0 items-center border-b bg-background text-foreground transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-[--header-height]">
      <div className="flex w-full items-center justify-between px-4 lg:px-6">
        {/* Left: Sidebar Trigger */}
        <SidebarTrigger className="text-foreground" />

        {/* Right: Theme Toggler */}
        <div className="mb-2 mt-2">
          <ThemeToggler />
        </div>
      </div>
    </header>
  )
}
