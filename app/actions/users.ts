"use server";

import { serverClient } from "@/lib/supabaseServer";
import { Provider } from "@supabase/supabase-js";

export const loginAction = async (provider: Provider) => {
  try {
    const supabase = await serverClient();
    const baseUrl =
      process.env[
        `NEXT_PUBLIC_${process.env.NODE_ENV === "development" ? "LOCAL" : "PROD"}_BASE_URL`
      ];
    console.log(baseUrl);

    const { error, data } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${baseUrl}/api/auth`,
      },
    });

    console.log("Login Action:", { provider, error, data });

    if (error) {
      console.error("Login error:", error);
      return { error: error.message };
    }

    return { url: data.url, error: null };
  } catch (error) {
    console.error("Error during login:", error);
    return { error: "Login failed. Please try again." };
  }
};

export const logOutAction = async () => {
  try {
    const supabase = await serverClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      return { error: error.message };
    }

    return { error: null };
  } catch (error) {
    console.error("Error during logout:", error);
    return { error: "Logout failed. Please try again." };
  }
};
