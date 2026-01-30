'use client'

import { ParticlesBackground } from '@/components/ui/particles-background'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-accent/20 relative overflow-hidden">
      {/* Particles Background */}
      <ParticlesBackground
        particleDensity={40}
        minSize={3}
        maxSize={7}
        speed={1.5}
      />

      <div className="w-full max-w-md px-4 relative z-10">
        {children}
      </div>
    </div>
  )
}
