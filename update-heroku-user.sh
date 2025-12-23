#!/bin/bash

# Script to update test user tier on Heroku
# Make sure you've added the admin endpoint to server.ts and deployed to Heroku first

echo "🔧 Updating test user tier on Heroku..."

curl -X POST https://financial-tracker-ai-insight-a194fc716874.herokuapp.com/admin/update-user-tier \
  -H "Content-Type: application/json" \
  -H "x-admin-token: temp-admin-token-change-me" \
  -d '{
    "email": "muppetalert1@protonmail.com",
    "tier": "BUSINESS",
    "password": "Panserainer@100"
  }' \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "✅ If you see 'User updated to tier BUSINESS successfully', the fix is working!"
echo "🧹 Remember to remove the admin endpoint from server.ts after this for security."