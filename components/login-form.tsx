'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useState, useTransition } from 'react'
import { Provider } from '@supabase/supabase-js'
import { loginAction } from '@/app/actions/users'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { log } from 'console'

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSocialLogin = async (provider: Provider) => {
    console.log('Initiating login with provider:', provider)
    startTransition(async () => {
      const {error, url} = await loginAction(provider)


      if(!error && url) {
        toast.success('Login successful')
        router.push(url)
      } else {
        toast.error(error || 'Login failed. Please try again.')
      }
    })
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Welcome!</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onClick={() => handleSocialLogin('github')} className="flex flex-col gap-4">
            <div className="flex flex-col gap-6">
              {error && <p className="text-sm text-destructive-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Logging in...' : 'Continue with Github'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
