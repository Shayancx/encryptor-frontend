// Example usage of the AudioPlayerWithMetadata component

import { AudioPlayerWithMetadata } from "@/components/audio/audio-player"

export function ExampleAudioPlayerUsage() {
  // This would typically come from your decrypted file
  const audioFileUrl = "blob:https://example.com/12345" // or a regular URL
  const fileName = "my-song.mp3"
  const fileSize = 5242880 // 5MB in bytes

  return (
    <div className="container mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Audio Player Example</h2>
      
      <AudioPlayerWithMetadata
        fileUrl={audioFileUrl}
        fileName={fileName}
        fileSize={fileSize}
        className="max-w-4xl mx-auto"
      />
    </div>
  )
}
