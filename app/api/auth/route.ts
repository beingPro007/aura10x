import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabaseServer";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/";
  console.log("Next URL:", next);
  if (!next.startsWith("/")) {
    next = "/feed/news";
  }

  console.log("Auth Code:", code);

  if (code) {
    const supabase = await serverClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      console.log("Session updated successfully");
      const forwardedHost = request.headers.get("x-forwarded-host"); // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}/feed/news`);
      } else if (forwardedHost) {
        return NextResponse.redirect(
          `https://${forwardedHost}${next}/feed/news`,
        );
      } else {
        return NextResponse.redirect(`${origin}${next}/feed/news`);
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(
    `${origin}/auth/error?message=Login%20failed.%20Please%20try%20again.`,
  );
}
