#!/bin/bash

# Full authentication test suite

API_BASE="http://localhost:9292/api"
TEST_EMAIL="test_$(date +%s)@example.com"
TEST_PASSWORD="TestP@ssw0rd123!"

echo "=== Full Authentication Test Suite ==="
echo "Testing against: $API_BASE"
echo "Test email: $TEST_EMAIL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

success() {
    echo -e "${GREEN}✓${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

# Test 1: Check anonymous access
echo "1. Testing anonymous access..."
ANON_RESPONSE=$(curl -s "$API_BASE/auth/status")
ANON_LIMIT=$(echo $ANON_RESPONSE | jq -r '.upload_limit_mb')
if [ "$ANON_LIMIT" = "100" ]; then
    success "Anonymous users have 100MB limit"
else
    error "Anonymous limit incorrect: $ANON_LIMIT"
fi

# Test 2: Register new account
echo ""
echo "2. Testing registration..."
REG_RESPONSE=$(curl -s -X POST "$API_BASE/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"login\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

TOKEN=$(echo $REG_RESPONSE | jq -r '.access_token')
if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    success "Registration successful, token received"
else
    error "Registration failed: $REG_RESPONSE"
    exit 1
fi

# Test 3: Check authenticated status
echo ""
echo "3. Testing authenticated status..."
AUTH_RESPONSE=$(curl -s "$API_BASE/auth/status" \
    -H "Authorization: Bearer $TOKEN")
    
AUTH_LIMIT=$(echo $AUTH_RESPONSE | jq -r '.upload_limit_mb')
USER_EMAIL=$(echo $AUTH_RESPONSE | jq -r '.account.email')

if [ "$AUTH_LIMIT" = "4096" ] && [ "$USER_EMAIL" = "$TEST_EMAIL" ]; then
    success "Authenticated users have 4096MB limit"
else
    error "Authentication status incorrect"
fi

# Test 4: Test file upload with auth
echo ""
echo "4. Testing authenticated file upload..."
UPLOAD_RESPONSE=$(curl -s -X POST "$API_BASE/upload" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "encrypted_data": "dGVzdCBkYXRh",
        "password": "FileP@ssw0rd123!",
        "filename": "test.txt",
        "mime_type": "text/plain",
        "iv": "dGVzdGl2"
    }')

FILE_ID=$(echo $UPLOAD_RESPONSE | jq -r '.file_id')
if [ "$FILE_ID" != "null" ] && [ -n "$FILE_ID" ]; then
    success "File uploaded successfully: $FILE_ID"
else
    error "File upload failed: $UPLOAD_RESPONSE"
fi

# Test 5: Logout
echo ""
echo "5. Testing logout..."
LOGOUT_RESPONSE=$(curl -s -X POST "$API_BASE/auth/logout" \
    -H "Authorization: Bearer $TOKEN")
success "Logout completed"

# Test 6: Login with same credentials
echo ""
echo "6. Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"login\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

NEW_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token')
if [ "$NEW_TOKEN" != "null" ] && [ -n "$NEW_TOKEN" ]; then
    success "Login successful"
else
    error "Login failed: $LOGIN_RESPONSE"
fi

echo ""
echo "=== All tests completed ==="
