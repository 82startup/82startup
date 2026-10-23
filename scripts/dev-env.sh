#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

eval "$(supabase status -o env)"
cat > .env.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=$API_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
CRON_SECRET=local-cron-secret
EOF
echo "Wrote .env.local for the local Supabase stack."
