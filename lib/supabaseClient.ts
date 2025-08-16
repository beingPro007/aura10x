'use client'
import { createBrowserClient } from '@supabase/ssr'
import { configDotenv } from 'dotenv'

const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function getUserClient() {
    const { data: { user } } = await supabase.auth.getUser()
    return user || null
}

export {supabase as browserClient}