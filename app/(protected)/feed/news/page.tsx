"use client"

import { browserClient, getUserClient } from "@/lib/supabaseClient"
import useSWR from "swr"
import axios from "axios"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import useSWRInfinite from "swr/infinite"


const fetchNews = async () => {
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
  })

  if (!res?.data) throw new Error("No response data received from API")
  return res.data
}

const News = () => {
  const { data, error, isLoading } = useSWR("news_blog", fetchNews, {
    revalidateOnFocus: false,
    dedupingInterval: 1000 * 60 * 5,
  })

  if (isLoading) {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 p-2 sm:p-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full" />
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-2 sm:p-4">
        <Card className="p-4">
          <CardContent className="text-destructive font-medium">
            Error: {error.message || "Something went wrong"}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-2 sm:p-4">
      <h1 className="text-2xl font-bold tracking-tight text-muted-foreground">Your News Feed</h1>
      {data && data.length > 0 ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {data.map((item: any, index: number) => (
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
