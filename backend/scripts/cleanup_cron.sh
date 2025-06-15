#!/bin/bash
# Add to crontab: */30 * * * * /path/to/encryptor.link/backend/scripts/cleanup_cron.sh

cd /path/to/encryptor.link/backend
/usr/bin/curl -X DELETE http://localhost:9292/api/cleanup
