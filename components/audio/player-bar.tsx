"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import AudioPlayer from "react-h5-audio-player"
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat,
  Volume2,
  ChevronUp,
  Download,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProgressBar } from "@/components/ui/progress-bar"
import { cn } from "@/lib/utils"
import "react-h5-audio-player/lib/styles.css"

interface PlayerBarProps {
  currentSong?: {
    id: string
    metadata: {
      title: string
      artist: string
      album: string
      picture?: string
    }
    url: string
  }
  isOpen: boolean
  onClose: () => void
  onPrevious: () => void
  onNext: () => void
  onDownload: () => void
  isPlaying: boolean
  onPlayPause: (playing: boolean) => void
  shuffle: boolean
  onShuffleToggle: () => void
  repeat: 'none' | 'all' | 'one'
  onRepeatToggle: () => void
}

export function PlayerBar({
  currentSong,
  isOpen,
  onClose,
  onPrevious,
  onNext,
  onDownload,
  isPlaying,
  onPlayPause,
  shuffle,
  onShuffleToggle,
  repeat,
  onRepeatToggle
}: PlayerBarProps) {
  const playerRef = useRef<AudioPlayer>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(70)
  const [isReady, setIsReady] = useState(false)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Reset states when song changes
  useEffect(() => {
    setCurrentTime(0)
    setDuration(0)
    setIsReady(false)
  }, [currentSong?.id])

  // Update volume
  useEffect(() => {
    if (playerRef.current?.audio.current && isReady) {
      playerRef.current.audio.current.volume = volume / 100
    }
  }, [volume, isReady])

  // Handle play/pause and progress tracking
  useEffect(() => {
    if (!playerRef.current?.audio.current || !isReady) return

    const audio = playerRef.current.audio.current

    if (isPlaying) {
      audio.play().catch(e => {
        console.warn('Playback failed:', e)
        onPlayPause(false)
      })
      
      // Start progress tracking
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      
      progressIntervalRef.current = setInterval(() => {
        if (!audio.paused && !audio.ended) {
          setCurrentTime(audio.currentTime)
        }
      }, 100) // Update every 100ms for smooth progress
      
    } else {
      audio.pause()
      
      // Stop progress tracking
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [isPlaying, isReady, onPlayPause])

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSeek = useCallback((percentage: number) => {
    if (playerRef.current?.audio.current && duration) {
      const newTime = (percentage / 100) * duration
      playerRef.current.audio.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }, [duration])

  const handleVolumeChange = useCallback((percentage: number) => {
    setVolume(percentage)
  }, [])

  const handlePlayPause = useCallback(() => {
    if (!playerRef.current?.audio.current || !isReady) return
    
    if (isPlaying) {
      playerRef.current.audio.current.pause()
      onPlayPause(false)
    } else {
      playerRef.current.audio.current.play().catch(e => {
        console.warn('Playback failed:', e)
        onPlayPause(false)
      })
      onPlayPause(true)
    }
  }, [isPlaying, isReady, onPlayPause])

  if (!isOpen || !currentSong) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-2xl z-50 animate-in slide-in-from-bottom duration-300">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-4 py-3">
          {/* Song Info */}
          <div className="flex items-center gap-3 w-80">
            {currentSong.metadata.picture ? (
              <img
                src={currentSong.metadata.picture}
                alt={currentSong.metadata.album}
                className="w-14 h-14 rounded shadow-md object-cover"
              />
            ) : (
              <div className="w-14 h-14 bg-muted rounded flex items-center justify-center">
                <ChevronUp className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-medium truncate">{currentSong.metadata.title}</p>
              <p className="text-sm text-muted-foreground truncate">
                {currentSong.metadata.artist}
              </p>
            </div>
          </div>

          {/* Center Controls */}
          <div className="flex-1 max-w-2xl mx-auto">
            {/* Control Buttons */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8", shuffle && "text-primary")}
                onClick={onShuffleToggle}
              >
                <Shuffle className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onPrevious}
              >
                <SkipBack className="h-4 w-4" />
              </Button>

              <Button
                variant="default"
                size="icon"
                className="h-10 w-10"
                onClick={handlePlayPause}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onNext}
              >
                <SkipForward className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8 relative", repeat !== 'none' && "text-primary")}
                onClick={onRepeatToggle}
              >
                <Repeat className="h-4 w-4" />
                {repeat === 'one' && (
                  <span className="absolute -bottom-1 text-[10px] font-bold">1</span>
                )}
              </Button>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-10 text-right">
                {formatTime(currentTime)}
              </span>
              <ProgressBar
                value={currentTime}
                max={duration || 100}
                onSeek={handleSeek}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-10">
                {formatTime(duration)}
              </span>
            </div>

            {/* Hidden Audio Player */}
            <div className="hidden">
              <AudioPlayer
                ref={playerRef}
                src={currentSong.url}
                onLoadedMetadata={(e: any) => {
                  const audioDuration = e.target.duration
                  if (audioDuration && !isNaN(audioDuration)) {
                    setDuration(audioDuration)
                    setIsReady(true)
                  }
                }}
                onCanPlay={() => setIsReady(true)}
                onPlay={() => onPlayPause(true)}
                onPause={() => onPlayPause(false)}
                onTimeUpdate={(e: any) => {
                  // Backup progress tracking
                  setCurrentTime(e.target.currentTime)
                }}
                onEnded={() => {
                  setCurrentTime(0)
                  onNext()
                }}
                autoPlayAfterSrcChange={false}
                showJumpControls={false}
                showSkipControls={false}
                customControlsSection={[]}
                customProgressBarSection={[]}
                customVolumeControls={[]}
                preload="metadata"
              />
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 w-80 justify-end">
            {/* Volume */}
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <div className="w-24">
                <ProgressBar
                  value={volume}
                  max={100}
                  onSeek={handleVolumeChange}
                />
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onDownload}
            >
              <Download className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
