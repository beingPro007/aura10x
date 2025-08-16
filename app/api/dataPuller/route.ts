import { serverClient } from "@/lib/supabaseServer"
import { NextRequest, NextResponse } from "next/server"

const CACHE_TTL = 200 // seconds
let cache: { data: any; expiry: number } | null = null

export async function POST(request: NextRequest) {
  try {
    const { categoriesToSearch } = await request.json()

    if (!Array.isArray(categoriesToSearch)) {
      return NextResponse.json({ error: "Invalid format. Expected an array." }, { status: 400 })
    }

    if (cache && cache.expiry > Date.now()) {
      return NextResponse.json(cache.data, { status: 200 })
    }

    const supabase = await serverClient()
    const feeds = await supabase
      .from("items")
      .select()
      .overlaps("categories", categoriesToSearch)
      .order("published_at", { ascending: false })

    cache = {
      data: feeds.data,
      expiry: Date.now() + CACHE_TTL * 1000,
    }

    return NextResponse.json(feeds.data, { status: 200 })
  } catch (error) {
    console.error("Error fetching data:", error)
    return NextResponse.json({ error: "Failed to fetch data." }, { status: 500 })
  }
}
