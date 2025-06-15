/**
 * WebCrypto helper module for zero-knowledge encryption
 * Uses AES-GCM-256 with PBKDF2 key derivation
 */

export interface EncryptedPayload {
  version: number
  type: 'text' | 'file'
  iv: string
  salt: string
  ciphertext: string
  filename?: string
}

const PBKDF2_ITERATIONS = 250000
const SALT_LENGTH = 32
const IV_LENGTH = 12

/**
 * Generate cryptographically secure random bytes
 */
function generateRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length))
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
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
 * Derive encryption key from password using PBKDF2
 */
async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
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
 * Encrypt text or file data
 */
export async function encrypt(
  data: string | ArrayBuffer,
  password: string,
  type: 'text' | 'file',
  filename?: string
): Promise<EncryptedPayload> {
  // Generate random salt and IV
  const salt = generateRandomBytes(SALT_LENGTH)
  const iv = generateRandomBytes(IV_LENGTH)

  // Derive key from password
  const key = await deriveKey(password, salt)

  // Prepare data for encryption
  let dataToEncrypt: ArrayBuffer
  if (typeof data === 'string') {
    const encoder = new TextEncoder()
    dataToEncrypt = encoder.encode(data).buffer
  } else {
    dataToEncrypt = data
  }

  // Encrypt data
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    dataToEncrypt
  )

  // Build encrypted payload
  const payload: EncryptedPayload = {
    version: 1,
    type,
    iv: arrayBufferToBase64(iv.buffer),
    salt: arrayBufferToBase64(salt.buffer),
    ciphertext: arrayBufferToBase64(encryptedData)
  }

  if (filename) {
    payload.filename = filename
  }

  return payload
}

/**
 * Decrypt encrypted payload
 */
export async function decrypt(
  payload: EncryptedPayload,
  password: string
): Promise<{ data: string | ArrayBuffer; filename?: string }> {
  // Convert base64 strings back to ArrayBuffers
  const salt = new Uint8Array(base64ToArrayBuffer(payload.salt))
  const iv = new Uint8Array(base64ToArrayBuffer(payload.iv))
  const ciphertext = base64ToArrayBuffer(payload.ciphertext)

  // Derive key from password
  const key = await deriveKey(password, salt)

  // Decrypt data
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    ciphertext
  )

  // Convert decrypted data based on type
  if (payload.type === 'text') {
    const decoder = new TextDecoder()
    return {
      data: decoder.decode(decryptedData),
      filename: payload.filename
    }
  } else {
    return {
      data: decryptedData,
      filename: payload.filename
    }
  }
}

/**
 * Serialize payload to URL-safe string
 */
export function serializePayload(payload: EncryptedPayload): string {
  return btoa(JSON.stringify(payload))
}

/**
 * Deserialize URL-safe string to payload
 */
export function deserializePayload(serialized: string): EncryptedPayload {
  try {
    return JSON.parse(atob(serialized))
  } catch (error) {
    throw new Error('Invalid encrypted payload')
  }
}

/**
 * Generate a shareable link with encrypted data
 */
export function generateShareableLink(
  payload: EncryptedPayload,
  baseUrl: string = ''
): string {
  const serialized = serializePayload(payload)
  return `${baseUrl}/view#${serialized}`
}

/**
 * Extract payload from URL hash
 */
export function extractPayloadFromHash(hash: string): EncryptedPayload | null {
  if (!hash || hash.length <= 1) return null
  
  try {
    // Remove the # character
    const hashContent = hash.substring(1)
    
    // Check if it's an ID reference
    if (hashContent.startsWith('id=')) {
      // This is handled separately in the view page
      return null
    }
    
    return deserializePayload(hashContent)
  } catch (error) {
    return null
  }
}

/**
 * Generate a shareable link with ID (for server storage)
 */
export function generateShareableLinkWithId(
  id: string,
  baseUrl: string = ''
): string {
  return `${baseUrl}/view#id=${id}`
}