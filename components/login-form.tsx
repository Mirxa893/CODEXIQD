'use client'

import * as React from 'react' // Add this import
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { IconSpinner } from '@/components/ui/icons'
import { Input } from './ui/input'
import { Label } from './ui/label'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export function LoginForm({ action = 'sign-in', ...props }) {
  const [isLoading, setIsLoading] = React.useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const [formState, setFormState] = React.useState({
    email: '',
    password: ''
  })

  const signIn = async () => {
    const { email, password } = formState
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return error
  }

  const signUp = async () => {
    const { email, password } = formState
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/api/auth/callback` }
    })
    if (!error && !data.session)
      toast.success('Check your inbox to confirm your email address!')
    return error
  }

  const signInWithGoogle = async () => {
    setIsLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    })

    if (error) {
      setIsLoading(false)
      toast.error(error.message)
    } else {
      const { data: session } = await supabase.auth.getSession()
      if (session) {
        // If session exists, redirect to homepage immediately
        router.replace('/') // This ensures page redirect
      } else {
        setIsLoading(false)
      }
    }
  }

  useEffect(() => {
    const checkSession = async () => {
      const { data: session } = await supabase.auth.getSession()
      if (session) {
        // If session exists, redirect immediately after login
        router.replace('/') // Redirect to homepage
      }
    }
    checkSession()
  }, [router, supabase.auth])

  const handleOnSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    const error = action === 'sign-in' ? await signIn() : await signUp()

    if (error) {
      setIsLoading(false)
      toast.error(error.message)
      return
    }

    setIsLoading(false)
    const { data: session } = await supabase.auth.getSession()
    if (session) {
      router.replace('/') // Redirect to homepage after sign-in or sign-up
    }
  }

  return (
    <div {...props}>
      <form onSubmit={handleOnSubmit}>
        <fieldset className="flex flex-col gap-y-4">
          <div className="flex flex-col gap-y-1">
            <Label>Email</Label>
            <Input
              name="email"
              type="email"
              value={formState.email}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  email: e.target.value
                }))
              }
            />
          </div>
          <div className="flex flex-col gap-y-1">
            <Label>Password</Label>
            <Input
              name="password"
              type="password"
              value={formState.password}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  password: e.target.value
                }))
              }
            />
          </div>
        </fieldset>

        <div className="mt-4 flex items-center">
          <Button disabled={isLoading}>
            {isLoading && <IconSpinner className="mr-2 animate-spin" />}
            {action === 'sign-in' ? 'Sign In' : 'Sign Up'}
          </Button>
          <p className="ml-4">
            {action === 'sign-in' ? (
              <>
                Don&apos;t have an account?{' '}
                <Link href="/sign-up" className="font-medium">
                  Sign Up
                </Link>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <Link href="/sign-in" className="font-medium">
                  Sign In
                </Link>
              </>
            )}
          </p>
        </div>

        {/* Google Login Button */}
        <div className="mt-4">
          <Button
            variant="outline"
            onClick={signInWithGoogle}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <IconSpinner className="mr-2 animate-spin" />
            ) : (
              'Login with Google'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
