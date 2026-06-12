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

UVA App is mobile-first. Always open with explicit config to force the viewport:

```bash
playwright-cli open --config=.playwright/cli.config.json "http://localhost:4200/"
playwright-cli resize 360 740
```

Verify viewport after opening:
```bash
playwright-cli --raw eval "JSON.stringify({w: innerWidth, h: innerHeight, dpr: devicePixelRatio})"
# expected: {"w":360,"h":740,"dpr":3}
```

## Usage

```bash
# Initialize the browser session (mobile) and the evidence directory
bash .claude/skills/open_browser/scripts/playwright.sh <view-name> [path] [pass|fail]
```

- `<view-name>` — short slug for the screen under test, e.g. `home`, `measurement`, `historical`.
- `[path]` — optional app path (default `/`), e.g. `/app/tabs/home`.
- `[pass|fail]` — optional status for the screenshot name (default `pass`).

The script opens `http://localhost:4200<path>` in a visible mobile browser and prints the evidence screenshot path to use.

## Screenshot naming convention

All screenshots go to `docs/evidence/` with this format:

```
docs/evidence/[view-name]-[YYYY-MM-DD]-[pass|fail].png
```

---

## Login with test user (no OTP required)

The test user phone number **3000000002** bypasses OTP entirely.

**Important:** playwright-cli uses an in-memory profile — **the session does NOT persist between browser openings.** You must log in every time.

### Step-by-step login flow

```bash
# 1. Open app and set viewport
playwright-cli open --config=.playwright/cli.config.json "http://localhost:4200/"
playwright-cli resize 360 740

# 2. Fill phone number (10 digits, NO +57 prefix)
playwright-cli fill e27 "3000000002"

# 3. Click Continuar
playwright-cli click "getByRole('button', { name: 'Continuar' })"

# 4. Confirm the phone number in the modal
playwright-cli click "getByRole('button', { name: 'Sí, continuar' })"

# 5. The app gets stuck on "Vinculando al proyecto" because waitForSyncDataStore()
#    hangs in the browser (DataStore can't get Cognito tokens via web).
#    This is a known web-only limitation — the native app works fine.
#    WORKAROUND: navigate directly to home after login:
playwright-cli goto "http://localhost:4200/app/tabs/home"
```

### Why no OTP?

The Cognito test user `+573000000002` is auto-confirmed. When `signIn` resolves
with `isSignedIn: true` the app skips OTP and goes to `register/project-vinculation`,
which redirects to `app/tabs/home` for users with a linked UVA project. In the
browser this redirect hangs at `waitForSyncDataStore()` — use the direct goto workaround above.

---

## Onboarding — what data exists and where to find it

The test user **3000000002** has real historical measurement data.
**Always navigate to months with data** to test charts and reports.

### Months with data (as of June 2026)

| Month | Records | Notes |
|---|---|---|
| **Mayo 2026** | **68 registros** | Best month for testing charts — temperature, humidity, rain data |
| June 2026 | 0 registros | Current month, no data yet |

### What the chart view looks like in Mayo 2026

- **Temperature (Tem):** avg 24.3°C, max 28°C, min 22°C
- **Humidity (Hum):** avg 69%, max 85%, min 56%
- **Rain (Acu):** avg 81mm, max 30mm, min 0mm
- Area chart shows the full month curve with confidence band

### How to navigate to a month with data

```bash
# Go to historical view
playwright-cli goto "http://localhost:4200/app/tabs/history"
playwright-cli snapshot

# Click "Mayo" (previous month button — shown at bottom of calendar)
playwright-cli click "getByRole('button', { name: 'Mayo' })"

# Switch to chart view
playwright-cli click "getByRole('button', { name: 'Ver como gráfica' })"

# Take screenshot
playwright-cli screenshot --filename="docs/evidence/historical-mayo-chart-YYYY-MM-DD-pass.png"
```

---

## DataStore sync — verifying data in IndexedDB

After login the DataStore syncs measurement data from the cloud into the
browser's **IndexedDB**. If a view shows 0 records in a month that should have
data, the sync may not have completed. Use these checks:

### Check if IndexedDB has measurement records

