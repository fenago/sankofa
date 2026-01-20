'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabaseRef = useRef<SupabaseClient | null>(null)

  // Create Supabase client lazily (memoized to ensure single instance)
  const supabase = useMemo(() => {
    // Skip during SSR
    if (typeof window === 'undefined') return null
    if (!supabaseRef.current) {
      try {
        supabaseRef.current = createClient()
      } catch (error) {
        console.error('Failed to create Supabase client:', error)
        return null
      }
    }
    return supabaseRef.current
  }, [])

  useEffect(() => {
    // Skip if no supabase client (SSR or initialization failed)
    if (!supabase) {
      setLoading(false)
      return
    }

    // Get initial session
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error('Failed to get user:', error)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const signOut = async () => {
    if (!supabase) {
      router.push('/login')
      return
    }
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return {
    user,
    loading,
    signOut,
    isAuthenticated: !!user,
  }
}
