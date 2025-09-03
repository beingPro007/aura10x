"use client";

import React from "react";
import Link from "next/link";
import { IconChevronDown, type Icon } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";

type NavItem = {
  title: string;
  url: string;
  icon?: Icon;
  children?: NavItem[];
};

export function NavMain({ items }: { items: NavItem[] }) {
  const [openItem, setOpenItem] = React.useState<string | null>(null);

  const toggleOpen = (title: string) => {
    setOpenItem(openItem === title ? null : title);
  };

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              {item.children ? (
                <>
                  <button
                    onClick={() => toggleOpen(item.title)}
                    className="flex w-full items-center justify-between px-2 py-1.5 text-sm font-medium hover:bg-accent rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      {item.icon && <item.icon className="size-4" />}
                      <span>{item.title}</span>
                    </div>
                    <IconChevronDown
                      className={`size-4 transition-transform ${
                        openItem === item.title ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Animate submenu open/close */}
                  <AnimatePresence initial={false}>
                    {openItem === item.title && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                      >
                        <SidebarMenuSub className="ml-4 mt-1 overflow-hidden">
                          {item.children.map((sub) => (
                            <SidebarMenuSubItem key={sub.title}>
                              <Link href={sub.url} passHref>
                                <SidebarMenuSubButton>
                                  {sub.icon && <sub.icon className="size-4" />}
                                  <span>{sub.title}</span>
                                </SidebarMenuSubButton>
                              </Link>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <Link href={item.url} passHref>
                  <SidebarMenuButton>
                    {item.icon && <item.icon className="size-4" />}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </Link>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
