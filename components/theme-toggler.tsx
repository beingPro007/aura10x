"use client"
import { useEffect, useState } from "react"
import { Button } from "./ui/button"

export function ThemeToggler() {
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark"
    }
    return false
  })

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }, [dark])

  return (
    <div className="flex justify-center">
      <Button
        onClick={() => setDark(d => !d)}
        aria-label="Toggle theme"
        className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1 text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        {dark ? "🌙 Dark" : "☀️ Light"}
      </Button>
    </div>
  )
}
