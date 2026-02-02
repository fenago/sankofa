import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'LearnGraph - Teaching Students to Learn How to Learn',
  description: 'AI-powered significant learning that separates skills from content. Built on Fink\'s Taxonomy and 29 educational psychology frameworks. The goal: build learners who become more capable, not more dependent.',
  keywords: [
    'AI learning',
    'educational psychology',
    'Fink\'s Taxonomy',
    'Learning How to Learn',
    'Bloom\'s taxonomy',
    'knowledge graphs',
    'significant learning',
    'mastery-based learning',
    'Zone of Proximal Development',
    'Bayesian Knowledge Tracing',
    'adaptive learning',
    'metacognition',
    'scaffolding',
    'skill-content separation',
  ],
  openGraph: {
    title: 'LearnGraph - Teaching Students to Learn How to Learn',
    description: 'AI that builds capability, not dependency. Separate skills from content. Transform any material into significant learning using Fink\'s Taxonomy and 29 ed psych frameworks.',
    type: 'website',
    siteName: 'LearnGraph',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LearnGraph - Teaching Students to Learn How to Learn',
    description: 'AI that builds capability, not dependency. Built on Fink\'s Taxonomy of Significant Learning.',
  },
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
