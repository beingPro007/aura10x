// app/page.tsx
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabaseServer";

export default async function HomePage() {
  const user = await getUser();

  if (user) {
    redirect("/feed/news");
  }

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <div>
        You are not logged in. Please{" "}
        <a href="/auth/login" className="text-blue-500 hover:underline">
          log in
        </a>{" "}
        to continue.
      </div>
    </div>
  );
}
