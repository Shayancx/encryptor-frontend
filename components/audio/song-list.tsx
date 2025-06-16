"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import * as mm from "music-metadata-browser"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Play, Music2, Clock, Pause } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SongMetadata {
  title: string
  artist: string
  album: string
  duration: number
  picture?: string
}

export interface Song {
  id: string
  filename: string
  url: string
  size: number
  data: ArrayBuffer
  metadata: SongMetadata
}

interface SongListProps {
  files: Array<{
    filename: string
    mimetype: string
    size: number
    blobUrl?: string
    data: ArrayBuffer
  }>
  onPlaySong: (song: Song, index: number) => void
  currentSongId?: string
  isPlaying?: boolean
  onSongsLoaded?: (songs: Song[]) => void
}

export function SongList({ 
  files, 
  onPlaySong, 
  currentSongId, 
  isPlaying,
  onSongsLoaded 
}: SongListProps) {
  const [songs, setSongs] = useState<Song[]>([])
  const [hoveredSongId, setHoveredSongId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const loadedRef = useRef(false)
  const cleanupRef = useRef<(() => void) | null>(null)

  // Memoize files to prevent unnecessary re-renders
  const filesKey = useMemo(() => files.map(f => f.filename).join(','), [files])

  useEffect(() => {
    // Prevent double loading
    if (loadedRef.current || files.length === 0) return
    loadedRef.current = true

    const loadSongs = async () => {
      setIsLoading(true)
      const loadedSongs: Song[] = []
      const urlsToCleanup: string[] = []
      
      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          const songId = `song-${i}`
          
          let songUrl = file.blobUrl || ''
          
          // Create blob URL if needed
          if (!songUrl && file.data) {
            const blob = new Blob([file.data], { type: file.mimetype })
            songUrl = URL.createObjectURL(blob)
            urlsToCleanup.push(songUrl)
          }

          const song: Song = {
            id: songId,
            filename: file.filename,
            url: songUrl,
            size: file.size,
            data: file.data,
            metadata: {
              title: file.filename.replace(/\.[^.]+$/, ''),
              artist: 'Unknown Artist',
              album: 'Unknown Album',
              duration: 0
            }
          }

          try {
            // Parse metadata with timeout to prevent hanging
            const metadataPromise = fetch(songUrl)
              .then(r => r.blob())
              .then(blob => mm.parseBlob(blob))
            
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Metadata timeout')), 5000)
            )
            
            const metadata = await Promise.race([metadataPromise, timeoutPromise]) as any
            
            song.metadata = {
              title: metadata.common.title || file.filename.replace(/\.[^.]+$/, ''),
              artist: metadata.common.artist || 'Unknown Artist',
              album: metadata.common.album || 'Unknown Album',
              duration: metadata.format.duration || 0
            }

            // Extract cover art
            if (metadata.common.picture && metadata.common.picture.length > 0) {
              const picture = metadata.common.picture[0]
              const coverBlob = new Blob([picture.data], { type: picture.format })
              const coverUrl = URL.createObjectURL(coverBlob)
              song.metadata.picture = coverUrl
              urlsToCleanup.push(coverUrl)
            }
          } catch (error) {
            console.warn(`Could not load metadata for ${file.filename}:`, error)
          }

          loadedSongs.push(song)
        }

        setSongs(loadedSongs)
        
        // Notify parent component
        if (onSongsLoaded) {
          onSongsLoaded(loadedSongs)
        }
        
        // Store cleanup function
        cleanupRef.current = () => {
          urlsToCleanup.forEach(url => {
            try {
              URL.revokeObjectURL(url)
            } catch (e) {
              // Ignore errors during cleanup
            }
          })
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadSongs()

    // Cleanup function
    return () => {
      // Only cleanup if component is truly unmounting
      // This prevents cleanup during re-renders
    }
  }, [filesKey]) // Only depend on filesKey to prevent re-renders

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
      }
    }
  }, [])

  const formatDuration = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSongClick = (song: Song, index: number) => {
    // Prevent multiple rapid clicks
    if (currentSongId === song.id && isPlaying) {
      return
    }
    onPlaySong(song, index)
  }

  if (isLoading && songs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music2 className="h-5 w-5" />
            Songs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading songs...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music2 className="h-5 w-5" />
          Songs ({songs.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {songs.map((song, index) => (
            <div
              key={song.id}
              className={cn(
                "flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer group",
                currentSongId === song.id && "bg-muted/30"
              )}
              onClick={() => handleSongClick(song, index)}
              onMouseEnter={() => setHoveredSongId(song.id)}
              onMouseLeave={() => setHoveredSongId(null)}
            >
              {/* Album Art with Play Overlay */}
              <div className="relative w-14 h-14 flex-shrink-0">
                {song.metadata.picture ? (
                  <img
                    src={song.metadata.picture}
                    alt={song.metadata.album}
                    className="w-full h-full object-cover rounded"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-muted rounded flex items-center justify-center">
                    <Music2 className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                
                {/* Play Overlay */}
                {(hoveredSongId === song.id || (currentSongId === song.id && isPlaying)) && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] rounded flex items-center justify-center">
                    {currentSongId === song.id && isPlaying ? (
                      <Pause className="w-6 h-6 text-white fill-white" />
                    ) : (
                      <Play className="w-6 h-6 text-white fill-white" />
                    )}
                  </div>
                )}
              </div>

              {/* Song Info */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-medium truncate",
                  currentSongId === song.id && "text-primary"
                )}>
                  {song.metadata.title}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {song.metadata.artist} • {song.metadata.album}
                </p>
              </div>

              {/* Duration */}
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="w-3 h-3" />
                {formatDuration(song.metadata.duration)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