```bash
# Count total Measurement records stored locally
playwright-cli --raw eval "
  new Promise(resolve => {
    const req = indexedDB.open('amplify-datastore');
    req.onsuccess = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('Measurement')) { resolve('store not found'); return; }
      const tx = db.transaction('Measurement', 'readonly');
      const store = tx.objectStore('Measurement');
      const countReq = store.count();
      countReq.onsuccess = () => resolve('Measurement count: ' + countReq.result);
    };
    req.onerror = () => resolve('IndexedDB error: ' + req.error);
  })
"
```

### Check all IndexedDB stores (see what's available)

```bash
playwright-cli --raw eval "
  new Promise(resolve => {
    const req = indexedDB.open('amplify-datastore');
    req.onsuccess = e => resolve(Array.from(e.target.result.objectStoreNames).join(', '));
    req.onerror = () => resolve('error');
  })
"
```

### List distinct months that have measurement data

```bash
playwright-cli --raw eval "
  new Promise(resolve => {
    const req = indexedDB.open('amplify-datastore');
    req.onsuccess = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('Measurement')) { resolve('store not found'); return; }
      const tx = db.transaction('Measurement', 'readonly');
      const store = tx.objectStore('Measurement');
      const all = store.getAll();
      all.onsuccess = () => {
        const months = [...new Set(
          all.result.map(r => r.date ? r.date.substring(0,7) : 'no-date')
        )].sort();
        resolve(JSON.stringify({ total: all.result.length, months }));
      };
    };
    req.onerror = () => resolve('error');
  })
"
```

### What to do if IndexedDB is empty after login

The DataStore sync can take a few seconds after authentication. If records are
missing, either:

1. **Wait and reload** — reload the page and check again:
   ```bash
   playwright-cli reload
   playwright-cli snapshot
   ```

2. **Wait for the sync event** — poll until records appear:
   ```bash
   # Run the count check a few times with snapshots in between
   playwright-cli snapshot
   # (wait a moment)
   playwright-cli snapshot
   ```

3. **Navigate directly to the month with data** — even if sync is partial, the
   app may already have enough local records to render the chart:
   ```bash
   playwright-cli goto "http://localhost:4200/app/tabs/history"
   playwright-cli click "getByRole('button', { name: 'Mayo' })"
   playwright-cli click "getByRole('button', { name: 'Ver como gráfica' })"
   playwright-cli screenshot --filename="docs/evidence/historical-mayo-chart-YYYY-MM-DD-pass.png"
   ```

---

## Full session workflow (login → data check → screenshot)

```bash
# 1. Open browser
playwright-cli open --config=.playwright/cli.config.json "http://localhost:4200/"
playwright-cli resize 360 740

# 2. Login with test user
playwright-cli fill e27 "3000000002"
playwright-cli click "getByRole('button', { name: 'Continuar' })"
playwright-cli click "getByRole('button', { name: 'Sí, continuar' })"

# 3. Skip the DataStore hang — go directly to home
playwright-cli goto "http://localhost:4200/app/tabs/home"

# 4. Check IndexedDB has synced data (optional but useful)
playwright-cli --raw eval "
  new Promise(resolve => {
    const req = indexedDB.open('amplify-datastore');
    req.onsuccess = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('Measurement')) { resolve('0'); return; }
      const tx = db.transaction('Measurement', 'readonly');
      tx.objectStore('Measurement').count().onsuccess = e => resolve(e.target.result);
    };
  })
"
# If result is 0, reload and wait a moment before navigating

# 5. Navigate to historical chart — use Mayo 2026 (68 records)
playwright-cli goto "http://localhost:4200/app/tabs/history"
playwright-cli click "getByRole('button', { name: 'Mayo' })"
playwright-cli click "getByRole('button', { name: 'Ver como gráfica' })"

# 6. Take evidence screenshot
playwright-cli screenshot --filename="docs/evidence/historical-mayo-chart-2026-06-11-pass.png"

# 7. Close
playwright-cli close
```

---

## Prerequisites

- `npm start` must be running on port **4200**.
- `playwright-cli` must be available in PATH.
- System Google Chrome must be installed.

## Important

ALWAYS take a screenshot — it is the graphic evidence for the change. The
`.playwright/cli.config.json` file may not load automatically; always pass
`--config=.playwright/cli.config.json` explicitly and follow with `resize 360 740`.
