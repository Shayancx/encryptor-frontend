/**
 * Streaming crypto implementation for chunked file encryption
 * Uses AES-GCM with per-chunk encryption for memory efficiency
 */

export interface ChunkMetadata {
  chunkIndex: number
  totalChunks: number
  chunkSize: number
  originalSize: number
}

export interface EncryptedChunk {
  data: ArrayBuffer
  metadata: ChunkMetadata
  iv: string
  authTag: string
}

export interface StreamingUploadSession {
  sessionId: string
  fileId: string
  totalChunks: number
  uploadedChunks: number
}

const CHUNK_SIZE = 1024 * 1024 // 1MB chunks
const PBKDF2_ITERATIONS = 250000

/**
 * Derive encryption key from password
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Initialize a streaming upload session
 */
export async function initializeStreamingUpload(
  filename: string,
  fileSize: number,
  mimeType: string,
  password: string,
  authToken?: string
): Promise<StreamingUploadSession> {
  const totalChunks = Math.ceil(fileSize / CHUNK_SIZE)
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9292/api'}/streaming/initialize`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      filename,
      fileSize,
      mimeType,
      totalChunks,
      chunkSize: CHUNK_SIZE,
      password // Server will hash this
    })
  })

  if (!response.ok) {
    throw new Error('Failed to initialize streaming upload')
  }

  const data = await response.json()
  return {
    sessionId: data.session_id,
    fileId: data.file_id,
    totalChunks,
    uploadedChunks: 0
  }
}

/**
 * Encrypt and upload a single chunk
 */
export async function encryptAndUploadChunk(
  chunk: ArrayBuffer,
  chunkIndex: number,
  session: StreamingUploadSession,
  password: string,
  salt: Uint8Array,
  onProgress?: (uploaded: number, total: number) => void
): Promise<void> {
  // Generate unique IV for this chunk
  const iv = crypto.getRandomValues(new Uint8Array(12))
  
  // Derive key
  const key = await deriveKey(password, salt)
  
  // Encrypt chunk
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    chunk
  )

  // Create form data for chunk upload
  const formData = new FormData()
  formData.append('session_id', session.sessionId)
  formData.append('chunk_index', chunkIndex.toString())
  formData.append('chunk_data', new Blob([encryptedData]))
  formData.append('iv', btoa(String.fromCharCode(...iv)))
  formData.append('chunk_size', chunk.byteLength.toString())

  // Upload chunk
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9292/api'}/streaming/chunk`, {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    throw new Error(`Failed to upload chunk ${chunkIndex}`)
  }

  session.uploadedChunks++
  if (onProgress) {
    onProgress(session.uploadedChunks, session.totalChunks)
  }
}

/**
 * Finalize the streaming upload
 */
export async function finalizeStreamingUpload(
  session: StreamingUploadSession,
  salt: string
): Promise<{ fileId: string; shareableLink: string }> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9292/api'}/streaming/finalize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      session_id: session.sessionId,
      salt: salt
    })
  })

  if (!response.ok) {
    throw new Error('Failed to finalize upload')
  }

  const data = await response.json()
  return {
    fileId: data.file_id,
    shareableLink: `${window.location.origin}/view/${data.file_id}`
  }
}

/**
 * Process file in chunks using Streams API
 */
export async function* readFileInChunks(
  file: File,
  chunkSize: number = CHUNK_SIZE
): AsyncGenerator<ArrayBuffer, void, undefined> {
  const reader = file.stream().getReader()
  let buffer = new Uint8Array(0)

  try {
    while (true) {
      const { done, value } = await reader.read()
      
      if (done && buffer.length === 0) {
        break
      }

      if (value) {
        // Concatenate with existing buffer
        const newBuffer = new Uint8Array(buffer.length + value.length)
        newBuffer.set(buffer)
        newBuffer.set(value, buffer.length)
        buffer = newBuffer
      }

      // Yield complete chunks
      while (buffer.length >= chunkSize || (done && buffer.length > 0)) {
        const chunkEnd = Math.min(chunkSize, buffer.length)
        const chunk = buffer.slice(0, chunkEnd)
        buffer = buffer.slice(chunkEnd)
        
        yield chunk.buffer
        
        if (done && buffer.length === 0) {
          break
        }
      }

      if (done) {
        break
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * Stream encrypt and upload a file
 */
export async function streamEncryptAndUpload(
  file: File,
  password: string,
  authToken?: string,
  onProgress?: (progress: number) => void
): Promise<{ fileId: string; shareableLink: string }> {
  // Generate salt for this upload
  const salt = crypto.getRandomValues(new Uint8Array(32))
  const saltBase64 = btoa(String.fromCharCode(...salt))

  // Initialize session
  const session = await initializeStreamingUpload(
    file.name,
    file.size,
    file.type || 'application/octet-stream',
    password,
    authToken
  )

  let chunkIndex = 0
  const uploadPromises: Promise<void>[] = []
  const MAX_CONCURRENT_UPLOADS = 3

  // Process file in chunks
  for await (const chunk of readFileInChunks(file)) {
    // Wait if we have too many concurrent uploads
    if (uploadPromises.length >= MAX_CONCURRENT_UPLOADS) {
      await Promise.race(uploadPromises)
      uploadPromises.splice(0, uploadPromises.findIndex(p => p === undefined) + 1)
    }

    // Upload chunk (don't await, let it run in parallel)
    const uploadPromise = encryptAndUploadChunk(
      chunk,
      chunkIndex,
      session,
      password,
      salt,
      (uploaded, total) => {
        if (onProgress) {
          onProgress((uploaded / total) * 100)
        }
      }
    )

    uploadPromises.push(uploadPromise)
    chunkIndex++
  }

  // Wait for all uploads to complete
  await Promise.all(uploadPromises)

  // Finalize upload
  return finalizeStreamingUpload(session, saltBase64)
}

/**
 * Download and decrypt file in chunks
 */
export async function streamDownloadAndDecrypt(
  fileId: string,
  password: string,
  onProgress?: (progress: number) => void
): Promise<{ blob: Blob; filename: string; mimetype: string }> {
  // Get file info
  const infoResponse = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9292/api'}/streaming/info/${fileId}`
  )
  
  if (!infoResponse.ok) {
    throw new Error('Failed to get file info')
  }

  const fileInfo = await infoResponse.json()
  const salt = new Uint8Array(atob(fileInfo.salt).split('').map(c => c.charCodeAt(0)))
  const key = await deriveKey(password, salt)

  const decryptedChunks: ArrayBuffer[] = []
  
  // Download and decrypt each chunk
  for (let i = 0; i < fileInfo.total_chunks; i++) {
    const chunkResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9292/api'}/streaming/download/${fileId}/chunk/${i}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      }
    )

    if (!chunkResponse.ok) {
      throw new Error(`Failed to download chunk ${i}`)
    }

    const chunkData = await chunkResponse.json()
    const encryptedData = new Uint8Array(atob(chunkData.data).split('').map(c => c.charCodeAt(0)))
    const iv = new Uint8Array(atob(chunkData.iv).split('').map(c => c.charCodeAt(0)))

    // Decrypt chunk
    const decryptedChunk = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encryptedData
    )

    decryptedChunks.push(decryptedChunk)
    
    if (onProgress) {
      onProgress(((i + 1) / fileInfo.total_chunks) * 100)
    }
  }

  // Combine chunks into blob
  const blob = new Blob(decryptedChunks, { type: fileInfo.mime_type })
  
  return {
    blob,
    filename: fileInfo.filename,
    mimetype: fileInfo.mime_type
  }
}
