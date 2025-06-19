declare module 'react-h5-audio-player' {
  import { Component, ReactNode, RefObject } from 'react'

  export interface AudioPlayerProps {
    src?: string
    autoPlay?: boolean
    autoPlayAfterSrcChange?: boolean
    showJumpControls?: boolean
    showSkipControls?: boolean
    customProgressBarSection?: Array<string | ReactNode>
    customControlsSection?: Array<string | ReactNode>
    customVolumeControls?: Array<string | ReactNode>
    layout?: string
    className?: string
    style?: React.CSSProperties
    volume?: number
    loop?: boolean
    muted?: boolean
    crossOrigin?: string
    mediaGroup?: string
    preload?: 'none' | 'metadata' | 'auto'
    onPlay?: (e: Event) => void
    onPause?: (e: Event) => void
    onEnded?: (e: Event) => void
    onError?: (e: Event) => void
    onLoadedData?: (e: Event) => void
    onLoadedMetadata?: (e: Event) => void
    onTimeUpdate?: (e: Event) => void
    onVolumeChange?: (e: Event) => void
    onCanPlay?: () => void
    header?: ReactNode
    footer?: ReactNode
  }

  export default class AudioPlayer extends Component<AudioPlayerProps> {
    audio: RefObject<HTMLAudioElement>
  }
}
