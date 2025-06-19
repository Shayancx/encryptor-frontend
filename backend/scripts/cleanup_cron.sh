#!/bin/bash
# Add to crontab: */30 * * * * /path/to/encryptor.link/backend/scripts/cleanup_cron.sh

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$BACKEND_DIR"
/usr/bin/curl -X DELETE http://localhost:9292/api/cleanup
