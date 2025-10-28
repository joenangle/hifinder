#!/bin/bash

# Test script to see what Vercel API actually returns
# Run this locally to debug the API response

echo "Testing Vercel API..."
echo ""

# You'll need to set your VERCEL_TOKEN
if [ -z "$VERCEL_TOKEN" ]; then
  echo "Error: VERCEL_TOKEN not set"
  echo "Get your token from: https://vercel.com/account/tokens"
  echo "Then run: export VERCEL_TOKEN='your-token-here'"
  exit 1
fi

echo "Fetching deployments for hifinder project..."
echo ""

curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v6/deployments?projectId=prj_D9SCi3ptkkrWB44UfdjTFKhP5BN2&limit=5&teamId=team_Gic8SL9uR5MbiWqUFz2MehJQ" \
  | jq '.'

echo ""
echo "Look at the output above and find:"
echo "1. Is there a 'deployments' array?"
echo "2. What fields are in each deployment?"
echo "3. How is the git branch stored?"
echo "4. What's the state/readyState field called?"
