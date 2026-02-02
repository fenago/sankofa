import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'LearnGraph - AI-Powered Learning Paths Built on Educational Psychology',
  description: 'Transform any content into personalized mastery paths using 29 research-backed educational psychology frameworks. NotebookLM for educators.',
  keywords: [
    'AI learning',
    'educational psychology',
    'Bloom\'s taxonomy',
    'knowledge graphs',
    'personalized learning',
    'mastery-based learning',
    'Zone of Proximal Development',
    'Bayesian Knowledge Tracing',
    'adaptive learning',
    'NotebookLM alternative',
  ],
  openGraph: {
    title: 'LearnGraph - AI-Powered Learning Paths',
    description: 'Transform content into mastery paths using 29 educational psychology frameworks.',
    type: 'website',
  },
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
