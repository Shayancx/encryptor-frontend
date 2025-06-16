import { FileText, Image, FileAudio, FileVideo, File } from "lucide-react"

interface FileIconProps {
  mimeType: string
  className?: string
}

export function FileIcon({ mimeType, className }: FileIconProps) {
  if (mimeType.startsWith('image/')) {
    return <Image className={className} />
  }
  if (mimeType.startsWith('audio/')) {
    return <FileAudio className={className} />
  }
  if (mimeType.startsWith('video/')) {
    return <FileVideo className={className} />
  }
  if (mimeType.startsWith('text/') || mimeType.includes('pdf')) {
    return <FileText className={className} />
  }
  return <File className={className} />
}
