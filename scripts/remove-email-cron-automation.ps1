# Trend Finder cleanup: remove deprecated email/report scheduling/automation files.
# Run from the project root after overwriting files from the ZIP.

$ErrorActionPreference = "Stop"

$paths = @(
  "app/admin/internal-email-test",
  "app/api/cron",
  "app/api/daily-brief/automation",
  "components/admin/ManualInternalEmailTestView.tsx",
  "lib/trends/automation-config.ts",
  "lib/trends/automation-dry-run-guardrails.ts",
  "lib/trends/automation-dry-run-manifest.ts",
  "lib/trends/automation-internal-email-test-prep.ts",
  "lib/trends/automation-manual-approval.ts",
  "lib/trends/automation-pre-live-checklist.ts",
  "lib/trends/automation-preview-console.ts"
)

foreach ($path in $paths) {
  if (Test-Path $path) {
    Remove-Item $path -Recurse -Force
    Write-Host "Removed $path"
  }
}

if (Test-Path ".next") {
  Remove-Item ".next" -Recurse -Force
  Write-Host "Removed .next cache"
}

Write-Host "Cleanup complete. Manual scan, reports, PDF/HTML/JSON exports and Admin diagnostics remain."
