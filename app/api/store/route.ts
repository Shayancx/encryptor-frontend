import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for demo purposes
// In production, use a database or persistent storage
const encryptedStorage = new Map<string, any>()

// Generate a random ID
function generateId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate that we received encrypted data
    if (!body || !body.ciphertext) {
      return NextResponse.json(
        { error: 'Invalid encrypted payload' },
        { status: 400 }
      )
    }

    // Generate a unique ID
    let id: string
    do {
      id = generateId()
    } while (encryptedStorage.has(id))

    // Store the encrypted blob
    // Note: We're storing the entire encrypted payload, not inspecting it
    encryptedStorage.set(id, body)

    // Optional: Set expiration (e.g., delete after 24 hours)
    setTimeout(() => {
      encryptedStorage.delete(id)
    }, 24 * 60 * 60 * 1000) // 24 hours

    return NextResponse.json({ id })
  } catch (error) {
    console.error('Store error:', error)
    return NextResponse.json(
      { error: 'Failed to store encrypted data' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json(
      { error: 'ID parameter required' },
      { status: 400 }
    )
  }

  const encryptedData = encryptedStorage.get(id)

  if (!encryptedData) {
    return NextResponse.json(
      { error: 'Encrypted data not found or expired' },
      { status: 404 }
    )
  }

  return NextResponse.json(encryptedData)
}