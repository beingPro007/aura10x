"use client";

import { browserClient, getUserClient } from "@/lib/supabaseClient";
import axios from "axios";
import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

const PAGE_SIZE = 20;

type NewsItem = {
  item_id: string;
  title: string;
  content: string;
  url?: string;
  canonical_url?: string;
  published_at: string;
};

const fetchNewsPage = async (pageIndex: number) => {
  const user = await getUserClient();
  if (!user) throw new Error("No user logged in");

  const { data: profile, error: profileError } = await browserClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError) throw profileError;
  if (!profile?.intrests) throw new Error("No interests found for this user");

  const res = await axios.post("/api/dataPuller", {
    tableName: "items",
    categoriesToSearch: profile.intrests,
    userEmbedding: profile.embedding,
    page: pageIndex,
    limit: PAGE_SIZE,
  });

  if (!res?.data) throw new Error("No response data received from API");
  return res.data as NewsItem[];
};

const News = () => {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadPage = async (pageIndex: number) => {
    try {
      setLoading(true);
      const newItems = await fetchNewsPage(pageIndex);
      if (newItems.length < PAGE_SIZE) setHasMore(false);

      if (pageIndex === 0) {
        setItems(newItems);
      } else {
        setItems((prev) => [...prev, ...newItems]);
      }
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage(0);
  }, []);

  const handleCardClick = async (itemId: string) => {
    try {
      await fetch("/api/track-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
    } catch (err) {
      console.error("Error tracking click:", err);
    }
  };

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
    );
  }

  if (error) {
    return (
      <div className="p-2 sm:p-4">
        <Card className="p-4">
          <CardContent className="text-destructive font-medium">
            Error: {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          No news found for your interests.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 p-2 sm:p-4">
      {items.map((item) => (
        <Link
          key={item.item_id}
          href={item.url || item.canonical_url || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <Card
            onClick={() => handleCardClick(item.item_id)}
            className="hover:shadow-lg hover:border-primary transition-all cursor-pointer h-full flex flex-col"
          >
            <CardHeader>
              <CardTitle className="text-lg line-clamp-2">
                {item.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground line-clamp-3 flex-grow">
              {item.content?.replace(/<[^>]*>/g, "")}
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

      {hasMore && (
        <div className="flex justify-center p-4 col-span-full">
          <button
            onClick={() => {
              const nextPage = page + 1;
              setPage(nextPage);
              loadPage(nextPage);
            }}
            disabled={loading}
            className="px-4 py-2 bg-primary text-white rounded-lg"
          >
            {loading ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
};

export default News;
