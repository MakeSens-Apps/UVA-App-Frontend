---
name: open_browser
description: >
  Launches Playwright to test the UVA App in a real browser, ALWAYS in a
  Samsung Galaxy S8 (360x740) mobile viewport. Manages browser lifecycle,
  screenshot naming, and the evidence directory. Built on playwright-cli.
allowed-tools: Bash(playwright-cli:*) Bash(mkdir:*) Bash(bash .claude/skills/open_browser/scripts/playwright.sh:*) Bash(curl:*)
---

# Mobile E2E Browser Testing (Samsung Galaxy S8 360x740)

Opens a real browser to test the UVA App, interacts with the UI like a
user on a phone would, and captures evidence screenshots with a consistent
naming convention.

## The viewport is always Samsung Galaxy S8 360x740

UVA App is mobile-first. The browser opened by this skill is automatically
emulated as an **Samsung Galaxy S8 (3rd gen): 375×667 px, deviceScaleFactor 2, touch
enabled** via `.playwright/cli.config.json`. **All UI must be validated at this
size.** You never need to pass a viewport flag.

## Usage

```bash
# Initialize the browser session (mobile) and the evidence directory
bash .claude/skills/open_browser/scripts/playwright.sh <view-name> [path] [pass|fail]
```

- `<view-name>` — short slug for the screen under test, e.g. `home`, `measurement`, `historical`.
- `[path]` — optional app path (default `/`), e.g. `/app/tabs/home`.
- `[pass|fail]` — optional status for the screenshot name (default `pass`).

The script opens `http://localhost:4200<path>` in a visible (`--headed`) mobile
browser and prints the evidence screenshot path to use.

## Screenshot naming convention

All screenshots go to `docs/evidence/` with this format:

```
docs/evidence/[view-name]-[YYYY-MM-DD]-[pass|fail].png
```

Examples:
- `docs/evidence/home-2026-06-11-pass.png`
- `docs/evidence/measurement-2026-06-11-fail.png`

The date and status are deliberate — they serve as historical reference and as
the graphic evidence attached to pull requests.

---

## Login with test user (no OTP required)

The test user phone number **3000000002** bypasses OTP entirely and lands
directly on the home screen.

### Step-by-step login flow

```bash
# 1. Open the app (login page loads by default)
bash .claude/skills/open_browser/scripts/playwright.sh login /

# 2. Take a snapshot to see the login form elements
playwright-cli snapshot

# 3. Fill the phone number field (10 digits, NO country code)
playwright-cli fill "getByRole('textbox')" "3000000002"
# or use the ref from snapshot, e.g.:
# playwright-cli fill e5 "3000000002"

# 4. Click "Continuar" button
playwright-cli click "getByRole('button', { name: 'Continuar' })"

# 5. A confirmation modal appears: "¿Es correcto este número de teléfono: 3000000002?"
playwright-cli snapshot
# Click "Sí, continuar" in the modal
playwright-cli click "getByRole('button', { name: 'Sí, continuar' })"

# 6. The app authenticates automatically — no OTP code needed.
#    It navigates: login → register/project-vinculation → app/tabs/home
#    Wait for the home screen to load (DataStore sync may take a moment)
playwright-cli snapshot

# 7. Confirm we're on home
playwright-cli screenshot --filename="docs/evidence/home-2026-06-11-pass.png"
```

### Why no OTP?

The Cognito test user `+573000000002` is configured as auto-confirmed.
When `signIn` resolves with `isSignedIn: true`, the app skips the OTP page
and navigates directly to `register/project-vinculation`, which then redirects
to `app/tabs/home` for users who already have a linked UVA project.

### Fallback: if the modal buttons are hard to target

```bash
# Inspect the modal structure
playwright-cli snapshot

# Use the text to find the correct button ref
playwright-cli click "getByText('Sí, continuar')"
```

---

## Full interaction workflow

After launching the browser with the script, use `playwright-cli` directly:

```bash
# 1. The script opens a VISIBLE mobile browser to localhost:4200 (--headed)

# 2. Confirm the mobile viewport (optional sanity check)
playwright-cli --raw eval "JSON.stringify({w: innerWidth, h: innerHeight, dpr: devicePixelRatio})"
# expected: {"w":360,"h":740,"dpr":3}

# 3. Take a snapshot to find UI elements (use the element refs it returns)
playwright-cli snapshot

# 4. Interact like a user on a phone (tap buttons, fill inputs)
playwright-cli click e9
playwright-cli fill e5 "value"

# 5. Wait for content to render — poll with snapshots, don't sleep blindly
playwright-cli snapshot

# 6. Take the evidence screenshot (full mobile page)
playwright-cli screenshot --filename="docs/evidence/home-2026-06-11-pass.png"

# 7. Close the browser
playwright-cli close
```

## Prerequisites

- `ionic serve` (or `npm start`) must be running on port **4200** (the script verifies this).
- `playwright-cli` must be available in PATH.
- System Google Chrome must be installed (the mobile config uses the `chrome` channel).

## Important

The script handles session lifecycle, the mobile viewport (via the default
config), and directory setup. The actual interaction sequence is performed with
`playwright-cli` commands directly. ALWAYS take a screenshot — it is the graphic
evidence for the change and is attached to the PR.
