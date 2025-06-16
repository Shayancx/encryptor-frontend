"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  onSeek?: (percentage: number) => void
}

export function ProgressBar({ 
  value, 
  max = 100, 
  className,
  onSeek 
}: ProgressBarProps) {
  const progressRef = React.useRef<HTMLDivElement>(null)
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek || !progressRef.current) return

    const rect = progressRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const clickPercentage = (x / rect.width) * 100
    
    onSeek(Math.min(100, Math.max(0, clickPercentage)))
  }

  return (
    <div
      ref={progressRef}
      className={cn(
        "relative h-1 w-full bg-secondary rounded-full overflow-hidden cursor-pointer group",
        className
      )}
      onClick={handleClick}
    >
      <div
        className="absolute left-0 top-0 h-full bg-white/90 transition-all duration-100 ease-linear group-hover:bg-white"
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}
