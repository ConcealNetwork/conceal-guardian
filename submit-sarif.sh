#!/bin/bash

# Submit SARIF file to GitHub CodeQL
# Usage: ./submit-sarif.sh [GITHUB_TOKEN]

set -e

# Check if GitHub token is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <GITHUB_TOKEN>"
    echo "You can get a token from: https://github.com/settings/tokens"
    exit 1
fi

GITHUB_TOKEN="$1"
REPO="ConcealNetwork/conceal-guardian"
SARIF_FILE="codeql-results.sarif"

# Check if SARIF file exists
if [ ! -f "$SARIF_FILE" ]; then
    echo "Error: $SARIF_FILE not found"
    echo "Run CodeQL analysis first to generate the SARIF file"
    exit 1
fi

# Get git information
COMMIT_SHA=$(git rev-parse HEAD)
REF=$(git symbolic-ref HEAD)

if [ $? -ne 0 ]; then
    echo "Error: Not in a git repository or no HEAD reference"
    exit 1
fi

echo "Submitting SARIF file to GitHub CodeQL..."
echo "Repository: $REPO"
echo "Commit SHA: $COMMIT_SHA"
echo "Ref: $REF"

# Read SARIF file and create upload JSON
echo "Creating upload JSON..."

# Compress SARIF file with gzip and encode as Base64 as required by GitHub
SARIF_BASE64=$(gzip -c "$SARIF_FILE" | base64 -w0)

# Create upload JSON with proper structure using GitHub's required format
cat > upload.json << EOF
{
  "commit_sha": "$COMMIT_SHA",
  "ref": "$REF",
  "sarif": "$SARIF_BASE64"
}
EOF

# Submit to GitHub API
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  -H "Content-Type: application/json" \
  --data @upload.json \
  "https://api.github.com/repos/$REPO/code-scanning/sarifs"

echo ""
echo "SARIF file submitted successfully!"
echo "Check results at: https://github.com/$REPO/security/code-scanning"

# Clean up
rm -f upload.json 