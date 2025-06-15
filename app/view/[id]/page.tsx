"use client"

import { useState, useEffect } from "react"
import { Download, FileText, Lock, Unlock } from "lucide-react"

import { decrypt } from "@/lib/crypto"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { TiptapEditor } from "@/components/editor/tiptap-editor"

interface DecryptedFile {
  filename: string
  mimetype: string
  size: number
  data: ArrayBuffer
}

export default function ViewPage({ params }: { params: { id: string } }) {
  const [password, setPassword] = useState("")
  const [decryptedMessage, setDecryptedMessage] = useState<string | null>(null)
  const [decryptedFiles, setDecryptedFiles] = useState<DecryptedFile[]>([])
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isHtmlContent, setIsHtmlContent] = useState(false)
  const { toast } = useToast()

  const handleDecrypt = async () => {
    if (!password) {
      toast({
        title: "Password required",
        description: "Please enter the decryption password",
        variant: "destructive"
      })
      return
    }

    setIsDecrypting(true)
    setError(null)

    try {
      // SECURITY FIX: Send password in POST body, not URL
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9292/api'}/download/${params.id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password })
        }
      )
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to retrieve data')
      }

      const result = await response.json()
      
      // Decode the combined encrypted data
      const combinedData = JSON.parse(atob(result.encrypted_data))
      
      // Decrypt message if present
      if (combinedData.message) {
        const messagePayload = {
          version: 1,
          type: 'text' as const,
          iv: combinedData.message.iv,
          salt: combinedData.message.salt,
          ciphertext: combinedData.message.ciphertext
        }
        
        const decryptedMsg = await decrypt(messagePayload, password)
        setDecryptedMessage(decryptedMsg.data as string)
        setIsHtmlContent(combinedData.message.isHtml === true)
      }
      
      // Decrypt files if present
      if (combinedData.files && combinedData.files.length > 0) {
        const decryptedFilesList: DecryptedFile[] = []
        
        for (const encFile of combinedData.files) {
          const filePayload = {
            version: 1,
            type: 'file' as const,
            iv: encFile.iv,
            salt: encFile.salt,
            ciphertext: encFile.ciphertext,
            filename: encFile.filename
          }
          
          const decryptedFile = await decrypt(filePayload, password)
          decryptedFilesList.push({
            filename: encFile.filename,
            mimetype: encFile.mimetype,
            size: encFile.size,
            data: decryptedFile.data as ArrayBuffer
          })
        }
        
        setDecryptedFiles(decryptedFilesList)
      }

      toast({
        title: "Decryption successful",
        description: "Your data has been decrypted"
      })

    } catch (error: any) {
      console.error("Decryption error:", error)
      setError(error.message || "Decryption failed. Please check your password.")
      toast({
        title: "Decryption failed",
        description: error.message || "Invalid password or corrupted data",
        variant: "destructive"
      })
    } finally {
      setIsDecrypting(false)
    }
  }

  const handleDownloadFile = (file: DecryptedFile) => {
    const blob = new Blob([file.data], { type: file.mimetype })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Download started",
      description: `Downloading ${file.filename}`
    })
  }

  const handleDownloadAll = () => {
    decryptedFiles.forEach(file => handleDownloadFile(file))
  }

  const copyToClipboard = async () => {
    if (!decryptedMessage) return

    try {
      // If it's HTML content, strip tags for clipboard
      const textToCopy = isHtmlContent 
        ? decryptedMessage.replace(/<[^>]*>/g, '') 
        : decryptedMessage
      
      await navigator.clipboard.writeText(textToCopy)
      toast({
        title: "Copied to clipboard",
        description: "The message has been copied (plain text)"
      })
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      })
    }
  }

  return (
    <section className="container grid gap-6 pb-8 pt-6 md:py-10">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">
          Decrypt Your Data
        </h1>
        <p className="text-center text-lg text-muted-foreground">
          ID: <span className="font-mono">{params.id}</span>
        </p>
      </div>

      <div className="mx-auto w-full max-w-4xl">
        {!decryptedMessage && decryptedFiles.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="size-5" />
                Enter Decryption Password
              </CardTitle>
              <CardDescription>
                This data is encrypted. Enter your password to decrypt it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="decrypt-password">
                  <Lock className="mr-2 inline size-4" />
                  Password
                </Label>
                <Input
                  id="decrypt-password"
                  type="password"
                  placeholder="Enter decryption password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleDecrypt()
                  }}
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}

              <Button
                onClick={handleDecrypt}
                disabled={isDecrypting || !password}
                className="w-full"
              >
                {isDecrypting ? "Decrypting..." : "Decrypt"}
              </Button>

              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm font-semibold">Security Process:</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>1. Password sent securely via POST</li>
                  <li>2. Server verifies against salted hash</li>
                  <li>3. Encrypted data is returned</li>
                  <li>4. Decryption happens in your browser</li>
                  <li>5. No passwords in server logs</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Unlock className="size-5" />
                Decryption Successful
              </CardTitle>
              <CardDescription>
                Your data has been decrypted successfully.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Decrypted Message */}
              {decryptedMessage && (
                <div className="space-y-2">
                  <Label>
                    <FileText className="mr-2 inline size-4" />
                    Decrypted Message
                  </Label>
                  {isHtmlContent ? (
                    <TiptapEditor
                      content={decryptedMessage}
                      readOnly={true}
                      className="min-h-[150px]"
                    />
                  ) : (
                    <div className="rounded-md border bg-background p-4">
                      <pre className="whitespace-pre-wrap font-mono text-sm">{decryptedMessage}</pre>
                    </div>
                  )}
                  <Button
                    onClick={copyToClipboard}
                    variant="outline"
                    className="w-full"
                  >
                    Copy Message (Plain Text)
                  </Button>
                </div>
              )}

              {/* Decrypted Files */}
              {decryptedFiles.length > 0 && (
                <div className="space-y-2">
                  <Label>
                    <FileText className="mr-2 inline size-4" />
                    Decrypted Files ({decryptedFiles.length})
                  </Label>
                  <div className="space-y-2">
                    {decryptedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="font-medium">{file.filename}</p>
                          <p className="text-sm text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleDownloadFile(file)}
                        >
                          <Download className="mr-2 size-4" />
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                  {decryptedFiles.length > 1 && (
                    <Button
                      onClick={handleDownloadAll}
                      variant="outline"
                      className="w-full"
                    >
                      <Download className="mr-2 size-4" />
                      Download All Files
                    </Button>
                  )}
                </div>
              )}

              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm font-semibold">Important:</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>• This decrypted data exists only in your browser</li>
                  <li>• Close this tab when you're done</li>
                  <li>• Data expires from server after 24 hours</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  )
}
