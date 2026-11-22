# Doros Desktop: Agentic Build Plan

A macOS desktop version of Doros (Crush Quest). It runs the **same web app, against the same
Supabase database, with the same features**. On top of that, Electron adds:

1. A red tomato in the macOS menu bar with the countdown drawn inside it.
2. Blocking of distracting websites while a focus session runs.

This plan is meant for a coding agent (Claude Code) to carry out phase by phase. Each phase has
tasks, a definition of done, and how to check it. Do the phases in order and commit after each one.
**Stop and hand off to the user** at every step marked 🧑. Those steps need `sudo`, a macOS
permission dialog, or the Supabase dashboard.

### Progress (branch `desktop-app`)
| Phase | Status |
|---|---|
| 1. Electron shell | ✅ done (`aa8cdcc`) |
| 2. Login via system browser + `doros://` | ✅ done (`7fbda77`), user-verified |
| 3. Timer sync + tray Pause/Resume/Cancel/Start | ✅ done (`2f48691`), user-verified |
| 4. Tomato with the countdown inside it | ✅ done (`b7da574`), user-verified |
| 5. Tray menu | 🟡 next: only **Launch at login** (+ optional ⌥⌘D) left; the rest was built in Phases 3–4, blocking items belong to Phase 6 |
| 6. Website blocking | ⏳ |
| 7. Notifications and packaging | ⏳ (unsigned `.app`, Dock icon, `doros` protocol already done; see the Phase 7 list) |

---

## 0. Decisions (already made, don't revisit)

