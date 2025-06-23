'use client'

import { useEffect } from 'react'
import { auth } from '@/auth'
import { LoginButton } from '@/components/login-button'
import { LoginForm } from '@/components/login-form'
import { Separator } from '@/components/ui/separator'
import { cookies } from 'next/headers'
import { useRouter } from 'next/navigation'

export default async function SignInPage() {
  const cookieStore = cookies()
  const session = await auth({ cookieStore })

  const router = useRouter()

  useEffect(() => {
    // If user is already logged in, redirect to home page
    if (session?.user) {
      router.push('/')
    }
  }, [session, router])

  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))] flex-col items-center justify-center py-10">
      <div className="w-full max-w-sm">
        <LoginForm action="sign-in" />
        <Separator className="my-4" />
        <div className="flex justify-center">
          <LoginButton />
        </div>
      </div>
    </div>
  )
}
