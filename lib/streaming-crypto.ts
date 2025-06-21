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
 * Convert ArrayBuffer to base64 string safely
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Convert base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

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
      password
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to initialize streaming upload: ${error}`)
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
 * Encrypt and upload a single chunk with retry logic
 */
async function uploadChunkWithRetry(
  chunk: ArrayBuffer,
  chunkIndex: number,
  session: StreamingUploadSession,
  password: string,
  salt: Uint8Array,
  maxRetries: number = 3,
  onProgress?: (uploaded: number, total: number) => void,
  signal?: AbortSignal
): Promise<void> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (signal?.aborted) {
        throw new Error('Upload cancelled')
      }
      
      await encryptAndUploadChunk(chunk, chunkIndex, session, password, salt, onProgress, signal)
      return // Success
    } catch (error) {
      lastError = error as Error
      
      // Don't retry on abort
      if (error instanceof Error && error.message === 'Upload cancelled') {
        throw error
      }
      
      // Exponential backoff
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(resolve, delay)
          signal?.addEventListener('abort', () => {
            clearTimeout(timeout)
            reject(new Error('Upload cancelled'))
          })
        })
      }
    }
  }
  
  throw new Error(`Failed to upload chunk ${chunkIndex} after ${maxRetries} attempts: ${lastError?.message}`)
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
  onProgress?: (uploaded: number, total: number) => void,
  signal?: AbortSignal
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
  
  // Create a proper file blob with content type
  const encryptedBlob = new Blob([encryptedData], { type: 'application/octet-stream' })
  formData.append('chunk_data', encryptedBlob, `chunk_${chunkIndex}.enc`)
  
  formData.append('iv', arrayBufferToBase64(iv.buffer))
  formData.append('chunk_size', chunk.byteLength.toString())

  // Upload chunk
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9292/api'}/streaming/chunk`, {
    method: 'POST',
    body: formData,
    signal
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to upload chunk ${chunkIndex}: ${error}`)
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
    const error = await response.text()
    throw new Error(`Failed to finalize upload: ${error}`)
  }

  const data = await response.json()
  return {
    fileId: data.file_id,
    shareableLink: `${window.location.origin}/view/${data.file_id}`
  }
}

/**
 * Optimized file chunk reading
 */
export async function* readFileInChunks(
  file: File,
  chunkSize: number = CHUNK_SIZE
): AsyncGenerator<ArrayBuffer, void, undefined> {
  let offset = 0
  
  while (offset < file.size) {
    const end = Math.min(offset + chunkSize, file.size)
    const slice = file.slice(offset, end)
    const arrayBuffer = await slice.arrayBuffer()
    
    yield arrayBuffer
    offset = end
  }
}

/**
 * Stream encrypt and upload a file
 */
export async function streamEncryptAndUpload(
  file: File,
  password: string,
  authToken?: string,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
): Promise<{ fileId: string; shareableLink: string }> {
  // Generate salt for this upload
  const salt = crypto.getRandomValues(new Uint8Array(32))
  const saltBase64 = arrayBufferToBase64(salt.buffer)

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

  try {
    // Process file in chunks
    for await (const chunk of readFileInChunks(file)) {
      if (signal?.aborted) {
        throw new Error('Upload cancelled')
      }
      
      // Wait if we have too many concurrent uploads
      while (uploadPromises.length >= MAX_CONCURRENT_UPLOADS) {
        await Promise.race(uploadPromises)
        // Remove completed promises
        for (let i = uploadPromises.length - 1; i >= 0; i--) {
          await uploadPromises[i].catch(() => {}) // Ignore errors here, they'll be thrown by Promise.all
          if (await Promise.race([uploadPromises[i], Promise.resolve('done')]) === 'done') {
            uploadPromises.splice(i, 1)
          }
        }
      }

      // Upload chunk with retry
      const uploadPromise = uploadChunkWithRetry(
        chunk,
        chunkIndex,
        session,
        password,
        salt,
        3, // max retries
        (uploaded, total) => {
          if (onProgress) {
            onProgress((uploaded / total) * 100)
          }
        },
        signal
      )

      uploadPromises.push(uploadPromise)
      chunkIndex++
    }

    // Wait for all uploads to complete
    await Promise.all(uploadPromises)

    // Finalize upload
    return finalizeStreamingUpload(session, saltBase64)
  } catch (error) {
    // Clean up on error
    console.error('Upload failed:', error)
    throw error
  }
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
  const salt = new Uint8Array(base64ToArrayBuffer(fileInfo.salt))
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
    const encryptedData = base64ToArrayBuffer(chunkData.data)
    const iv = base64ToArrayBuffer(chunkData.iv)

    // Decrypt chunk
    const decryptedChunk = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(iv)
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
