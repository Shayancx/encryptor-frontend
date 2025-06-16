"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { User, FileText, Upload, LogOut, Clock, HardDrive } from "lucide-react"

import { useAuth } from "@/lib/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatBytes } from "@/lib/utils"

interface UserFile {
  file_id: string
  filename: string
  size: number
  created_at: string
  expires_at: string
}

export default function AccountPage() {
  const { user, logout, isLoading } = useAuth()
  const [files, setFiles] = useState<UserFile[]>([])
  const [isLoadingFiles, setIsLoadingFiles] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user) {
      fetchUserFiles()
    }
  }, [user])

  const fetchUserFiles = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9292/api'}/account/files`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setFiles(data.files)
      }
    } catch (error) {
      console.error('Failed to fetch files:', error)
    } finally {
      setIsLoadingFiles(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading || !user) {
    return (
      <div className="container py-10">
        <div className="flex justify-center">Loading...</div>
      </div>
    )
  }

  return (
    <section className="container grid gap-6 pb-8 pt-6 md:py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">
            Your Account
          </h1>
          <p className="text-lg text-muted-foreground">
            Manage your encrypted files and account settings
          </p>
        </div>
        <Button variant="outline" onClick={logout}>
          <LogOut className="mr-2 size-4" />
          Log Out
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Account Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="size-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Email:</span>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Account ID:</span>
              <p className="font-mono text-sm">{user.id}</p>
            </div>
          </CardContent>
        </Card>

        {/* Upload Limit Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="size-5" />
              Upload Limit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-3xl font-bold">{user.upload_limit_mb} MB</p>
              <p className="text-sm text-muted-foreground">
                Maximum file size per upload
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="size-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => router.push('/encrypt')}
            >
              <Upload className="mr-2 size-4" />
              Upload New File
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Files */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            Your Files
          </CardTitle>
          <CardDescription>
            Recently uploaded encrypted files
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingFiles ? (
            <p className="text-center py-4 text-muted-foreground">Loading files...</p>
          ) : files.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">
              No files uploaded yet. Start by encrypting a file!
            </p>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <div 
                  key={file.file_id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{file.filename}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{formatBytes(file.size)}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        Expires: {formatDate(file.expires_at)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/view/${file.file_id}`)}
                  >
                    View
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

// Add formatBytes helper to lib/utils.ts if not already present
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}
