'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Settings } from 'lucide-react'
import { UserMenu } from '@/components/auth/UserMenu'
import { Button } from '@/components/ui/button'
import { ParticlesBackground } from '@/components/ui/particles-background'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Particles Background */}
      <ParticlesBackground
        className="fixed inset-0"
        quantity={80}
        size={2}
        colors={["#9333ea", "#3b82f6", "#7c3aed", "#6366f1"]}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl">
        <div className="flex h-14 items-center px-4 gap-4">
          <Link href="/notebooks" className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/25 transition-shadow group-hover:shadow-primary/40">
              <BookOpen className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-bold text-lg leading-tight bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
                LearnGraph
              </span>
              <span className="text-[10px] text-muted-foreground leading-tight">by DrLee.AI</span>
            </div>
            <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-mono font-medium">
              v0.6.1
            </span>
          </Link>

          {/* Dr. Lee Logo */}
          <img
            src="/drleeLogo.webp"
            alt="Dr. Lee"
            className="h-8 opacity-70 hover:opacity-100 transition-opacity hidden sm:block"
          />

          <div className="flex-1" />

          <nav className="flex items-center gap-2">
            <Button
              variant={pathname.startsWith('/notebooks') ? 'default' : 'ghost'}
              size="sm"
              asChild
              className={pathname.startsWith('/notebooks') ? 'shadow-lg shadow-primary/25' : ''}
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
      <main className="container mx-auto px-4 py-6 relative z-10">
        {children}
      </main>
    </div>
  )
}
