"use client";

import { LogOut } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { logOutAction } from "@/app/actions/users";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      const { error } = await logOutAction();

      if (!error) {
        toast.success("Signed out successfully");
        router.push("/auth/login");
      } else {
        toast.error(error || "Sign out failed. Please try again.");
      }
    });
  };

  return (
    <DropdownMenuItem
      onClick={handleSignOut}
      disabled={isPending}
      className="flex items-center gap-2 cursor-pointer"
    >
      <LogOut className="h-4 w-4" />
      {isPending ? "Signing out..." : "Sign out"}
    </DropdownMenuItem>
  );
}
