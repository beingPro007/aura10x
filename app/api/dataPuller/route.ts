import { serverClient } from "@/lib/supabaseServer"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { categoriesToSearch, tableName, userEmbedding, page = 0 } = await request.json()

    if (!tableName || typeof tableName !== "string") {
      return NextResponse.json({ error: "Invalid table name provided." }, { status: 400 })
    }

    const supabase = await serverClient()
    const PAGE_SIZE = 20

    const { data, error } = await supabase.rpc("get_similar_items", {
      query_embedding: userEmbedding,
      query_categories: categoriesToSearch,
      limit_count: PAGE_SIZE,
      offset_count: page * PAGE_SIZE,
    })
    console.log(`Fetching data from '${tableName}' with categories:`, categoriesToSearch, `and page:`, page);
    console.log(`Data fetched from '${tableName}':`, data)

    if (error) {
      console.error(`Error fetching data from '${tableName}':`, error)
      return NextResponse.json(
        { error: `Failed to fetch data from '${tableName}'.` },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error("Error fetching data:", error)
    return NextResponse.json({ error: "Failed to fetch data." }, { status: 500 })
  }
}
