declare module 'react-h5-audio-player' {
  import { Component, ReactNode, Ref } from 'react'

  export interface AudioPlayerProps {
    src?: string
    autoPlay?: boolean
    autoPlayAfterSrcChange?: boolean
    showJumpControls?: boolean
    customProgressBarSection?: Array<string>
    customControlsSection?: Array<string>
    customVolumeControls?: Array<string>
    layout?: string
    className?: string
    style?: React.CSSProperties
    volume?: number
    loop?: boolean
    muted?: boolean
    crossOrigin?: string
    mediaGroup?: string
    onPlay?: (e: Event) => void
    onPause?: (e: Event) => void
    onListen?: (e: Event) => void
    onVolumeChange?: (e: Event) => void
    onEnded?: (e: Event) => void
    onError?: (e: Event) => void
    onLoadedData?: (e: Event) => void
    onLoadedMetadata?: (e: Event) => void
    onLoadStart?: (e: Event) => void
    header?: ReactNode
    footer?: ReactNode
  }

  export default class AudioPlayer extends Component<AudioPlayerProps> {
    audio: HTMLAudioElement
  }
}
