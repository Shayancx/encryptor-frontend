export interface AudioMetadata {
  title?: string
  artist?: string
  album?: string
  year?: number
  genre?: string[]
  picture?: {
    data: Buffer
    format: string
  }
  bitrate?: number
  duration?: number
  lyrics?: Array<{
    text: string
    syncText?: Array<{
      text: string
      time: number
    }>
  }>
}

export interface AudioPlayerProps {
  fileUrl: string
  fileName?: string
  fileSize?: number
  className?: string
}
