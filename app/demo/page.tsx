"use client"

import { useState } from "react"
import { Upload, Music } from "lucide-react"
import { AudioPlaylist } from "@/components/audio/audio-player"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function AudioDemoPage() {
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>("")
  const [fileSize, setFileSize] = useState<number>(0)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('audio/')) {
      const url = URL.createObjectURL(file)
      setAudioUrl(url)
      setFileName(file.name)
      setFileSize(file.size)
    }
  }

  return (
    <section className="container grid gap-6 pb-8 pt-6 md:py-10">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">
          Audio Player Demo
        </h1>
        <p className="max-w-[700px] text-center text-lg text-muted-foreground">
          Test the audio player with your own music files
        </p>
      </div>

      <div className="mx-auto w-full max-w-4xl space-y-6">
        {!audioUrl ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="size-5" />
                Upload Audio File
              </CardTitle>
              <CardDescription>
                Select an audio file to test the player
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="audio-upload">
                  <Music className="mr-2 inline size-4" />
                  Choose Audio File
                </Label>
                <Input
                  id="audio-upload"
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  Supports MP3, WAV, FLAC, OGG, and other audio formats
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <AudioPlaylist
              fileUrl={audioUrl}
              fileName={fileName}
              fileSize={fileSize}
            />
            
            <Button
              onClick={() => {
                if (audioUrl) URL.revokeObjectURL(audioUrl)
                setAudioUrl(null)
                setFileName("")
                setFileSize(0)
              }}
              variant="outline"
              className="w-full"
            >
              Upload Different File
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
