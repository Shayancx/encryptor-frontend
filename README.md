# Encryptor.link

Encryptor.link is a full-stack web application for zero-knowledge encryption of messages and files. All encryption happens in the browser using the Web Crypto API and AES‑256‑GCM. Encrypted data can optionally be stored on the included Ruby backend and retrieved with a short shareable link.

## Features

- **Client‑side encryption** with PBKDF2 key derivation (250k iterations)
- **Rich text editor** for messages powered by [Tiptap](https://tiptap.dev)
- **File uploads** with previews and a 24‑hour automatic expiry
- **Audio player** with metadata extraction and playlist controls
- **User accounts** with JWT authentication for larger upload limits
- **Rate limiting** and password hashing on the backend using bcrypt

## Key dependencies
- Next.js 14, React 18
- Tailwind CSS and Shadcn UI components
- Tiptap editor with extensions
- React H5 Audio Player and music-metadata-browser
- Ruby 3 with Roda, Sequel and bcrypt

## Repository overview

```
app/        Next.js 14 application (pages, routes, UI)
backend/    Ruby Roda server storing encrypted blobs in SQLite
components/ Reusable React components including editor and audio player
lib/        Utility modules and WebCrypto helpers
config/     Site configuration
public/     Static assets
```

### Frontend
- Built with **Next.js 14**, Tailwind CSS and [Shadcn UI](https://ui.shadcn.com)
- Pages: encryption form (`/encrypt`), decryption/view (`/view/[id]`), account management, login and registration
- Uses React contexts for authentication (`lib/contexts/auth-context.tsx`)
- `lib/crypto.ts` implements browser encryption and decryption

### Backend
- `backend/app.rb` exposes a small JSON API with endpoints for upload, download, authentication and account management
- Files are encrypted at rest and stored under `backend/lib/storage`
- Database migrations reside in `backend/db/migrations`
- Includes scripts for cleanup and a CLI tester under `backend/scripts`

## Local development

1. **Install dependencies**
   ```bash
   npm install
   cd backend && bundle install
   ```
2. **Start the backend**
   ```bash
   bundle exec rerun rackup
   ```
   The API will listen on `http://localhost:9292`.
3. **Start the frontend** (in a separate terminal)
   ```bash
   npm run dev
   ```
   Set `NEXT_PUBLIC_API_URL` in `.env.local` if the backend is running on a different host.

Visit `http://localhost:3000` to use the app.

## Deployment

The backend is intended to run behind an HTTPS reverse proxy such as Nginx. See `backend/README.md` for production notes, systemd service and cron examples.

## License

See individual source files for license information.
