import { serverClient } from "@/lib/supabaseServer"
import { NextRequest, NextResponse } from "next/server"

const TABLE_CACHE_RULES = {
  items: { ttl: 200 },
  engineering_blog: { ttl: 3600 },
}

// Cache format: "tableName:page" → { data, expiry }
const tableCache = new Map<string, { data: any; expiry: number }>()

export async function POST(request: NextRequest) {
  try {
    const { categoriesToSearch, tableName, userEmbedding, page = 0 } = await request.json()

    if (!tableName || typeof tableName !== "string") {
      return NextResponse.json({ error: "Invalid table name provided." }, { status: 400 })
    }

    if (!(tableName in TABLE_CACHE_RULES)) {
      return NextResponse.json({ error: "Invalid table name provided." }, { status: 400 })
    }

    const { ttl } = TABLE_CACHE_RULES[tableName as keyof typeof TABLE_CACHE_RULES]
    const cacheKey = `${tableName}:${page}`
    const currentCache = tableCache.get(cacheKey)

    if (currentCache && currentCache.expiry > Date.now()) {
      return NextResponse.json(currentCache.data, { status: 200 })
    }

    const supabase = await serverClient()
    const PAGE_SIZE = 20

    const { data, error } = await supabase.rpc("get_similar_items", {
      query_embedding: userEmbedding,
      query_categories: categoriesToSearch,
      limit_count: PAGE_SIZE,
      offset_count: page * PAGE_SIZE,
    })

    if (error) {
      console.error(`Error fetching data from '${tableName}':`, error)
      return NextResponse.json(
        { error: `Failed to fetch data from '${tableName}'.` },
        { status: 500 }
      )
    }

    const newCacheEntry = {
      data,
      expiry: Date.now() + ttl * 1000,
    }
    tableCache.set(cacheKey, newCacheEntry)

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error("Error fetching data:", error)
    return NextResponse.json({ error: "Failed to fetch data." }, { status: 500 })
  }
}
