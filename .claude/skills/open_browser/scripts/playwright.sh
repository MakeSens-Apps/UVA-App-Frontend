#!/usr/bin/env bash
set -euo pipefail

# Mobile E2E launcher for UVA App.
# Opens the app in a headed browser ALWAYS emulated as iPhone SE (375x667),
# enforced by .playwright/cli.config.json (loaded automatically by playwright-cli).

NAME="${1:?Usage: playwright.sh <view-name> [path] [pass|fail]}"
APP_PATH="${2:-/}"
STATUS="${3:-pass}"

DATE=$(date +%Y-%m-%d)
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
EVIDENCE_DIR="$PROJECT_DIR/docs/evidence"
FILENAME="${NAME}-${DATE}-${STATUS}.png"
URL="http://localhost:4200${APP_PATH}"

# Ensure evidence directory exists
mkdir -p "$EVIDENCE_DIR"

# Verify dev server is running (ionic serve runs on port 4200)
if ! curl -s --connect-timeout 3 http://localhost:4200 > /dev/null 2>&1; then
  echo "Error: Dev server not running on port 4200. Start with 'ionic serve' or 'npm start' first." >&2
  exit 1
fi

# Make sure no stale session keeps a desktop-sized context around
playwright-cli close-all > /dev/null 2>&1 || true

# Open browser in headed mode (visible window) — the default config file
# .playwright/cli.config.json forces the iPhone SE 375x667 mobile viewport.
playwright-cli open --config=.playwright/cli.config.json --headed "$URL"
playwright-cli resize 360 740

# Sanity-check the viewport so it's obvious in the logs that this is mobile
VIEWPORT=$(playwright-cli --raw eval "JSON.stringify({w: innerWidth, h: innerHeight, dpr: devicePixelRatio})" 2>/dev/null || echo "unknown")

echo "Browser opened (mobile / iPhone SE) at $URL"
echo "Viewport: $VIEWPORT   (expected {\"w\":360,\"h\":740,\"dpr\":3})"
echo "Evidence path: $EVIDENCE_DIR/$FILENAME"
echo ""
echo "Test user login (no OTP required):"
echo "  Phone: 3000000002"
echo "  1. playwright-cli fill \"getByRole('textbox')\" \"3000000002\""
echo "  2. playwright-cli click \"getByRole('button', { name: 'Continuar' })\""
echo "  3. playwright-cli click \"getByRole('button', { name: 'Sí, continuar' })\""
echo "  (app navigates directly to home — no OTP needed)"
echo ""
echo "Use playwright-cli commands to interact:"
echo "  playwright-cli snapshot          # See page structure"
echo "  playwright-cli click <ref>       # Tap a button"
echo "  playwright-cli fill <ref> \"...\"  # Enter a value"
echo "  playwright-cli screenshot --filename=\"$EVIDENCE_DIR/$FILENAME\""
echo "  playwright-cli close             # End session"
