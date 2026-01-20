import { SWRConfiguration } from 'swr'

// Shared fetcher for SWR
export const fetcher = async (url: string) => {
  const res = await fetch(url, {
    credentials: 'include', // Include cookies for authentication
  })
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.')
    const data = await res.json().catch(() => ({}))
    ;(error as any).info = data
    ;(error as any).status = res.status
    throw error
  }
  return res.json()
}

// Default SWR configuration for the app
export const swrConfig: SWRConfiguration = {
  fetcher,
  revalidateOnFocus: false, // Don't refetch when window regains focus
  revalidateIfStale: true,
  dedupingInterval: 5000, // Dedupe requests within 5 seconds
  errorRetryCount: 2,
  keepPreviousData: true, // Show stale data while revalidating
}
