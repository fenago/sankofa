'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, PartyPopper, Star, ArrowRight } from 'lucide-react'

interface DiscoveryMomentProps {
  description?: string
  onComplete: () => void
}

export function DiscoveryMoment({ description, onComplete }: DiscoveryMomentProps) {
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter')
  const [confettiVisible, setConfettiVisible] = useState(false)

  useEffect(() => {
    // Animate in
    const enterTimer = setTimeout(() => {
      setPhase('show')
      setConfettiVisible(true)
    }, 100)

    // Auto-dismiss after a while if user doesn't interact
    const autoTimer = setTimeout(() => {
      handleContinue()
    }, 10000)

    return () => {
      clearTimeout(enterTimer)
      clearTimeout(autoTimer)
    }
  }, [])

  const handleContinue = () => {
    setPhase('exit')
    setTimeout(onComplete, 300)
  }

  const celebrationMessages = [
    "You figured it out yourself!",
    "That's the key insight!",
    "Excellent discovery!",
    "Your thinking led you there!",
    "Brilliant reasoning!",
  ]
  const message = celebrationMessages[Math.floor(Math.random() * celebrationMessages.length)]

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${
        phase === 'enter' ? 'opacity-0' :
        phase === 'show' ? 'opacity-100' :
        'opacity-0'
      }`}
    >
      {/* Confetti effect */}
      {confettiVisible && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <ConfettiPiece key={i} index={i} />
          ))}
        </div>
      )}

      <Card
        className={`w-full max-w-md mx-4 shadow-2xl border-amber-200 transition-transform duration-500 ${
          phase === 'show' ? 'scale-100' : 'scale-90'
        }`}
      >
        <CardContent className="pt-8 pb-6 text-center space-y-6">
          {/* Icon cluster */}
          <div className="relative inline-block">
            <div className="p-4 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full">
              <Sparkles className="h-12 w-12 text-amber-600" />
            </div>
            <div className="absolute -top-1 -right-1 p-1.5 bg-green-100 rounded-full animate-bounce">
              <Star className="h-5 w-5 text-green-600 fill-green-600" />
            </div>
            <div className="absolute -bottom-1 -left-1 p-1.5 bg-purple-100 rounded-full animate-pulse">
              <PartyPopper className="h-5 w-5 text-purple-600" />
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              {message}
            </h2>
            {description && (
              <p className="text-muted-foreground">
                {description}
              </p>
            )}
          </div>

          {/* Research note */}
          <div className="text-xs text-muted-foreground bg-muted rounded-lg p-3">
            <strong>Why this matters:</strong> Self-discovered insights are remembered
            2x longer than told answers (Ma et al., Nature 2025)
          </div>

          {/* Continue button */}
          <Button
            onClick={handleContinue}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            Continue Learning
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function ConfettiPiece({ index }: { index: number }) {
  const colors = [
    'bg-amber-400',
    'bg-orange-400',
    'bg-purple-400',
    'bg-green-400',
    'bg-blue-400',
    'bg-pink-400',
  ]

  const color = colors[index % colors.length]
  const left = Math.random() * 100
  const animationDuration = 2 + Math.random() * 2
  const delay = Math.random() * 0.5
  const size = 8 + Math.random() * 8
  const rotation = Math.random() * 360

  return (
    <div
      className={`absolute ${color} rounded-sm animate-fall`}
      style={{
        left: `${left}%`,
        top: '-20px',
        width: `${size}px`,
        height: `${size}px`,
        transform: `rotate(${rotation}deg)`,
        animation: `fall ${animationDuration}s ease-out ${delay}s forwards`,
      }}
    />
  )
}

// Add this to your global CSS or tailwind config
// @keyframes fall {
//   to {
//     transform: translateY(100vh) rotate(720deg);
//     opacity: 0;
//   }
// }

export default DiscoveryMoment
