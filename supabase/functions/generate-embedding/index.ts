import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function stripHtml(input: string): string {
  try {
    return input.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return input;
  }
}

function assertEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const OPENAI_API_KEY = assertEnv("OPENAI_API_KEY");
const SUPABASE_URL = assertEnv("SUPABASE_URL");
const SUPABASE_ANON_KEY = assertEnv("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = assertEnv("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } },
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { type, table, record, old_record } = body ?? {};

    console.log("Webhook:", JSON.stringify({ type, table }, null, 2));

    if (!record || (type !== "INSERT" && type !== "UPDATE")) {
      return new Response(
        JSON.stringify({ message: "Ignored: not an INSERT/UPDATE with record." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (table && table !== "items") {
      return new Response(
        JSON.stringify({ message: `Ignored: table ${table}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const itemId: string | undefined = record.item_id;
    const title: string | undefined = record.title;

    if (!itemId || !title) {
      console.log("Invalid payload (missing item_id/title):", JSON.stringify(body, null, 2));
      return new Response(
        JSON.stringify({ error: 'Invalid request: "record.item_id" and "record.title" are required.' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (record.embedding && Array.isArray(record.embedding) && record.embedding.length > 0) {
      console.log(`Skip: embedding already present for item ${itemId}`);
      return new Response(
        JSON.stringify({ message: `Embedding already exists for item ${itemId}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const textToEmbed = [
      title,
      record.summary || "",
      record.raw?.title || "",
      record.content ? stripHtml(record.content) : "",
    ]
      .filter((s: string) => s && s.trim().length > 0)
      .join("\n\n");

    console.log(`Embedding item_id=${itemId}, chars=${textToEmbed.length}`);

    const resp = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: textToEmbed,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error("OpenAI error:", data);
      throw new Error(data?.error?.message || "OpenAI embeddings request failed");
    }

    const embedding: number[] = data.data?.[0]?.embedding;
    if (!embedding || !Array.isArray(embedding)) {
      throw new Error("Invalid embedding response from OpenAI");
    }

    console.log(`Got embedding of length ${embedding.length}. Storing to DB...`);

    const { error } = await supabase
      .from("items")
      .update({ embedding })
      .eq("item_id", itemId);

    if (error) {
      console.error("Supabase update error:", error);
      throw error;
    }

    console.log(`Success: stored embedding for item ${itemId}`);
    return new Response(
      JSON.stringify({ message: `Embedding created for item ${itemId}`, dims: embedding.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("Handler error:", err);
    return new Response(
      JSON.stringify({ error: err?.message ?? String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
