# Encryptor.link Backend

Zero-knowledge encryption backend server built with Ruby.

## Features

- ✅ AES-256 file encryption at rest
- ✅ Salted password hashing with bcrypt
- ✅ File size and type validation (max 5GB)
- ✅ Automatic file expiration and cleanup
- ✅ IP-based rate limiting
- ✅ Comprehensive error logging
- ✅ CORS support for frontend integration
- ✅ Health check endpoint
- ✅ CLI tool for testing

## Setup

1. Install Ruby 3.0+
2. Run `bundle install`
3. Start development server: `bundle exec rerun rackup`

## Production Deployment

1. Copy systemd service file to `/etc/systemd/system/`
2. Update paths in service file
3. Configure Nginx using the example configuration
4. Set up SSL certificates with Let's Encrypt
5. Add cleanup cron job
6. Start service: `systemctl start encryptor-backend`

## API Endpoints

- `POST /api/upload` - Upload encrypted file
- `GET /api/download/:id` - Download encrypted file
- `GET /api/status` - Health check
- `GET /api/info` - Service information
- `DELETE /api/cleanup` - Manual cleanup

## Security Notes

- Backend binds only to localhost
- All traffic must go through reverse proxy (Nginx)
- HTTPS is required in production
- Files are encrypted at rest
- Passwords are never stored in plaintext
- Automatic cleanup of expired files

## Testing

Use the CLI tool:
```bash
# Upload
./scripts/cli_test.rb -u file.txt -p "StrongPassword123"

# Download  
./scripts/cli_test.rb -d <file_id> -p "StrongPassword123" -o output.txt
```
