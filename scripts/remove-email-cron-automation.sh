#!/usr/bin/env bash
set -euo pipefail

paths=(
  "app/admin/internal-email-test"
  "app/api/cron"
  "app/api/daily-brief/automation"
  "components/admin/ManualInternalEmailTestView.tsx"
  "lib/trends/automation-config.ts"
  "lib/trends/automation-dry-run-guardrails.ts"
  "lib/trends/automation-dry-run-manifest.ts"
  "lib/trends/automation-internal-email-test-prep.ts"
  "lib/trends/automation-manual-approval.ts"
  "lib/trends/automation-pre-live-checklist.ts"
  "lib/trends/automation-preview-console.ts"
)

for path in "${paths[@]}"; do
  if [ -e "$path" ]; then
    rm -rf "$path"
    echo "Removed $path"
  fi
done

if [ -d ".next" ]; then
  rm -rf .next
  echo "Removed .next cache"
fi

echo "Cleanup complete. Manual scan, reports, PDF/HTML/JSON exports and Admin diagnostics remain."
