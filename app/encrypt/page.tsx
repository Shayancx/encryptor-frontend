"use client"

import { useState } from "react"
import { Copy, FileText, Lock } from "lucide-react"
import Link from "next/link"

import { encrypt } from "@/lib/crypto"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { TiptapEditor } from "@/components/editor/tiptap-editor"
import { StreamingUpload } from "@/components/streaming-upload"
import { useAuth } from "@/lib/contexts/auth-context"

export default function EncryptPage() {
  const [message, setMessage] = useState("")
  const [password, setPassword] = useState("")
  const [shareableLinks, setShareableLinks] = useState<string[]>([])
  const [isEncrypting, setIsEncrypting] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  
  // Dynamic upload limits based on authentication
  const uploadLimitMB = user ? 4096 : 100
  const authToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return "Password must be at least 8 characters"
    if (!/[A-Z]/.test(pwd)) return "Password must contain uppercase letter"
    if (!/[a-z]/.test(pwd)) return "Password must contain lowercase letter"
    if (!/\d/.test(pwd)) return "Password must contain a number"
    return null
  }

  const handleEncryptMessage = async () => {
    if (!message) {
      toast({
        title: "No message",
        description: "Please enter a message to encrypt",
        variant: "destructive"
      })
      return
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      toast({
        title: "Weak password",
        description: passwordError,
        variant: "destructive"
      })
      return
    }

    setIsEncrypting(true)

    try {
      // Encrypt message
      const encryptedMessage = await encrypt(message, password, 'text')
      
      // Upload to server
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9292/api'}/upload`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          encrypted_data: btoa(JSON.stringify({
            message: {
              ciphertext: encryptedMessage.ciphertext,
              iv: encryptedMessage.iv,
              salt: encryptedMessage.salt,
              isHtml: true
            }
          })),
          password: password,
          mime_type: 'application/json',
          filename: 'encrypted_message.json',
          iv: encryptedMessage.iv,
          ttl_hours: 24
        })
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const result = await response.json()
      const link = `${window.location.origin}/view/${result.file_id}`
      setShareableLinks([link])

      toast({
        title: "Encryption successful",
        description: "Your message has been encrypted"
      })
    } catch (error: any) {
      toast({
        title: "Encryption failed",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsEncrypting(false)
    }
  }

  const handleFileUploadComplete = (fileId: string, shareableLink: string) => {
    setShareableLinks(prev => [...prev, shareableLink])
  }

  const copyToClipboard = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link)
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
    setShareableLinks([])
  }

  return (
    <section className="container grid gap-6 pb-8 pt-6 md:py-10">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">
          Encrypt Your Data
        </h1>
        <p className="max-w-[700px] text-center text-lg text-muted-foreground">
          Encrypt messages and large files with streaming technology.
          Files are processed in chunks to prevent browser crashes.
        </p>
      </div>

      <div className="mx-auto w-full max-w-4xl">
        {shareableLinks.length === 0 ? (
          <div className="space-y-6">
            {/* Upload Limit Notice */}
            {!user && (
              <Alert>
                <AlertDescription>
                  You're uploading as a guest ({uploadLimitMB}MB limit). 
                  <Link href="/register" className="font-medium underline ml-1">
                    Create an account
                  </Link> to upload up to 4GB.
                </AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="size-5" />
                  Encryption Form
                </CardTitle>
                <CardDescription>
                  Add a message and/or files, then provide a strong password
                  {user && (
                    <span className="block mt-1 text-green-600 dark:text-green-400">
                      Authenticated user - {uploadLimitMB}MB upload limit
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Message Editor */}
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

                {/* Password Input - Moved before file upload */}
                <div className="space-y-2">
                  <Label htmlFor="password">
                    <Lock className="mr-2 inline size-4" />
                    Encryption Password (Required)
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
                  {password && validatePassword(password) && (
                    <p className="text-xs text-destructive">{validatePassword(password)}</p>
                  )}
                </div>

                {/* File Upload - Always Visible */}
                <div className="space-y-2">
                  <Label>
                    Files (Optional) - Stream Upload
                  </Label>
                  <StreamingUpload
                    password={password}
                    authToken={authToken || undefined}
                    onUploadComplete={handleFileUploadComplete}
                    uploadLimitMB={uploadLimitMB}
                    disabled={!password || validatePassword(password) !== null}
                  />
                  {(!password || validatePassword(password) !== null) && (
                    <p className="text-xs text-muted-foreground">
                      Please enter a valid password above to enable file uploads
                    </p>
                  )}
                </div>

                {/* Encrypt Message Button */}
                {message && (
                  <Button
                    onClick={handleEncryptMessage}
                    disabled={isEncrypting || !password || validatePassword(password) !== null}
                    className="w-full"
                  >
                    {isEncrypting ? "Encrypting..." : "Encrypt Message"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600 dark:text-green-400">
                ✓ Encryption Successful
              </CardTitle>
              <CardDescription>
                Your data has been encrypted and stored. Share these links with recipients.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Shareable Links</Label>
                {shareableLinks.map((link, index) => (
                  <div key={index} className="space-y-2">
                    <div className="rounded-lg border bg-muted p-4 text-center">
                      <p className="font-mono text-sm">{link}</p>
                    </div>
                    <Button
                      onClick={() => copyToClipboard(link)}
                      variant="outline"
                      className="w-full"
                    >
                      <Copy className="mr-2 size-4" />
                      Copy Link
                    </Button>
                  </div>
                ))}
              </div>

              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm font-semibold">Encryption Details:</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>• Encrypted with AES-256-GCM</li>
                  <li>• Files uploaded in 1MB chunks</li>
                  <li>• No entire file loaded in memory</li>
                  <li>• Stored on server for 24 hours</li>
                  <li>• 8-character secure ID</li>
                  {user && <li>• Linked to your account</li>}
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
