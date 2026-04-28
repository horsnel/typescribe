#!/usr/bin/env bash
#
# set-vercel-env.sh
#
# Set environment variables for the Typescribe project on Vercel
# and also write them to the local .env.local file.
#
# Usage:
#   chmod +x scripts/set-vercel-env.sh
#   ./scripts/set-vercel-env.sh
#
# Prerequisites:
#   - Vercel CLI installed: npm i -g vercel
#   - Logged in: vercel login
#   - Project linked: vercel link

set -euo pipefail

# ─── Environment Variables ───

ENV_VARS=(
  "SCRAPINGANT_KEY_1=c1356ecb0c6b4142ac29754b17c00594"
  "SCRAPINGANT_KEY_2=5115defa25f34c528d660a7cb638bb75"
  "SCRAPINGANT_KEY_3=cdc461cc121f40ad8d5bd394a7f1192a"
  "SCRAPINGANT_KEY_4=63d8770d7d5747ff81c5bf3c9c84f536"
  "SCRAPINGANT_KEY_5=68f7a95600674e09a4aacb97ddef0b5e"
  "ADMIN_PASSWORD=olhmes2024admin"
)

# ─── Set on Vercel ───

echo "🔧 Setting environment variables on Vercel..."

for env_var in "${ENV_VARS[@]}"; do
  key="${env_var%%=*}"
  value="${env_var#*=}"
  echo "  Setting ${key}..."
  vercel env add "${key}" production <<< "${value}" 2>/dev/null || \
    vercel env rm "${key}" production -y 2>/dev/null && \
    vercel env add "${key}" production <<< "${value}" 2>/dev/null || \
    echo "  ⚠️  Could not set ${key} on Vercel (may already exist or CLI not linked)"
done

echo "✅ Vercel environment variables configured."
echo ""
echo "💡 Note: If the above commands failed, set them manually:"
echo "   vercel env add SCRAPINGANT_KEY_1 production"
echo "   vercel env add SCRAPINGANT_KEY_2 production"
echo "   ... etc."
echo ""

# ─── Write to .env.local ───

ENV_LOCAL=".env.local"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_LOCAL_PATH="${PROJECT_ROOT}/${ENV_LOCAL}"

echo "📝 Writing environment variables to ${ENV_LOCAL_PATH}..."

# Read existing vars if file exists
declare -A existing_vars
if [[ -f "$ENV_LOCAL_PATH" ]]; then
  echo "  Appending to existing ${ENV_LOCAL}..."
  while IFS='=' read -r k v; do
    [[ -z "$k" || "$k" =~ ^# ]] && continue
    existing_vars["$k"]="$v"
  done < "$ENV_LOCAL_PATH"
else
  echo "  Creating new ${ENV_LOCAL}..."
fi

# Build new content: keep existing lines that aren't being overwritten, then add our vars
tmp_file=$(mktemp)
if [[ -f "$ENV_LOCAL_PATH" ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    key_in_line="${line%%=*}"
    # Skip lines whose key we're about to set
    skip=false
    for env_var in "${ENV_VARS[@]}"; do
      k="${env_var%%=*}"
      if [[ "$key_in_line" == "$k" ]]; then
        skip=true
        break
      fi
    done
    if ! $skip; then
      echo "$line" >> "$tmp_file"
    fi
  done < "$ENV_LOCAL_PATH"
fi

# Add our variables
echo "" >> "$tmp_file"
echo "# ─── ScrapingAnt Keys & Admin Password (set by scripts/set-vercel-env.sh) ───" >> "$tmp_file"
for env_var in "${ENV_VARS[@]}"; do
  echo "$env_var" >> "$tmp_file"
done

mv "$tmp_file" "$ENV_LOCAL_PATH"
echo "✅ ${ENV_LOCAL} updated."

echo ""
echo "🎉 Done! Environment variables are set on Vercel and in ${ENV_LOCAL_PATH}."
