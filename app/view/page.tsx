"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function ViewRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    // Check for legacy hash format and redirect
    const hash = window.location.hash
    if (hash && hash.length > 1) {
      // Legacy format, redirect to home
      router.push('/')
    } else {
      // No ID provided
      router.push('/')
    }
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Redirecting...</p>
    </div>
  )
}
