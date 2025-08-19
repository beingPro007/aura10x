"use client"

import { browserClient, getUserClient } from "@/lib/supabaseClient"
import axios from "axios"
import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

const PAGE_SIZE = 20

// Fetch one page of news
const fetchNewsPage = async (pageIndex: number) => {
  const user = await getUserClient()
  if (!user) throw new Error("No user logged in")

  const { data: profile, error: profileError } = await browserClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (profileError) throw profileError
  if (!profile?.intrests) throw new Error("No interests found for this user")

  const res = await axios.post("/api/dataPuller", {
    tableName: "items",
    categoriesToSearch: profile.intrests,
    userEmbedding: profile.embedding,
    page: pageIndex,
    limit: PAGE_SIZE,
  })

  if (!res?.data) throw new Error("No response data received from API")
  return res.data
}

const News = () => {
  const [items, setItems] = useState<any[]>([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const loadPage = async (pageIndex: number) => {
    try {
      setLoading(true)
      setError(null)
      const newItems = await fetchNewsPage(pageIndex)

      if (newItems.length < PAGE_SIZE) {
        setHasMore(false)
      }

      if (pageIndex === 0) {
        setItems(newItems) // first page replaces
      } else {
        setItems((prev) => [...prev, ...newItems]) // append
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPage(0)
  }, [])

  // Loading skeleton
  if (loading && items.length === 0) {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 p-2 sm:p-4">
        {[...Array(PAGE_SIZE)].map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full" />
          </Card>
        ))}
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="p-2 sm:p-4">
        <Card className="p-4">
          <CardContent className="text-destructive font-medium">
            Error: {error}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-2 sm:p-4">
      <h1 className="text-2xl font-bold tracking-tight text-muted-foreground">Your News Feed</h1>

      {items.length > 0 ? (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {items.map((item: any, index: number) => (
              <Link
                key={index}
                href={item.url || item.canonical_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Card className="hover:shadow-lg hover:border-primary transition-all cursor-pointer h-full flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-lg line-clamp-2">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-muted-foreground line-clamp-3 flex-grow">
                    {item.content && /<\/?[a-z][\s\S]*>/i.test(item.content)
                      ? item.content.replace(/<[^>]*>/g, "")
                      : item.content}
                  </CardContent>
                  <CardFooter className="text-sm text-muted-foreground flex justify-between">
                    <span>
                      {new Date(item.published_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                    <span>
                      {new Date(item.published_at).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center p-4">
              <button
                onClick={() => {
                  const nextPage = page + 1
                  setPage(nextPage)
                  loadPage(nextPage)
                }}
                disabled={loading}
                className="px-4 py-2 bg-primary text-white rounded-lg"
              >
                {loading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            No news found for your interests.
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default News
