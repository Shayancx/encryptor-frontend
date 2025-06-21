"use client"

import { useState, useRef } from "react"
import { Upload, X, AlertCircle } from "lucide-react"
import { streamEncryptAndUpload } from "@/lib/streaming-crypto"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"

interface FileUploadProgress {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
}

interface StreamingUploadProps {
  password: string
  authToken?: string
  onUploadComplete: (fileId: string, shareableLink: string) => void
  uploadLimitMB: number
  disabled?: boolean
}

export function StreamingUpload({ 
  password, 
  authToken, 
  onUploadComplete,
  uploadLimitMB,
  disabled = false
}: StreamingUploadProps) {
  const [uploads, setUploads] = useState<Map<string, FileUploadProgress>>(new Map())
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const abortControllers = useRef<Map<string, AbortController>>(new Map())

  const handleFiles = async (files: FileList) => {
    if (disabled) {
      toast({
        title: "Upload disabled",
        description: "Please enter a valid password first",
        variant: "destructive"
      })
      return
    }

    const newUploads = new Map(uploads)
    const uploadLimitBytes = uploadLimitMB * 1024 * 1024

    // Validate files
    const validFiles: File[] = []
    let totalSize = 0

    for (const file of Array.from(files)) {
      totalSize += file.size
      
      if (totalSize > uploadLimitBytes) {
        toast({
          title: "Files too large",
          description: `Total size exceeds ${uploadLimitMB}MB limit`,
          variant: "destructive"
        })
        break
      }

      validFiles.push(file)
      newUploads.set(file.name, {
        file,
        progress: 0,
        status: 'pending'
      })
    }

    setUploads(newUploads)

    // Start uploads
    for (const file of validFiles) {
      uploadFile(file)
    }
  }

  const uploadFile = async (file: File) => {
    const controller = new AbortController()
    abortControllers.current.set(file.name, controller)

    try {
      setUploads(prev => {
        const next = new Map(prev)
        const upload = next.get(file.name)!
        upload.status = 'uploading'
        return next
      })

      const result = await streamEncryptAndUpload(
        file,
        password,
        authToken,
        (progress) => {
          setUploads(prev => {
            const next = new Map(prev)
            const upload = next.get(file.name)!
            upload.progress = progress
            return next
          })
        }
      )

      setUploads(prev => {
        const next = new Map(prev)
        const upload = next.get(file.name)!
        upload.status = 'completed'
        upload.progress = 100
        return next
      })

      onUploadComplete(result.fileId, result.shareableLink)
      
      toast({
        title: "Upload complete",
        description: `${file.name} uploaded successfully`
      })
    } catch (error: any) {
      setUploads(prev => {
        const next = new Map(prev)
        const upload = next.get(file.name)!
        upload.status = 'error'
        upload.error = error.message
        return next
      })

      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      abortControllers.current.delete(file.name)
    }
  }

  const cancelUpload = (filename: string) => {
    const controller = abortControllers.current.get(filename)
    if (controller) {
      controller.abort()
    }
    
    setUploads(prev => {
      const next = new Map(prev)
      next.delete(filename)
      return next
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    if (disabled) return
    
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleClick = () => {
    if (disabled) {
      toast({
        title: "Upload disabled",
        description: "Please enter a valid password first",
        variant: "destructive"
      })
      return
    }
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={`
          relative rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer
          ${disabled 
            ? 'border-muted-foreground/25 bg-muted/20 opacity-60 cursor-not-allowed' 
            : isDragging 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          disabled={disabled}
        />
        
        <Upload className={`mx-auto h-12 w-12 ${disabled ? 'text-muted-foreground/50' : 'text-muted-foreground'}`} />
        <p className={`mt-2 text-sm ${disabled ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
          {disabled ? (
            "Enter a password above to enable file uploads"
          ) : (
            <>
              Drag and drop files here, or{' '}
              <span className="font-medium text-primary hover:underline">
                browse
              </span>
            </>
          )}
        </p>
        <p className={`mt-1 text-xs ${disabled ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
          Files will be encrypted and uploaded in chunks (max {uploadLimitMB}MB total)
        </p>
      </div>

      {/* Upload Progress */}
      {uploads.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Uploading Files</CardTitle>
            <CardDescription>
              Files are being encrypted and uploaded in chunks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from(uploads.entries()).map(([filename, upload]) => (
              <div key={filename} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {(upload.file.size / 1024 / 1024).toFixed(2)} MB
                      {upload.status === 'error' && (
                        <span className="text-destructive"> - {upload.error}</span>
                      )}
                    </p>
                  </div>
                  {upload.status !== 'completed' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelUpload(filename)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Progress 
                    value={upload.progress} 
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {Math.round(upload.progress)}%
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Large files are processed in 1MB chunks to prevent browser crashes.
          Encryption happens on-the-fly without loading entire files into memory.
        </AlertDescription>
      </Alert>
    </div>
  )
}
