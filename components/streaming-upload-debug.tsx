// This is a debug wrapper - the actual component is still streaming-upload.tsx
// Add this to your streaming-upload.tsx for debugging:

/*
// Add at the beginning of uploadFile function:
console.log(`[Upload] Starting upload for ${file.name}`, {
  size: file.size,
  type: file.type,
  chunks: Math.ceil(file.size / (1024 * 1024))
});

// Add in streamEncryptAndUpload before each chunk upload:
console.log(`[Chunk] Uploading chunk ${chunkIndex}/${session.totalChunks}`, {
  chunkSize: chunk.byteLength,
  sessionId: session.sessionId
});

// Add after successful chunk upload:
console.log(`[Chunk] Successfully uploaded chunk ${chunkIndex}`, {
  progress: session.uploadedChunks,
  total: session.totalChunks
});
*/
