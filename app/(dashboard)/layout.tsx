'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Settings } from 'lucide-react'
import { UserMenu } from '@/components/auth/UserMenu'
import { Button } from '@/components/ui/button'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white">
        <div className="flex h-14 items-center px-4 gap-4">
          <Link href="/notebooks" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-black flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-bold text-lg leading-tight">LearnGraph</span>
              <span className="text-[10px] text-gray-500 leading-tight">by DrLee.AI</span>
            </div>
            <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-mono">v0.2.1</span>
          </Link>

          <div className="flex-1" />

          <nav className="flex items-center gap-2">
            <Button
              variant={pathname.startsWith('/notebooks') ? 'secondary' : 'ghost'}
              size="sm"
              asChild
            >
              <Link href="/notebooks">
                <BookOpen className="h-4 w-4 mr-2" />
                Notebooks
              </Link>
            </Button>
          </nav>

          <UserMenu />
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
