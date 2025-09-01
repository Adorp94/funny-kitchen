'use client'

import { useEffect, useState } from 'react'

/**
 * Hook to detect when component has hydrated on the client
 * Prevents hydration mismatches by ensuring server and client render the same initially
 */
export function useHydration() {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  return isHydrated
}