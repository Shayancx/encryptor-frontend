"use client"

import { useState } from "react"
import { Copy, FileText, Lock, Upload, X, FileAudio } from "lucide-react"

import { encrypt } from "@/lib/crypto"
import { FileIcon } from "@/components/ui/file-icon"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { TiptapEditor } from "@/components/editor/tiptap-editor"

interface FileWithPreview {
  file: File
  preview?: string
}

export default function EncryptPage() {
  const [message, setMessage] = useState("")
  const [password, setPassword] = useState("")
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [shareableLink, setShareableLink] = useState("")
  const [isEncrypting, setIsEncrypting] = useState(false)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    
    // Check total size of all files
    const totalSize = [...files, ...selectedFiles].reduce((sum, f) => {
      return sum + (f.file?.size || f.size || 0)
    }, 0)
    
    if (totalSize > 500 * 1024 * 1024) { // 500MB total limit for browser
      toast({
        title: "Files too large",
        description: "Total size of all files must be under 500MB",
        variant: "destructive"
      })
      return
    }

    const newFiles = selectedFiles.map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }))
    
    setFiles([...files, ...newFiles])
  }

  const removeFile = (index: number) => {
    const newFiles = [...files]
    if (newFiles[index].preview) {
      URL.revokeObjectURL(newFiles[index].preview!)
    }
    newFiles.splice(index, 1)
    setFiles(newFiles)
  }

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return "Password must be at least 8 characters"
    if (!/[A-Z]/.test(pwd)) return "Password must contain uppercase letter"
    if (!/[a-z]/.test(pwd)) return "Password must contain lowercase letter"
    if (!/\d/.test(pwd)) return "Password must contain a number"
    return null
  }

  const handleEncrypt = async () => {
    // Validate password
    const passwordError = validatePassword(password)
    if (passwordError) {
      toast({
        title: "Weak password",
        description: passwordError,
        variant: "destructive"
      })
      return
    }

    if (!message && files.length === 0) {
      toast({
        title: "No data to encrypt",
        description: "Please enter a message or select files",
        variant: "destructive"
      })
      return
    }

    setIsEncrypting(true)

    try {
      // Prepare combined data
      const combinedData: any = {}
      
      // Add message if present (now it's HTML content)
      if (message) {
        const encryptedMessage = await encrypt(message, password, 'text')
        combinedData.message = {
          ciphertext: encryptedMessage.ciphertext,
          iv: encryptedMessage.iv,
          salt: encryptedMessage.salt,
          isHtml: true // Flag to indicate this is HTML content
        }
      }

      // Add files if present
      if (files.length > 0) {
        combinedData.files = []
        
        for (const fileObj of files) {
          const fileData = await fileObj.file.arrayBuffer()
          const encryptedFile = await encrypt(fileData, password, 'file', fileObj.file.name)
          
          combinedData.files.push({
            filename: fileObj.file.name,
            mimetype: fileObj.file.type || 'application/octet-stream',
            size: fileObj.file.size,
            ciphertext: encryptedFile.ciphertext,
            iv: encryptedFile.iv,
            salt: encryptedFile.salt
          })
        }
      }

      // Always store on server
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9292/api'}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          encrypted_data: btoa(JSON.stringify(combinedData)), // Base64 encode the combined data
          password: password,
          mime_type: 'application/json', // Since we're storing structured data
          filename: 'encrypted_data.json',
          iv: combinedData.message?.iv || combinedData.files?.[0]?.iv || btoa(crypto.getRandomValues(new Uint8Array(16)).toString()),
          ttl_hours: 24
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const result = await response.json()
      
      // Create simple shareable link with 8-character ID
      const baseUrl = window.location.origin
      const link = `${baseUrl}/view/${result.file_id}`
      setShareableLink(link)

      toast({
        title: "Encryption successful",
        description: "Your data has been encrypted and stored securely"
      })

    } catch (error: any) {
      console.error("Encryption error:", error)
      toast({
        title: "Encryption failed",
        description: error.message || "An error occurred while encrypting your data",
        variant: "destructive"
      })
    } finally {
      setIsEncrypting(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink)
      toast({
        title: "Copied to clipboard",
        description: "The shareable link has been copied"
      })
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      })
    }
  }

  const reset = () => {
    setMessage("")
    setPassword("")
    files.forEach(f => f.preview && URL.revokeObjectURL(f.preview))
    setFiles([])
    setShareableLink("")
    const fileInput = document.getElementById('file-upload') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  return (
    <section className="container grid gap-6 pb-8 pt-6 md:py-10">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">
          Encrypt Your Data
        </h1>
        <p className="max-w-[700px] text-center text-lg text-muted-foreground">
          Encrypt messages and files together. All data is encrypted client-side 
          and stored securely on our server.
        </p>
      </div>

      <div className="mx-auto w-full max-w-4xl">
        {!shareableLink ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="size-5" />
                Encryption Form
              </CardTitle>
              <CardDescription>
                Add a message and/or files, then provide a strong password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Rich Text Editor for Message */}
              <div className="space-y-2">
                <Label htmlFor="message">
                  <FileText className="mr-2 inline size-4" />
                  Message (Optional)
                </Label>
                <TiptapEditor
                  content={message}
                  onChange={setMessage}
                  placeholder="Enter your message here... You can format it using the toolbar above."
                />
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="file-upload">
                  <Upload className="mr-2 inline size-4" />
                  Files (Optional) - All types supported
                </Label>
                <Input
                  id="file-upload"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                
                {/* File List */}
                {files.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {files.map((fileObj, index) => (
                      <div key={index} className="flex items-center justify-between rounded-lg border p-2">
                        <div className="flex items-center space-x-2">
                          {fileObj.preview ? (
                            <img src={fileObj.preview} alt="" className="h-10 w-10 rounded object-cover" />
                          ) : (
                            <FileIcon mimeType={fileObj.file.type} className="h-10 w-10 text-muted-foreground" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{fileObj.file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(fileObj.file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground">
                      Total: {files.length} file(s), {(files.reduce((sum, f) => sum + f.file.size, 0) / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <Label htmlFor="password">
                  <Lock className="mr-2 inline size-4" />
                  Encryption Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min 8 chars, uppercase, lowercase, number..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Choose a strong password. Only a salted hash will be stored on the server.
                </p>
              </div>

              <Button
                onClick={handleEncrypt}
                disabled={isEncrypting || (!message && files.length === 0) || !password}
                className="w-full"
              >
                {isEncrypting ? "Encrypting..." : "Encrypt & Generate Link"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600 dark:text-green-400">
                ✓ Encryption Successful
              </CardTitle>
              <CardDescription>
                Your data has been encrypted and stored. Share this link with the recipient.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Shareable Link</Label>
                <div className="rounded-lg border bg-muted p-4 text-center">
                  <p className="font-mono text-lg">{shareableLink}</p>
                </div>
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  className="w-full"
                >
                  <Copy className="mr-2 size-4" />
                  Copy Link
                </Button>
              </div>

              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm font-semibold">What was encrypted:</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {message && <li>✓ Rich text message with formatting</li>}
                  {files.length > 0 && <li>✓ {files.length} file(s)</li>}
                  <li>• Encrypted with AES-256-GCM</li>
                  <li>• Stored on server for 24 hours</li>
                  <li>• 8-character secure ID</li>
                </ul>
              </div>

              <Button onClick={reset} variant="outline" className="w-full">
                Encrypt More Data
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  )
}
