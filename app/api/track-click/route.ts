import { serverClient } from "@/lib/supabaseServer";
import { NextRequest, NextResponse } from "next/server";

const LEARNING_RATE = 0.5;
const DECAY = 0.5;

export async function POST(request: NextRequest) {
  const { itemId } = await request.json();
  if (!itemId)
    return NextResponse.json(
      { error: "Missing required field: itemId" },
      { status: 400 },
    );

  const supabase = await serverClient();
  const user = await supabase.auth.getUser();
  if (!user?.data.user?.id)
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 401 },
    );

  try {
    const userid = user.data.user.id;

    const { data: articleData, error: articleError } = await supabase
      .from("items")
      .select("embedding")
      .eq("item_id", itemId)
      .single();
    if (articleError || !articleData?.embedding)
      return NextResponse.json(
        { error: "Article not found or embedding missing" },
        { status: 404 },
      );

    const { data: userData, error: userError } = await supabase
      .from("profiles")
      .select("embedding")
      .eq("id", userid)
      .single();
    if (userError || !userData?.embedding)
      return NextResponse.json(
        { error: "User profile not found or embedding missing" },
        { status: 404 },
      );

    const oldEmbeddingRaw = userData.embedding;
    const articleEmbeddingRaw = articleData.embedding;

    const oldEmbedding = Array.isArray(oldEmbeddingRaw)
      ? (oldEmbeddingRaw as number[])
      : JSON.parse(oldEmbeddingRaw as string);

    const articleEmbedding = Array.isArray(articleEmbeddingRaw)
      ? (articleEmbeddingRaw as number[])
      : JSON.parse(articleEmbeddingRaw as string);

    const maxLen = Math.max(oldEmbedding.length, articleEmbedding.length);
    while (oldEmbedding.length < maxLen) oldEmbedding.push(0);
    while (articleEmbedding.length < maxLen) articleEmbedding.push(0);

    const newUserEmbedding = oldEmbedding.map(
      (val: number, idx: number) =>
        val * (1 - LEARNING_RATE) * DECAY +
        articleEmbedding[idx] * LEARNING_RATE,
    );

    if (newUserEmbedding.some((v: unknown) => Number.isNaN(v))) {
      console.error("New embedding contains NaN, aborting update");
      return NextResponse.json(
        { error: "New embedding contains invalid numbers" },
        { status: 500 },
      );
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ embedding: newUserEmbedding })
      .eq("id", userid);

    if (updateError)
      return NextResponse.json(
        {
          error: "Failed to update user embedding",
          details: updateError.message,
        },
        { status: 500 },
      );

    return NextResponse.json({ success: true });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 },
    );
  }
}
