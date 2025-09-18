#!/bin/bash

# Test Session APIs
# This script tests the newly created session API endpoints

set -e

# Configuration
BASE_URL="http://localhost:3000/api"
PROJECT_ID="proj_test123"  # You'll need a real project ID

echo "🧪 Testing Session APIs..."
echo "================================"

# Function to pretty print JSON
pretty_json() {
    echo "$1" | jq '.' 2>/dev/null || echo "$1"
}

# Test 1: Create a session
echo ""
echo "1️⃣ Creating a new session..."
SESSION_RESPONSE=$(curl -s -X POST "${BASE_URL}/projects/${PROJECT_ID}/sessions" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Session"}')

SESSION_ID=$(echo "$SESSION_RESPONSE" | jq -r '.id' 2>/dev/null)

if [ -z "$SESSION_ID" ] || [ "$SESSION_ID" = "null" ]; then
    echo "❌ Failed to create session"
    echo "Response: $(pretty_json "$SESSION_RESPONSE")"
    exit 1
else
    echo "✅ Session created with ID: $SESSION_ID"
    echo "Response: $(pretty_json "$SESSION_RESPONSE")"
fi

# Test 2: Get all sessions
echo ""
echo "2️⃣ Getting all sessions for project..."
SESSIONS_RESPONSE=$(curl -s -X GET "${BASE_URL}/projects/${PROJECT_ID}/sessions")
echo "Response: $(pretty_json "$SESSIONS_RESPONSE")"

# Test 3: Get single session
echo ""
echo "3️⃣ Getting single session details..."
SESSION_DETAIL=$(curl -s -X GET "${BASE_URL}/projects/${PROJECT_ID}/sessions/${SESSION_ID}")
echo "Response: $(pretty_json "$SESSION_DETAIL")"

# Test 4: Create a turn
echo ""
echo "4️⃣ Creating a turn in the session..."
TURN_RESPONSE=$(curl -s -X POST "${BASE_URL}/projects/${PROJECT_ID}/sessions/${SESSION_ID}/turns" \
  -H "Content-Type: application/json" \
  -d '{"user_message": "Hello Claude, can you help me?"}')

TURN_ID=$(echo "$TURN_RESPONSE" | jq -r '.id' 2>/dev/null)

if [ -z "$TURN_ID" ] || [ "$TURN_ID" = "null" ]; then
    echo "❌ Failed to create turn"
    echo "Response: $(pretty_json "$TURN_RESPONSE")"
else
    echo "✅ Turn created with ID: $TURN_ID"
    echo "Response: $(pretty_json "$TURN_RESPONSE")"
fi

# Test 5: Get turns for session
echo ""
echo "5️⃣ Getting turns for session..."
TURNS_RESPONSE=$(curl -s -X GET "${BASE_URL}/projects/${PROJECT_ID}/sessions/${SESSION_ID}/turns")
echo "Response: $(pretty_json "$TURNS_RESPONSE")"

# Test 6: Get single turn with blocks
echo ""
echo "6️⃣ Getting single turn details with blocks..."
if [ ! -z "$TURN_ID" ] && [ "$TURN_ID" != "null" ]; then
    TURN_DETAIL=$(curl -s -X GET "${BASE_URL}/projects/${PROJECT_ID}/sessions/${SESSION_ID}/turns/${TURN_ID}")
    echo "Response: $(pretty_json "$TURN_DETAIL")"
fi

# Test 7: Delete session (cleanup)
echo ""
echo "7️⃣ Deleting test session..."
DELETE_RESPONSE=$(curl -s -X DELETE "${BASE_URL}/projects/${PROJECT_ID}/sessions/${SESSION_ID}")
echo "Response: $(pretty_json "$DELETE_RESPONSE")"

echo ""
echo "================================"
echo "✅ All API tests completed!"
echo ""
echo "Note: Some tests may fail if:"
echo "- The server is not running (run 'pnpm dev' first)"
echo "- The PROJECT_ID doesn't exist in the database"
echo "- Database is not properly initialized"