| Topic | Decision | Why |
|---|---|---|
| Repo | **Inside `doros-supa`**, in a new top-level `electron/` folder. No workspaces and no monorepo. | The desktop window *is* the web app. Keeping both in one repo means one codebase, one feature set, and one set of types and queries. |
| Electron's role | A thin shell. The main process owns the **tray, the site blocker, OAuth deep links, and window lifecycle**. All Doros features stay in the React app. | Nothing gets duplicated, and new web features show up in the desktop app automatically. |
| What the window loads | Dev: `http://localhost:5173` (Vite). Packaged: the **live site `https://crush.quest`**. Both are set by `DOROS_URL`. | Avoids `file://` and `BrowserRouter` routing problems. The desktop app stays in sync with web deploys. Doros needs Supabase anyway, so there's no offline case to support. |
| Timer source of truth | **Stays in the React app** (the existing `CreateDoro` timer). The renderer pushes `{ endTime, pausedTimeLeft, isPaused, task }` to the main process over IPC. The main process draws the tray from that. | Logging a doro (task, image upload, Supabase insert) already works there. The tray is a view of that timer plus remote controls for it. |
| Bridge | A `preload` script exposes a small typed `window.doros` API (`contextIsolation: true`, `nodeIntegration: false`). The web app checks `if (window.doros)`. In a normal browser it's `undefined` and nothing changes. | One build serves the web and the desktop app. |
| Login | Google OAuth opens in the **system browser**, then comes back to the app through the deep link `doros://auth-callback`. The renderer calls `supabase.auth.setSession(...)`. | Google blocks OAuth sign-in inside embedded Electron windows. |
| Tomato and countdown | Render an SVG (round tomato plus minutes left, seconds in the last minute; changed in Phase 4 at the user's request, was `MM:SS` in a wide tomato) to PNG with `@resvg/resvg-js`, then `tray.setImage()` | macOS template images are monochrome, and the tomato must be red. |
| Website blocking | Edit `/etc/hosts` through a root-owned helper script allowed by a `sudoers.d` rule | Works in every browser and needs no extension. Blocking by IP with `pf` fails because these sites sit behind CDNs. |
| When to block | Only while a **focus** timer is running, plus a manual "Block sites now" toggle in the tray | Default Pomodoro behavior. |
| Closing the window | **Hides** it, so the timer keeps running in the hidden renderer. Quit is in the tray menu. | The tray needs the renderer to stay alive. |
| Scope | **Personal use, one Mac.** No signing, notarization, auto-update, or Windows/Linux support. | That's what was asked for. |

### Block list

```ts
// electron/blocklist.ts
export const BLOCKED_DOMAINS = [
  "insideevs.com", "www.insideevs.com",
  "electrek.co", "www.electrek.co",
  "macrumors.com", "www.macrumors.com", "forums.macrumors.com",
  "reddit.com", "www.reddit.com", "old.reddit.com", "new.reddit.com",
  "np.reddit.com", "i.reddit.com", "m.reddit.com",
  "news.ycombinator.com",
];
```

---

## Architecture

```
doros-supa/
  src/                          # existing React app (web + desktop renderer)
    types/desktop.d.ts          # NEW: `window.doros?: DorosBridge` type
    lib/desktopBridge.ts        # NEW: isDesktop(), getDesktopBridge(), parseAuthCallback()
    hooks/useDesktopAuthCallback.ts # NEW: doros://auth-callback → supabase.auth.setSession
    hooks/useDesktopTimerSync.ts# NEW: pushes timer state to main, handles tray commands
    hooks/useTimerControls.ts   # NEW: pause/resume/stop, moved unchanged out of CreateDoro
    components/DesktopTimerSync.tsx # NEW: renders nothing; mounted in Home (desktop only)
    components/CreateDoro.tsx   # CHANGED: uses useTimerControls()
    components/Login.tsx        # CHANGED: desktop path uses the system browser + deep link
  electron/                     # NEW: main process, compiled with tsc to electron-dist/
    tsconfig.json               # module: commonjs (or ESM), target node, outDir ../electron-dist
    main.ts                     # app lifecycle, window, tray, IPC, deep links
    preload.ts                  # contextBridge.exposeInMainWorld("doros", …)
    ipc.ts                      # channel names + payload types (shared with src/types/desktop.d.ts)
    tray.ts                     # tray image + menu, rebuilt on every state change
    trayMenu.ts                 # pure: buildTrayMenu(state, actions, settings) → menu template
    settings.ts                 # pure: parseSettings() for userData/doros-settings.json (Phase 4)
    deepLink.ts                 # pure: isAuthCallbackUrl(), AuthCallbackRelay (buffers until renderer listens)
    tomatoIcon.ts               # pure: buildSvg(text, variant) → string; renderPng() → PNG (tray.ts → nativeImage)
    countdown.ts                # pure: remainingMs(timerState, now), formatMMSS(ms)
    hostsFile.ts                # pure: addBlock(text, domains) / removeBlock(text)
    blocker.ts                  # sudo -n /usr/local/bin/doros-block on|off|status
    blocklist.ts
    __tests__/                  # vitest: countdown, hostsFile, tomatoIcon
  electron/helper/
    doros-block.sh              # generated from blocklist.ts at build time
    install-helper.sh           # 🧑 one-time sudo install
    uninstall-helper.sh
  electron-builder.yml          # mac target, appId com.doros.desktop, protocol "doros"
```

### Bridge API (the contract between the two halves)

```ts
// src/types/desktop.d.ts  (and mirrored by electron/ipc.ts)
export interface DesktopTimerState {
  phase: "idle" | "focus" | "break";
  endTime?: number;            // epoch ms while running
  pausedTimeLeft?: number;     // ms while paused
  isPaused: boolean;
  task: string;
}
export type TrayCommand = "pause" | "resume" | "stop" | "show" | "start"; // "start" added in Phase 3

export interface DorosBridge {
  updateTimer(state: DesktopTimerState): void;              // renderer → main
  onTrayCommand(cb: (cmd: TrayCommand) => void): () => void; // main → renderer (returns unsubscribe)
  openExternal(url: string): void;                           // for the OAuth URL
  onAuthCallback(cb: (url: string) => void): () => void;     // deep link → renderer
}
declare global { interface Window { doros?: DorosBridge } }
```

### Data flow

```
React CreateDoro timer ──updateTimer()──▶ main
                                         ├─▶ every 1s: countdown → tomatoIcon → tray.setImage()
                                         ├─▶ phase focus & running → blocker.on()
                                         │   otherwise (and manual toggle off) → blocker.off()
                                         └─▶ Notification when endTime passes (if window hidden)
Tray menu click ──onTrayCommand()──▶ React (pause/resume/stop via existing timer handlers)
Logging the doro: unchanged. The existing React + React Query mutation inserts into Supabase.
```

### Testing notes
- **Doros last 5 seconds against local Vite.** `.env` has `VITE_DEV_SHORT_TIMER=true`, and
  `CreateDoro` honours it only when `import.meta.env.DEV`, so `vite build` and crush.quest stay
  at 25 minutes. Handy for a full run (tray countdown, blocking in Phase 6, the "done"
  notification in Phase 7). Seed `localStorage["timerState"]` with a later `endTime` when a
  longer session is needed.
- The packaged app can be pointed at local Vite until desktop changes are deployed:
  `DOROS_URL=http://localhost:5173 env -u ELECTRON_RUN_AS_NODE release/mac-arm64/Doros.app/Contents/MacOS/Doros`.
- Seed a 25-minute doro from DevTools (⌥⌘I) in the logged-in window:
  `localStorage.setItem("timerState", JSON.stringify({ endTime: Date.now() + 25*60*1000, task: "Test", isPaused: false, originalDuration: 25*60*1000, launchAt: new Date().toISOString() })); location.reload();`
- **Agent test instance while the user's app is running:** the agent may not quit the user's app,
  and the single-instance lock would just focus it. Launch a second copy with its own profile:
  add `--user-data-dir=<scratchpad>/profile --remote-debugging-port=9333 --inspect=9334`. That
  profile is logged out, but `window.doros.updateTimer(...)` works on the login page, so the tray
  can be driven over CDP. In main, load modules by absolute path
  (`process.mainModule.require(process.resourcesPath + "/app.asar/electron-dist/x.js")`). Quit it
  with `app.quit()` over the inspector.
- **Is the tray item there?** On the MacBook the notch can hide it. Without accessibility
  permission, list status item windows with JXA
  (`osascript -l JavaScript`, `ObjC.import("CoreGraphics")`, `CGWindowListCopyWindowInfo`):
  the Doros window at layer 25 with `kCGWindowIsOnscreen` false means hidden by the notch. The
  user fixes it once by making room and ⌘-dragging the tomato right (macOS remembers). (`swift`
  scripts don't work on this Mac: broken Command Line Tools module maps.)

---

## Phase 1: Electron shell that loads Doros ✅ DONE (commit `aa8cdcc`)

**Tasks**
1. Add dev dependencies: `electron`, `electron-builder`, `@resvg/resvg-js`, `concurrently`, `wait-on`.
2. Create `electron/main.ts`, `electron/preload.ts`, and `electron/tsconfig.json`, compiling to `electron-dist/`.
   Set `"main": "electron-dist/main.js"` in `package.json`.
3. `BrowserWindow` loads `process.env.DOROS_URL ?? "https://crush.quest"` with the preload script,
   `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`.
   Open any non-Doros link in the system browser (`setWindowOpenHandler` → `shell.openExternal`).
4. Hide the window on close instead of quitting. Keep **both** a Dock icon and the menu bar tray (decided). Do not call `app.dock.hide()` or set `LSUIElement`. Clicking the Dock icon (`app.on("activate")`) shows the window.
   Use `app.requestSingleInstanceLock()`.
5. Add a static tomato tray icon with a menu: **Show Doros**, **Quit**.
6. Add scripts:
   - `desktop:dev`: `concurrently "vite" "tsc -p electron -w" "wait-on http://localhost:5173 && DOROS_URL=http://localhost:5173 electron ."`
   - `desktop:build`: `tsc -p electron && electron-builder --mac`
7. **Keep the Netlify web build unaffected:** add `ELECTRON_SKIP_BINARY_DOWNLOAD = "1"` to `netlify.toml`
   build environment. Add `electron-dist/` and `release/` to `.gitignore`. Exclude `electron/` from
   the root `tsconfig.json` and give it its own.
8. Add an "Electron" section to `AGENTS.md`. `electron/` is Node main-process code, so the React
   Query and Tailwind rules don't apply there. Renderer-side desktop code in `src/` still follows them.

**Done when:** `npm run desktop:dev` opens a window running Doros from Vite (you may not be able
to log in yet), the tray shows a tomato, and `npm run build`, `npm test` and `npx tsc --noEmit` still pass.

**Status / deviations from the plan (Phase 1):**
- ✅ Verified: dev window loads Vite, packaged `.app` loads https://crush.quest, `window.doros` has
  all 4 methods, no `require`/`process` in the page, close hides, Dock click re-shows, second
  launch focuses the first, tomato visible in the menu bar (hidden behind the MacBook notch when
  that menu bar is crowded).
- `electron-dist/package.json` (`"type": "commonjs"`) is committed (gitignore exception), because
  the repo root is `"type": "module"` and the main process compiles to CommonJS.
- `desktop:dev` runs Electron with `env -u ELECTRON_RUN_AS_NODE` (VS Code sets it) and also waits
  for `electron-dist/main.js`.
- `backgroundThrottling: false` so the hidden renderer's timer isn't throttled.
- Static tray icon is committed PNGs (`electron/assets/trayTomato{,@2x}.png`), generated once from
  `trayTomato.svg` with resvg.
- `electron-builder.yml` already exists (`mac.target: dir`, `identity: null`) and **excludes
  `node_modules/**`** (402 MB → 271 MB). Phase 4 must add `@resvg/resvg-js` +
  `@resvg/resvg-js-darwin-arm64` back to `files` (and `asarUnpack` the `.node` binary), and move
  `@resvg/resvg-js` to `dependencies`. (✅ Done in Phase 4.)
- Pre-existing on `dev` before this work: 20 failing tests (7 files) and 175 `tsc --noEmit` errors.
  Each phase is checked for **no new** failures/errors rather than all-green.

---

## Phase 2: Login inside the desktop app ✅ DONE (commit `7fbda77`)

Google refuses OAuth inside an embedded Electron window, so desktop login goes through the system browser.

**Tasks**
1. Register the `doros` protocol: `app.setAsDefaultProtocolClient("doros")`, and declare it in
   `electron-builder.yml` (`protocols`). Handle `app.on("open-url")`: forward the URL to the renderer
   (`onAuthCallback`) and show the window.
2. In `Login.tsx`, if `isDesktop()`:
   ```ts
   const { data } = await supabase.auth.signInWithOAuth({
     provider: "google",
     options: { redirectTo: "doros://auth-callback", skipBrowserRedirect: true,
                queryParams: { access_type: "offline" } },
   });
   window.doros!.openExternal(data.url);
   ```
   Otherwise keep the current web flow untouched.
3. Add `src/hooks/useDesktopAuthCallback.ts`, mounted once near `AuthProvider`. On a callback URL,
   parse `access_token` and `refresh_token` from the hash, then call `supabase.auth.setSession(...)`.
   The existing `AuthContext` takes it from there.
   (The client uses the default implicit flow. Don't switch the shared client to PKCE, because that
   changes the live web login.)
4. ✅ DONE by the user. `doros://auth-callback` is already in **Supabase → Authentication → URL Configuration → Redirect URLs**. Don't ask again.
5. Tests: `Login` renders the desktop branch when `window.doros` is mocked and calls `openExternal`
   with the OAuth URL. The web branch is unchanged. `useDesktopAuthCallback` calls `setSession` with
   the parsed tokens.

**Note:** macOS deep links only work reliably from a packaged `.app`. Test this phase with
`npm run desktop:build` and open `release/mac*/Doros.app`. In dev, a fallback is acceptable:
paste the callback URL into a hidden menu item.

**Done when:** in the packaged app, you click Sign in with Google, the system browser opens, you
return to the app logged in as the same user as on the web, and the feed and leaderboard load from Supabase.

**Status / deviations from the plan (Phase 2):**
- ✅ Verified by the agent: dev window over CDP (Sign in calls `openExternal` with the Supabase
  `/authorize` URL, `provider=google`, `redirect_to=doros://auth-callback`; a fake callback reaches
  `setSession`; other `doros://` URLs are ignored; a link that arrives mid-reload is held and
  delivered once the new page subscribes). Packaged app: Info.plist has `CFBundleURLSchemes: doros`,
  `isDefaultProtocolClient("doros")` is true, and a real `open "doros://auth-callback#…"` reaches
  the hidden window, shows it, and runs `setSession`.
- ✅ Verified by the user (2026-11-21): real Google sign-in in the packaged app (pointed at local
  Vite) opened the system browser and came back logged in.
- **The packaged app loads https://crush.quest, which won't have the desktop `Login` branch until
  this is merged and deployed.** Until then, test the packaged app against local Vite:
  `DOROS_URL=http://localhost:5173 release/mac-arm64/Doros.app/Contents/MacOS/Doros`.
  On crush.quest today, Sign in inside the desktop window still runs the web flow (Google blocks it).
- Deep links can arrive before the page is listening (cold start, reload). `electron/deepLink.ts`
  `AuthCallbackRelay` holds the latest URL until the preload says the page subscribed. That is a new
  internal IPC channel `doros:auth-callback-ready` (preload → main). The `DorosBridge` API is unchanged.
- `setAsDefaultProtocolClient("doros")` runs **only when packaged**. Unpackaged, it would register the
  generic Electron.app as the `doros://` handler. Dev fallback: the tray menu shows
  **Paste Auth Callback URL (dev)**, which reads a copied `doros://auth-callback#…` URL from the clipboard.
  (In Electron 45 `clipboard.readText()` returns a Promise.)
- `isDesktop()`, `getDesktopBridge()` and `parseAuthCallback()` live in `src/lib/desktopBridge.ts`
  now (Phase 3 extends it). `src/types/desktop.d.ts` mirrors `electron/ipc.ts`.
- `useDesktopAuthCallback()` is called at the top of `App` (outside `AuthProvider`, since it only
  needs the Supabase client). Errors use the same `alert("Failed to login. Please try again.")`
  as the web login.
- `src/__tests__/setup.ts` now guards its `window` mocks, so `// @vitest-environment node` tests
  in `electron/__tests__/` can load (before this they crashed on `window`).
- Checks: 20 failing tests / 175 `tsc` errors, the same as the baseline (24 new tests pass);
  `tsc -p electron` clean; `npm run build` OK.

---

## Phase 3: Timer sync (renderer → tray) ✅ DONE (commit `2f48691`)

**Tasks**
1. Read `CreateDoro.tsx` first. Find where `TimerState` (`endTime`, `pausedTimeLeft`, `isPaused`,
   `task`) lives, and the existing pause, resume and stop handlers. Don't restructure the timer.
2. Write `src/lib/desktopBridge.ts` and `src/hooks/useDesktopTimerSync.ts` (TDD):
   - On every timer state change, call `window.doros?.updateTimer(mapped)`.
   - Subscribe to `onTrayCommand` and call the existing handlers. Unsubscribe on unmount.
   - In a browser (`window.doros` undefined) it does nothing.
3. Also send break state if the web app has a break timer. If it doesn't, desktop phases are
   `idle` and `focus` only. Don't invent a break feature in this plan.
4. In `electron/countdown.ts` (pure, TDD), write `remainingMs(state, now)` and `formatMMSS(ms)`.
   Tests: a running session, a paused session, a session past its end (clamp to 0), and a large
   time jump (Mac asleep). It computes from `endTime`, never from counting ticks.
5. The main process stores the last state and re-renders the tray every second while running.
   On `powerMonitor` `resume`, it renders right away.

**Done when:** starting a doro in the window shows the countdown in the tray. Pause, resume and stop
from the tray change the timer in the window. The browser web app behaves exactly as before.

**Status / deviations from the plan (Phase 3):**
- **The timer doesn't live in `CreateDoro`.** State and the 1 s tick are in `Home` (the `DoroContext`
  provider, mounted on every logged-in page), saved in `localStorage["timerState"]`. Only the
  pause/resume/stop handlers were in `CreateDoro`, which is mounted on `/create-doro` alone. So:
  the three handlers moved **unchanged** into `hooks/useTimerControls.ts` (CreateDoro uses it), and
  `components/DesktopTimerSync.tsx` (renders nothing) is mounted inside `DoroProvider` in `Home`
  as `{isDesktop() && <DesktopTimerSync />}`. Tray commands work on any page, window hidden or not,
  and the web app renders nothing new.
- `toDesktopTimerState()` / `readSavedTimerTimes()` (in `lib/desktopBridge.ts`) map context +
  saved timer to the bridge state. No break timer in the web app, so phases are `idle`/`focus`.
  A finished doro waiting to be logged is `idle`. The hook only sends when the state changes
  (not every tick) and sends `idle` on unmount.
- **Tray menu items pulled forward from Phase 5 (user request):** `Start a Doro…` (idle) /
  `Pause` / `Resume`, `Cancel Doro` (disabled when idle), and a disabled `🍅 Focus: <task>` /
  `⏸ Paused: <task>` status line. Built by pure `electron/trayMenu.ts`. The menu is rebuilt only
  when phase/paused/task change.
- New `TrayCommand` `"start"`: main shows the window and the renderer navigates to
  `/create-doro` (a doro needs a task name, so it can't start from the tray). Pause/resume/cancel
  don't show the window.
- Countdown is `tray.setTitle("24:13", { fontType: "monospacedDigit" })` next to the static
  tomato (`⏸ 24:13` while paused) until Phase 4 draws it inside the tomato. Ticks every 1 s only
  while running; redraws on `powerMonitor` `resume`.
- Main validates `updateTimer` payloads (`parseTimerState`, task capped at 200 chars) and resets
  the tray to idle on a main-frame navigation (the new page re-sends its state).
- ✅ Verified (packaged app → local Vite, over CDP): a running doro shows `24:55` in the menu bar
  (screenshot); with the window hidden on the feed page, `pause` → banner "Pomodoro Paused" and
  saved `pausedTimeLeft`; `resume` → new `endTime`; `cancel` → timer cleared, tray idle, window
  stays hidden; `start` → `/create-doro`. Commands were sent over the same IPC channel the menu
  uses; the native menu clicks themselves were left for the user (menu template is unit-tested).
- ✅ Verified by the user (2026-11-21): Start a Doro…, Pause/Resume and Cancel from the real tray
  menu work (with the 5 s dev timer, see Testing notes).
- Checks: 20 failing tests / 175 `tsc` errors (identical set) as the baseline, +40 new passing
  tests; `tsc -p electron` clean; `npm run build` OK.

---

## Phase 4: Tomato with the countdown inside it ✅ DONE (commit `b7da574`)

**Tasks**
1. Write `tomatoIcon.ts → buildSvg(text, variant)`. Draw a wide red tomato (`#E53935` body,
   green `#43A047` leaf) about **44×22 pt**, with bold white centered text (about 11 pt, thin dark stroke).
   Variants: `focus` (red), `paused` (dimmed, `⏸`), `idle` (plain tomato, no text).
2. Write `render(text, variant) → nativeImage`. Rasterize at 2× (88×44 px) with resvg
   (`font: { loadSystemFonts: true }`), then `nativeImage.createFromBuffer(png, { scaleFactor: 2 })`.
   Do **not** use template images. Cache the results by `text + variant`.
3. Fallback setting: a small tomato plus `tray.setTitle("24:13")` if text inside the tomato is
   unreadable on non-Retina screens.
4. Tests: the SVG contains the text and the correct fills for each variant. Add snapshot tests.

**Done when:** 🧑 the user confirms the tomato countdown looks crisp in light and dark menu bars.

**Status / deviations from the plan (Phase 4):**
- **resvg loads only Helvetica Neue, not every system font.** `loadSystemFonts: true` took ~1.8 s
  per render (it scans every font on the Mac), far too slow for a 1 s tick on the main thread.
  `fontFiles: ["/System/Library/Fonts/HelveticaNeue.ttc"]` renders in ~3 ms. Helvetica Neue Bold
  ships with macOS and has tabular digits, so the text doesn't jiggle. (The SF system font didn't
  match by family name, and SF Rounded is a variable font that resvg draws only at regular weight.)
- **Round tomato with minutes, not a wide one with `MM:SS` (user's call after seeing it).** The
  44×22 pt tomato read as an oval in the menu bar. It's now a round **22×22 pt** tomato showing
  `trayLabel(ms)` (pure, in `countdown.ts`): whole minutes left rounded up (`25` at the start, `1`
  at 01:00), then seconds in the last minute (`59` … `0`), from the same floored seconds as
  `formatMMSS` so it never disagrees with the window. No colon and no pause bars: paused is the
  same tomato at 55% opacity (number stays opaque). The tooltip shows the exact time
  (`Doros: 24:13 left`, `… (paused)`). Three digits (100+ min) shrink to fit.
- `tomatoIcon.ts` stays pure Node (no `electron` import, so it's tested under Vitest):
  `buildSvg(text, variant)`, `renderPng(text, variant, scale)` and a small LRU `createImageCache`.
  `tray.ts` turns the PNGs into a `nativeImage` with **both 2× (44×44 px) and 1× (22×22 px)
  representations**, so non-Retina screens get a real 1× render instead of a downscale. Images are
  cached by `variant:text` (200 entries: every label of a doro) and `tray.setImage`/`setTitle` only run when they change.
- Variants: `focus` red tomato, bold white 12 pt number with a thin `#7A1512` stroke; `paused`
  dimmed; `idle` the original 18×18 pt tomato (same art as Phase 1), so idle looks as before.
- **Fallback setting** is a tray checkbox **Countdown Inside Tomato** (on by default, just above
  Quit). Off: the small tomato plus `tray.setTitle("24:13")` / `⏸ 24:13`, exactly the Phase 3 look.
  Saved to `userData/doros-settings.json` (pure `electron/settings.ts` validates it). If resvg
  ever fails to load, the tray logs once and uses that fallback with the static PNG.
- Packaging: `@resvg/resvg-js` moved to `dependencies`; `electron-builder.yml` lists
  `node_modules/@resvg/resvg-js/**` and `…-darwin-arm64/**` in `files` and
  `asarUnpack: "**/*.node"`. The `.app` contains only those two packages from `node_modules`
  (267 MB), with the `.node` file in `app.asar.unpacked`.
- ✅ Verified by the agent, first (wide `MM:SS`) version (packaged app → local Vite, with a separate
  `--user-data-dir` profile and states sent through `window.doros.updateTimer` over CDP): main
  loaded resvg from the packaged app, the tray image had scale factors 2 and 1; menu bar
  screenshots showed the countdown ticking inside the tomato, the paused and idle tomatoes, and the
  fallback text. The round version was checked in rendered light/dark previews and its packaged
  `tomatoIcon.js` confirmed.
- ✅ Verified by the user (2026-11-22): the round tomato with the minutes left looks good in the
  real menu bar.
- **MacBook notch:** new menu bar items go leftmost, next to the notch, and macOS hides whatever
  doesn't fit. The user's crowded bar hid the tomato (the window list showed the Doros status item
  off-screen at x 966). Fix: make room once, then ⌘-drag the tomato to the right; macOS saves the
  spot (`NSStatusItem Preferred Position Item-0` in `com.doros.desktop` defaults).
- Tests: `tomatoIcon` (SVG text and fills per variant, 3 snapshots, PNG sizes at 1×/2×, digits
  really drawn, < 50 ms per render, LRU cache), `trayLabel`, `settings`, and the menu checkbox.
- Checks: 20 failing tests / 175 `tsc` errors, the same as the baseline (+25 new passing tests);
  `tsc -p electron` clean; `npm run build` OK.

---

## Phase 5: Tray menu 🟡 PARTLY DONE (items marked ✅ were built in Phase 3, user-verified)

```
✅ 🍅 Focus: write chapter 3   (disabled label; ⏸ Paused: … while paused)
   ✅ dropped ", 24:13 left": the tray tooltip shows the exact time left (Phase 4)
✅ Start a Doro…                 (idle only → shows window on /create-doro)
✅ Pause / Resume                (→ renderer)
✅ Cancel Doro                   (→ renderer; disabled when idle; the plan called it "Stop")
───────────────
✅ Show Doros                    (shows and focuses the window)
✅ Paste Auth Callback URL (dev) (unpackaged only, from Phase 2)
───────────────
⏳ Block sites now        ☐/☑    (manual override)          ← Phase 6
⏳ Sites blocked: yes/no         (disabled status)          ← Phase 6
⏳ Set up site blocking…         (only shown if the helper is missing) ← Phase 6
───────────────
⏳ Launch at login        ☐      (app.setLoginItemSettings)
✅ Countdown Inside Tomato ☑    (Phase 4 fallback setting: off = small tomato + text)
✅ Quit Doros
```

The menu template comes from pure `electron/trayMenu.ts` (unit-tested). Add new items there.

Starting a new doro needs a task name, so the start action opens the form (**Start a Doro…**). The React UI stays
the only place you create a doro. Optionally add a global shortcut `⌥⌘D` for Show Doros.

**Done when:** every menu item works by hand.

---

## Phase 6: Website blocking

### 6a. Pure hosts-file transform (TDD)
`electron/hostsFile.ts`:
- `addBlock(text, domains)`: removes any existing Doros section, then appends
  `# BEGIN DOROS BLOCK` … `0.0.0.0 d` and `:: d` for each domain … `# END DOROS BLOCK`.
- `removeBlock(text)`: removes only that section and leaves every other line byte-for-byte unchanged.
- Tests: idempotent, preserves existing entries, handles trailing newlines.

### 6b. Privileged helper
`electron/helper/doros-block.sh` is generated from `blocklist.ts`. It's installed to
`/usr/local/bin/doros-block`, owned by `root:wheel`, mode `755`.
- `on` / `off` / `status`. The domains are **hard-coded in the script**, so the app can't pass arbitrary hosts to root.
- Writes atomically (temp file, then `mv`), then runs `dscacheutil -flushcache; killall -HUP mDNSResponder`.

`install-helper.sh` 🧑 (the **user** runs it once with `sudo`; the agent never does):
copies the helper, sets ownership and permissions, writes
`/etc/sudoers.d/doros` → `<username> ALL=(root) NOPASSWD: /usr/local/bin/doros-block`, and checks it with `visudo -cf` first.

### 6c. Blocker in the main process
- `execFile("sudo", ["-n", "/usr/local/bin/doros-block", "on"])`. Never prompt for or store a password.
- Block while `phase === "focus" && !isPaused`, or while the manual toggle is on. Otherwise unblock.
  Only call the helper when the desired state actually changes.
- On launch, call `off` unless a focus session is running (this cleans up after a crash).
  On `before-quit`, call `off`.

### 6d. Known limitations (put these in the README)
- Tabs already open on a blocked site may keep working until reload. Chrome caches DNS for about a minute.
- A VPN or custom DNS-over-HTTPS profile can bypass `/etc/hosts`.
- Blocking only happens while the desktop app is running. The web app alone can't block sites.

**Done when:** you start a doro, and `https://www.reddit.com` in a fresh tab fails to load.
Stop or finish the doro and it loads again. `cat /etc/hosts` shows the section only during focus.

---

## Phase 7: Notifications and packaging

1. When the countdown hits 0 and the window is hidden, show a `Notification` ("Doro done 🍅,
   log it?"). Clicking it shows the window, where the existing completion flow (log, upload image) runs.
   🧑 The user allows notifications.
2. `electron-builder.yml`: ✅ `mac.identity: null` (unsigned), ✅ Dock icon stays visible (no
   `LSUIElement`), ⏳ tomato `.icns` (the app still uses the default Electron icon), ✅ the `doros`
   protocol (Phase 2), ✅ resvg packaged with its `.node` unpacked (Phase 4).
3. ✅ `npm run desktop:build` produces `release/mac-arm64/Doros.app`. ⏳ 🧑 The user drags it to
   `/Applications` and right-clicks → Open the first time.

**Done when:** in the installed app you can log in, do a full doro with sites blocked, see it logged
to Supabase, and find it in the feed on the **website** too.

---

## Stretch ideas
- Start a doro from the tray with the last-used task name.
- Edit the block list from the menu (regenerates the helper, 🧑 needs sudo).
- Close or reload open tabs on blocked sites when focus starts (AppleScript for Safari and Chrome).
- Load the bundled `dist/` through a custom `app://` protocol instead of the live URL, if offline startup ever matters.

---

## Agent checklist per phase
- [ ] Tests first for pure modules and new hooks (✅ done: `countdown`, `deepLink`, `trayMenu`,
      `useDesktopTimerSync`, `useTimerControls`, `useDesktopAuthCallback`, the `Login` desktop branch,
      `tomatoIcon`, `settings`; ⏳ still to do: `hostsFile`)
- [ ] `npm test`, `npx tsc --noEmit`, `npx tsc -p electron --noEmit`, and `npm run build` (web) all pass
      (no **new** failures: the baseline from `dev` is 20 failing tests in 7 files and 175 `tsc` errors)
- [ ] Web behavior unchanged when `window.doros` is undefined
- [ ] Run `npm run desktop:dev` (or the packaged app for Phases 2 and 7) and describe what you saw
- [ ] Work on a branch (`desktop-app`), one commit per phase
- [ ] Stop at 🧑 steps and give the user the exact command or dashboard step

## Agent guardrails
- Never edit `/etc/hosts` or `/etc/sudoers.d` directly. Only the user does, through `install-helper.sh`.
- Never `sudo` without `-n`, and never store or ask for a password.
- Never change Supabase schema, RLS, or auth settings. Dashboard changes are 🧑 steps.
- Don't change the shared Supabase client's auth flow (stay on implicit). The web login must keep working.
- Renderer code in `src/` follows `AGENTS.md` (React Query, Tailwind, `cq-` classnames). No Supabase calls from `electron/`.
