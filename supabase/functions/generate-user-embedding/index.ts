import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
  {
    global: {
      headers: {
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
      },
    },
  }
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { record } = body ?? {};
    if (!record?.id) {
      return new Response(
        JSON.stringify({ error: 'Missing "id" in request body' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { bio, intrests, experience, id } = record;
    const interests = intrests || [];

    console.log("Generating embedding for user:", id);

    const userProfileText = `
      User Profile:
      Bio: ${bio || ""}
      Interests: ${interests.join(", ")}
      Experience: ${experience || ""}
    `.trim();

    const resp = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")!}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: userProfileText,
        model: "text-embedding-3-small",
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error("OpenAI error:", data);
      throw new Error(data.error?.message || "Failed to create embedding");
    }

    const userEmbedding = data.data[0].embedding;

    const { error } = await supabaseClient
      .from("profiles")
      .upsert(
        [{ id, bio, intrests, experience, embedding: userEmbedding }],
        { onConflict: ["id"] }
      );

    if (error) throw error;

    console.log(`User embedding stored for id: ${id}`);

    return new Response(
      JSON.stringify({ message: "User embedding created successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message ?? String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
