"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const getUser = async () => {
  const auth = (await supabaseClient()).auth;
  const user = (await auth.getUser()).data.user;
  return user?.user_metadata;
};

const supabaseClient = async function createClient() {
  const cookieStore = await cookies();

  const supabaseClient = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );

  return supabaseClient;
};

export { getUser, supabaseClient as serverClient };
